<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Models\CashRegister;
use App\Models\CashMovement;
use App\Models\Payment;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CashRegisterController extends Controller
{
    /**
     * Get scoped restaurant_id from middleware or user default.
     */
    private function getRestaurantId(Request $request): int
    {
        return (int) ($request->get('restaurant_id') ?? Auth::user()->restaurant_id);
    }

    public function status(Request $request)
    {
        $restaurantId = $this->getRestaurantId($request);
        $openShift = CashRegister::where('restaurant_id', $restaurantId)
            ->where('status', 'open')
            ->with('user:id,name')
            ->first();

        return response()->json([
            'isOpen' => !!$openShift,
            'shift' => $openShift
        ]);
    }

    public function open(Request $request)
    {
        $request->validate([
            'opening_balance' => 'required|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        $user = Auth::user();
        $restaurantId = $this->getRestaurantId($request);

        // Check if there's already an open shift
        $exists = CashRegister::where('restaurant_id', $restaurantId)
            ->where('status', 'open')
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Ya existe un turno abierto'], 422);
        }

        $shift = CashRegister::create([
            'restaurant_id' => $restaurantId,
            'user_id' => $user->id,
            'opening_balance' => $request->opening_balance,
            'status' => 'open',
            'opened_at' => now(),
            'notes' => $request->notes
        ]);

        AuditLogger::log(
            'cash.open',
            "Turno de caja abierto con \$" . number_format($shift->opening_balance, 2),
            ['shift_id' => $shift->id],
            $shift
        );

        return response()->json([
            'message' => 'Turno abierto exitosamente',
            'shift' => $shift
        ]);
    }

    public function close(Request $request)
    {
        $request->validate([
            'closing_balance' => 'required|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        $restaurantId = $this->getRestaurantId($request);
        $shift = CashRegister::where('restaurant_id', $restaurantId)
            ->where('status', 'open')
            ->first();

        if (!$shift) {
            return response()->json(['message' => 'No hay un turno abierto'], 422);
        }

        // Calculate expected balance
        $cashPayments = Payment::where('cash_register_id', $shift->id)
            ->where('payment_method', 'cash')
            ->where('status', 'completed')
            ->sum('amount');

        $inMovements = CashMovement::where('cash_register_id', $shift->id)
            ->where('type', 'in')
            ->sum('amount');

        $outMovements = CashMovement::where('cash_register_id', $shift->id)
            ->where('type', 'out')
            ->sum('amount');

        $expectedBalance = $shift->opening_balance + $cashPayments + $inMovements - $outMovements;
        $difference = $request->closing_balance - $expectedBalance;

        $shift->update([
            'closing_balance' => $request->closing_balance,
            'expected_balance' => $expectedBalance,
            'difference' => $difference,
            'status' => 'closed',
            'closed_at' => now(),
            'notes' => $shift->notes . "\nCierre: " . $request->notes
        ]);

        AuditLogger::log(
            'cash.close',
            "Turno de caja cerrado. Saldo real: \$" . number_format($shift->closing_balance, 2) . ", Diferencia: \$" . number_format($shift->difference, 2),
            ['shift_id' => $shift->id, 'expected' => $shift->expected_balance, 'difference' => $shift->difference],
            $shift
        );

        return response()->json([
            'message' => 'Turno cerrado exitosamente',
            'shift' => $shift
        ]);
    }

    public function storeMovement(Request $request)
    {
        $request->validate([
            'type' => 'required|in:in,out',
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:255',
            'notes' => 'nullable|string'
        ]);

        $user = Auth::user();
        $restaurantId = $this->getRestaurantId($request);
        $shift = CashRegister::where('restaurant_id', $restaurantId)
            ->where('status', 'open')
            ->first();

        if (!$shift) {
            return response()->json(['message' => 'No hay un turno abierto para registrar movimientos'], 422);
        }

        $movement = CashMovement::create([
            'cash_register_id' => $shift->id,
            'user_id' => $user->id,
            'type' => $request->type,
            'amount' => $request->amount,
            'reason' => $request->reason,
            'notes' => $request->notes
        ]);

        AuditLogger::log(
            "cash.movement.{$movement->type}",
            "Movimiento de caja ({$movement->type}): {$movement->reason} por \$" . number_format($movement->amount, 2),
            ['movement_id' => $movement->id, 'type' => $movement->type],
            $movement
        );

        return response()->json([
            'message' => 'Movimiento registrado',
            'movement' => $movement
        ]);
    }

    public function movements(Request $request)
    {
        $restaurantId = $this->getRestaurantId($request);
        $shift = CashRegister::where('restaurant_id', $restaurantId)
            ->where('status', 'open')
            ->first();

        if (!$shift) {
            return response()->json(['movements' => []]);
        }

        $movements = CashMovement::where('cash_register_id', $shift->id)
            ->with('user:id,name')
            ->latest()
            ->get();

        return response()->json(['movements' => $movements]);
    }
}
