<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    // ── Items ──────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $restaurantId = $request->header('X-Restaurant-Id', $request->user()->restaurant_id);

        $items = InventoryItem::forRestaurant($restaurantId)
            ->active()
            ->when($request->search, fn($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->category, fn($q) => $q->where('category', $request->category))
            ->when($request->item_type, fn($q) => $q->where('item_type', $request->item_type))
            ->when($request->low_stock, fn($q) => $q->lowStock())
            ->with('product:id,name,image')
            ->orderBy('name')
            ->get()
            ->map(fn($item) => $this->formatItem($item));

        // Summary stats
        $lowStockCount = InventoryItem::forRestaurant($restaurantId)->active()->lowStock()->count();

        return response()->json([
            'data' => $items,
            'meta' => [
                'total'         => $items->count(),
                'low_stock'     => $lowStockCount,
            ]
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'          => 'required|string|max:150',
            'category'      => 'nullable|string|max:100',
            'unit'          => 'required|string|max:30',
            'item_type'     => 'required|in:ingredient,menu_product',
            'product_id'    => 'nullable|exists:products,id',
            'current_stock' => 'required|numeric|min:0',
            'min_stock'     => 'required|numeric|min:0',
            'cost_per_unit' => 'required|numeric|min:0',
            'notes'         => 'nullable|string',
        ]);

        $restaurantId = $request->get('restaurant_id')
            ?? (int) $request->header('X-Restaurant-Id', $request->user()->restaurant_id);

        $item = InventoryItem::create([
            'restaurant_id' => $restaurantId,
            'name'          => $request->name,
            'category'      => $request->category,
            'unit'          => $request->unit,
            'item_type'     => $request->item_type,
            'product_id'    => $request->item_type === 'menu_product' ? $request->product_id : null,
            'current_stock' => $request->current_stock,
            'min_stock'     => $request->min_stock,
            'cost_per_unit' => $request->cost_per_unit,
            'notes'         => $request->notes,
            'is_active'     => true,
        ]);

        // Record initial stock as an entrada movement if > 0
        if ($request->current_stock > 0) {
            InventoryMovement::create([
                'restaurant_id'      => $restaurantId,
                'inventory_item_id'  => $item->id,
                'user_id'            => $request->user()->id,
                'type'               => 'entrada',
                'quantity'           => $request->current_stock,
                'stock_before'       => 0,
                'stock_after'        => $request->current_stock,
                'notes'              => 'Stock inicial',
            ]);
        }

        return response()->json(['message' => 'Insumo creado', 'data' => $this->formatItem($item->fresh('product'))], 201);
    }

    public function update(Request $request, InventoryItem $inventoryItem): JsonResponse
    {
        $this->authorizeTenant($request, $inventoryItem->restaurant_id);

        $request->validate([
            'name'          => 'sometimes|string|max:150',
            'category'      => 'nullable|string|max:100',
            'unit'          => 'sometimes|string|max:30',
            'product_id'    => 'nullable|exists:products,id',
            'min_stock'     => 'sometimes|numeric|min:0',
            'cost_per_unit' => 'sometimes|numeric|min:0',
            'notes'         => 'nullable|string',
        ]);

        $inventoryItem->update($request->only(['name', 'category', 'unit', 'product_id', 'min_stock', 'cost_per_unit', 'notes']));

        return response()->json(['message' => 'Insumo actualizado', 'data' => $this->formatItem($inventoryItem->fresh('product'))]);
    }

    public function destroy(Request $request, InventoryItem $inventoryItem): JsonResponse
    {
        $this->authorizeTenant($request, $inventoryItem->restaurant_id);
        $inventoryItem->delete();
        return response()->json(['message' => 'Insumo eliminado']);
    }

    // ── Movements ──────────────────────────────────────

    public function movements(Request $request, InventoryItem $inventoryItem): JsonResponse
    {
        $this->authorizeTenant($request, $inventoryItem->restaurant_id);

        $movements = $inventoryItem->movements()
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn($m) => [
                'id'          => $m->id,
                'type'        => $m->type,
                'quantity'    => (float) $m->quantity,
                'stock_before'=> (float) $m->stock_before,
                'stock_after' => (float) $m->stock_after,
                'notes'       => $m->notes,
                'user'        => $m->user?->name ?? '—',
                'date'        => $m->created_at->format('d/m/Y H:i'),
            ]);

        return response()->json(['data' => $movements]);
    }

    public function addMovement(Request $request, InventoryItem $inventoryItem): JsonResponse
    {
        $this->authorizeTenant($request, $inventoryItem->restaurant_id);

        $request->validate([
            'type'     => 'required|in:entrada,salida,ajuste',
            'quantity' => 'required|numeric|min:0.001',
            'notes'    => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($request, $inventoryItem) {
            $stockBefore = (float) $inventoryItem->current_stock;
            $qty = (float) $request->quantity;

            $stockAfter = match ($request->type) {
                'entrada' => $stockBefore + $qty,
                'salida'  => max(0, $stockBefore - $qty),   // Floor at 0
                'ajuste'  => $qty,                           // Direct absolute value
            };

            InventoryMovement::create([
                'restaurant_id'     => $inventoryItem->restaurant_id,
                'inventory_item_id' => $inventoryItem->id,
                'user_id'           => $request->user()->id,
                'type'              => $request->type,
                'quantity'          => $qty,
                'stock_before'      => $stockBefore,
                'stock_after'       => $stockAfter,
                'notes'             => $request->notes,
            ]);

            $inventoryItem->update(['current_stock' => $stockAfter]);
        });

        return response()->json([
            'message'       => 'Movimiento registrado',
            'current_stock' => (float) $inventoryItem->fresh()->current_stock,
        ]);
    }

    // ── Helpers ────────────────────────────────────────

    private function formatItem(InventoryItem $item): array
    {
        return [
            'id'            => $item->id,
            'name'          => $item->name,
            'category'      => $item->category,
            'unit'          => $item->unit,
            'item_type'     => $item->item_type,
            'product'       => $item->product ? [
                'id'    => $item->product->id,
                'name'  => $item->product->name,
                'image' => $item->product->image,
            ] : null,
            'current_stock' => (float) $item->current_stock,
            'min_stock'     => (float) $item->min_stock,
            'cost_per_unit' => (float) $item->cost_per_unit,
            'notes'         => $item->notes,
            'is_low_stock'  => $item->isLowStock(),
            'total_value'   => round((float) $item->current_stock * (float) $item->cost_per_unit, 2),
            'is_active'     => $item->is_active,
        ];
    }

    private function authorizeTenant(Request $request, int $restaurantId): void
    {
        $user = $request->user();
        if ($user->hasRole('superadmin')) return;
        $activeId = (int) $request->header('X-Restaurant-Id', $user->restaurant_id);
        if ($activeId !== $restaurantId) {
            abort(403, 'Sin permisos');
        }
    }
}
