<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Order;
use App\Models\CashRegister;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    /**
     * Process a payment for an order.
     */
    public function store(Request $request)
    {
        $request->validate([
            'order_id'          => 'required|exists:orders,id',
            'amount'            => 'required|numeric|min:0.01',
            'tip'               => 'nullable|numeric|min:0',
            'payment_method'    => 'required|in:cash,card,transfer,other',
            'reference'         => 'nullable|string',
            'notes'             => 'nullable|string',
            'amount_received'   => 'nullable|numeric|min:0',
            'skip_ticket'       => 'sometimes|boolean',
            'skip_cash_register'=> 'sometimes|boolean',
        ]);

        $user = Auth::user();
        $restaurantId = $request->get('restaurant_id', $user->restaurant_id);
        $order = Order::findOrFail($request->order_id);

        if ($order->restaurant_id !== $restaurantId) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Prevent duplicate payments
        if ($order->payment_status === 'paid') {
            return response()->json(['message' => 'Esta orden ya fue pagada'], 422);
        }

        $skipTicket = $request->boolean('skip_ticket', false);
        $skipCashRegister = $request->boolean('skip_cash_register', false);

        // Get active cash register shift
        $shift = CashRegister::where('restaurant_id', $restaurantId)
            ->where('status', 'open')
            ->first();

        // If cash and no shift and not skipping, error
        if ($request->payment_method === 'cash' && !$shift && !$skipCashRegister) {
            return response()->json(['message' => 'Debe abrir caja antes de procesar pagos en efectivo, o marque "Cobrar sin caja"'], 422);
        }

        // Calculate change
        $amountReceived = $request->amount_received;
        $changeAmount = null;
        if ($request->payment_method === 'cash' && $amountReceived) {
            $totalWithTip = $request->amount + ($request->tip ?? 0);
            if ($amountReceived < $totalWithTip) {
                return response()->json(['message' => 'El monto recibido es menor al total'], 422);
            }
            $changeAmount = round($amountReceived - $totalWithTip, 2);
        }

        $registerInCash = !$skipCashRegister && !!$shift;

        return DB::transaction(function () use ($request, $user, $order, $shift, $skipTicket, $registerInCash, $amountReceived, $changeAmount, $restaurantId) {
            // Generate folio
            $folio = $skipTicket ? null : Payment::generateTicketFolio($restaurantId);

            $payment = Payment::create([
                'restaurant_id'     => $restaurantId,
                'order_id'          => $order->id,
                'user_id'           => $user->id,
                'cash_register_id'  => $registerInCash ? $shift->id : null,
                'amount'            => $request->amount,
                'tip'               => $request->tip ?? 0,
                'payment_method'    => $request->payment_method,
                'reference'         => $request->reference,
                'notes'             => $request->notes,
                'status'            => 'completed',
                'ticket_generated'  => !$skipTicket,
                'registered_in_cash'=> $registerInCash,
                'ticket_folio'      => $folio,
                'amount_received'   => $amountReceived,
                'change_amount'     => $changeAmount,
            ]);

            // Build and save ticket data snapshot
            if (!$skipTicket) {
                $ticketData = $payment->buildTicketData();
                $payment->update(['ticket_data' => $ticketData]);
            }

            // Update order status
            $order->update([
                'status'         => 'paid',
                'payment_status' => 'paid',
            ]);

            AuditLogger::log(
                'payment.processed',
                "Pago de \${$payment->amount} procesado por orden #{$order->order_number}" .
                    ($skipTicket ? ' (sin ticket)' : " (folio: {$folio})") .
                    (!$registerInCash ? ' (sin caja)' : ''),
                [
                    'payment_id' => $payment->id,
                    'method'     => $payment->payment_method,
                    'folio'      => $folio,
                    'sin_ticket' => $skipTicket,
                    'sin_caja'   => !$registerInCash,
                ],
                $payment
            );

            return response()->json([
                'message'     => 'Pago procesado exitosamente',
                'payment'     => $payment,
                'ticket_data' => $payment->ticket_data,
            ]);
        });
    }

    /**
     * List payments (with filters).
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $restaurantId = $request->get('restaurant_id', $user->restaurant_id);

        $query = Payment::where('restaurant_id', $restaurantId)
            ->with(['order:id,order_number,total', 'user:id,name'])
            ->latest();

        // Date filter
        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Method filter
        if ($request->method) {
            $query->where('payment_method', $request->method);
        }

        // Search by folio
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('ticket_folio', 'like', "%{$request->search}%")
                  ->orWhereHas('order', fn($oq) => $oq->where('order_number', 'like', "%{$request->search}%"));
            });
        }

        $payments = $query->paginate(20);

        return response()->json($payments);
    }

    /**
     * Get ticket data for a specific payment (for reprint).
     */
    public function ticket(Request $request, Payment $payment)
    {
        $user = Auth::user();
        $restaurantId = $request->get('restaurant_id', $user->restaurant_id);

        if ($payment->restaurant_id !== $restaurantId) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // If ticket_data is stored, return it; otherwise rebuild
        $ticketData = $payment->ticket_data ?? $payment->buildTicketData();

        return response()->json([
            'ticket_data' => $ticketData,
        ]);
    }
}
