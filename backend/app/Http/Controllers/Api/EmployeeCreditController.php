<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\EmployeeCredit;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeCreditController extends Controller
{
    // ── List credits (admin sees all, employee sees own) ─────
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $restaurantId = (int) $request->header('X-Restaurant-Id', $user->restaurant_id);

        $q = EmployeeCredit::forRestaurant($restaurantId)
            ->with(['user:id,name', 'registeredBy:id,name', 'approvedBy:id,name', 'product:id,name'])
            ->orderByDesc('created_at');

        // Non-admins only see their own
        if (! $user->hasAnyRole(['superadmin', 'admin', 'caja'])) {
            $q->where('user_id', $user->id);
        }

        // Filters
        if ($request->status)  $q->where('status', $request->status);
        if ($request->user_id) $q->where('user_id', $request->user_id);
        if ($request->date_from) $q->whereDate('created_at', '>=', $request->date_from);
        if ($request->date_to)   $q->whereDate('created_at', '<=', $request->date_to);

        $credits = $q->get()->map(fn($c) => $this->formatCredit($c));

        // Summary per employee (for admin view)
        $summary = null;
        if ($user->hasAnyRole(['superadmin', 'admin', 'caja'])) {
            $summary = EmployeeCredit::forRestaurant($restaurantId)
                ->pending()
                ->select('user_id', DB::raw('SUM(total) as total_pending'), DB::raw('COUNT(*) as items'))
                ->with('user:id,name')
                ->groupBy('user_id')
                ->get()
                ->map(fn($r) => [
                    'user_id'       => $r->user_id,
                    'user_name'     => $r->user->name ?? 'Desconocido',
                    'total_pending' => (float) $r->total_pending,
                    'items'         => (int) $r->items,
                ]);
        }

        return response()->json([
            'data'    => $credits,
            'summary' => $summary,
        ]);
    }

    // ── Register new credit ───────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $restaurantId = (int) $request->header('X-Restaurant-Id', $user->restaurant_id);

        $request->validate([
            'product_id' => 'required|exists:products,id',
            'user_id'    => 'required|exists:users,id', // employee being charged
            'quantity'   => 'required|numeric|min:0.001',
            'notes'      => 'nullable|string|max:255',
        ]);

        // Non-admins can only register credits for themselves
        if (! $user->hasAnyRole(['superadmin', 'admin', 'caja'])) {
            if ((int) $request->user_id !== $user->id) {
                return response()->json(['message' => 'Solo puedes registrar créditos a tu propio nombre.'], 403);
            }
        }

        $product = Product::findOrFail($request->product_id);
        $qty     = (float) $request->quantity;
        $total   = round($product->price * $qty, 2);

        $credit = EmployeeCredit::create([
            'restaurant_id'  => $restaurantId,
            'user_id'        => $request->user_id,
            'product_id'     => $product->id,
            'product_name'   => $product->name,
            'product_price'  => $product->price,
            'quantity'       => $qty,
            'total'          => $total,
            'notes'          => $request->notes,
            'status'         => 'pending',
            'registered_by'  => $user->id,
        ]);

        return response()->json([
            'message' => 'Crédito registrado',
            'data'    => $this->formatCredit($credit->load(['user:id,name', 'registeredBy:id,name'])),
        ], 201);
    }

    // ── Mark as paid → generate CashMovement ─────────────────
    public function markAsPaid(Request $request, EmployeeCredit $employeeCredit): JsonResponse
    {
        $user = $request->user();
        $this->authorizeAdmin($request, $employeeCredit->restaurant_id);

        if ($employeeCredit->status !== 'pending') {
            return response()->json(['message' => 'Este crédito ya fue procesado.'], 422);
        }

        // Find the active cash register for this restaurant
        $cashRegister = CashRegister::where('restaurant_id', $employeeCredit->restaurant_id)
            ->where('status', 'open')
            ->latest('opened_at')
            ->first();

        DB::transaction(function () use ($request, $employeeCredit, $user, $cashRegister) {
            $movement = null;

            if ($cashRegister) {
                $employeeName = $employeeCredit->user ? $employeeCredit->user->name : '';
                $movement = CashMovement::create([
                    'cash_register_id' => $cashRegister->id,
                    'user_id'          => $user->id,
                    'type'             => 'in',
                    'amount'           => $employeeCredit->total,
                    'reason'           => "Pago crédito empleado: {$employeeName} – {$employeeCredit->product_name}",
                    'notes'            => $request->notes,
                ]);
            }

            $employeeCredit->update([
                'status'           => 'paid',
                'paid_at'          => now(),
                'approved_by'      => $user->id,
                'cash_register_id' => $cashRegister?->id,
                'cash_movement_id' => $movement?->id,
            ]);
        });

        $msg = $cashRegister
            ? 'Crédito marcado como pagado y registrado en caja.'
            : 'Crédito marcado como pagado. No hay caja abierta, el movimiento no se registró en caja.';

        return response()->json([
            'message' => $msg,
            'data'    => $this->formatCredit($employeeCredit->fresh(['user:id,name', 'approvedBy:id,name'])),
        ]);
    }

    // ── Cancel credit ────────────────────────────────────────
    public function cancel(Request $request, EmployeeCredit $employeeCredit): JsonResponse
    {
        $this->authorizeAdmin($request, $employeeCredit->restaurant_id);

        if ($employeeCredit->status !== 'pending') {
            return response()->json(['message' => 'Solo se pueden cancelar créditos pendientes.'], 422);
        }

        $employeeCredit->update([
            'status'       => 'cancelled',
            'cancelled_at' => now(),
            'approved_by'  => $request->user()->id,
        ]);

        return response()->json(['message' => 'Crédito cancelado']);
    }

    // ── Helpers ───────────────────────────────────────────────
    private function formatCredit(EmployeeCredit $c): array
    {
        return [
            'id'            => $c->id,
            'employee'      => ['id' => $c->user_id, 'name' => $c->user?->name ?? '—'],
            'product_name'  => $c->product_name,
            'product_price' => (float) $c->product_price,
            'quantity'      => (float) $c->quantity,
            'total'         => (float) $c->total,
            'notes'         => $c->notes,
            'status'        => $c->status,
            'registered_by' => $c->registeredBy?->name ?? '—',
            'approved_by'   => $c->approvedBy?->name,
            'paid_at'       => $c->paid_at?->format('d/m/Y H:i'),
            'cancelled_at'  => $c->cancelled_at?->format('d/m/Y H:i'),
            'created_at'    => $c->created_at->format('d/m/Y H:i'),
            'has_cash_movement' => (bool) $c->cash_movement_id,
        ];
    }

    private function authorizeAdmin(Request $request, int $restaurantId): void
    {
        $user = $request->user();
        if ($user->hasRole('superadmin')) return;
        if (! $user->hasAnyRole(['admin', 'caja'])) abort(403, 'Sin permisos');
        $activeId = (int) $request->header('X-Restaurant-Id', $user->restaurant_id);
        if ($activeId !== $restaurantId) abort(403, 'Sin permisos');
    }
}
