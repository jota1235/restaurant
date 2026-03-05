<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Table;
use App\Services\AuditLogger;
use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    // ── LIST (activas) ─────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $restaurantId = $request->get('restaurant_id');

        $query = Order::with(['table', 'user', 'items.product', 'items.variant', 'items.extras.extra'])
            ->forRestaurant($restaurantId)
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->table_id, fn($q) => $q->where('table_id', $request->table_id))
            ->when(!$request->include_closed, fn($q) => $q->active())
            ->orderByDesc('created_at');

        $orders = $request->paginate ? $query->paginate(30) : $query->get();

        return response()->json([
            'data' => OrderResource::collection($orders),
        ]);
    }

    // ── CREATE ─────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $restaurantId = $request->get('restaurant_id');

        $request->validate([
            'table_id'      => ['nullable', 'exists:tables,id'],
            'type'          => ['sometimes', Rule::in(['dine_in', 'takeaway', 'delivery'])],
            'customer_name' => ['nullable', 'string', 'max:100'],
            'notes'         => ['nullable', 'string'],
            'items'         => ['required', 'array', 'min:1'],
            'items.*.product_id'        => ['required', 'exists:products,id'],
            'items.*.product_variant_id' => ['nullable', 'exists:product_variants,id'],
            'items.*.quantity'           => ['required', 'integer', 'min:1'],
            'items.*.notes'              => ['nullable', 'string'],
            'items.*.extras'             => ['sometimes', 'array'],
            'items.*.extras.*.extra_id'  => ['required', 'exists:extras,id'],
            'items.*.extras.*.quantity'  => ['sometimes', 'integer', 'min:1'],
        ]);

        $order = DB::transaction(function () use ($request, $restaurantId) {
            $order = Order::create([
                'restaurant_id' => $restaurantId,
                'table_id'      => $request->table_id,
                'user_id'       => $request->user()->id,
                'order_number'  => Order::nextOrderNumber($restaurantId),
                'type'          => $request->type ?? 'dine_in',
                'customer_name' => $request->customer_name,
                'notes'         => $request->notes,
                'status'        => Order::STATUS_CONFIRMED,
                'confirmed_at'  => now(),
            ]);

            foreach ($request->items as $itemData) {
                $product = Product::findOrFail($itemData['product_id']);
                $unitPrice = (float) $product->price;

                // Add variant price modifier
                if (!empty($itemData['product_variant_id'])) {
                    $variant = $product->variants()->find($itemData['product_variant_id']);
                    if ($variant) $unitPrice += (float) $variant->price_modifier;
                }

                $qty     = $itemData['quantity'];
                $itemSub = round($unitPrice * $qty, 2);

                $item = OrderItem::create([
                    'order_id'           => $order->id,
                    'product_id'         => $itemData['product_id'],
                    'product_variant_id' => $itemData['product_variant_id'] ?? null,
                    'quantity'           => $qty,
                    'unit_price'         => $unitPrice,
                    'subtotal'           => $itemSub,
                    'notes'              => $itemData['notes'] ?? null,
                    'status'             => 'pending',
                ]);

                // Extras
                $extrasSub = 0;
                if (!empty($itemData['extras'])) {
                    foreach ($itemData['extras'] as $extraData) {
                        $extra    = \App\Models\Extra::findOrFail($extraData['extra_id']);
                        $eQty     = $extraData['quantity'] ?? 1;
                        $eSub     = round((float) $extra->price * $eQty, 2);
                        $extrasSub += $eSub;
                        $item->extras()->create([
                            'extra_id'   => $extra->id,
                            'quantity'   => $eQty,
                            'unit_price' => (float) $extra->price,
                            'subtotal'   => $eSub,
                        ]);
                    }
                    // Add extras cost to item subtotal
                    $item->update(['subtotal' => $itemSub + $extrasSub]);
                }
            }

            $order->recalculate();
            return $order;
        });

        // Mark table as occupied
        if ($order->table_id) {
            Table::where('id', $order->table_id)->update(['status' => 'occupied']);
        }

        // Broadcast event
        broadcast(new OrderCreated($order->load(['table', 'user', 'items.product', 'items.variant', 'items.extras.extra'])))->toOthers();

        return response()->json([
            'message' => 'Orden creada',
            'data'    => new OrderResource($order->load(['table', 'user', 'items.product', 'items.variant', 'items.extras.extra'])),
        ], 201);
    }

    // ── ADD ITEMS ALREADY CREATED ORDER ────────────────
    public function addItems(Request $request, Order $order): JsonResponse
    {
        $this->authorizeTenant($request, $order->restaurant_id);

        if (in_array($order->status, [Order::STATUS_PAID, Order::STATUS_CANCELLED])) {
            return response()->json(['message' => 'No se pueden agregar ítems a una orden cerrada o pagada'], 422);
        }

        $request->validate([
            'items'         => ['required', 'array', 'min:1'],
            'items.*.product_id'        => ['required', 'exists:products,id'],
            'items.*.product_variant_id' => ['nullable', 'exists:product_variants,id'],
            'items.*.quantity'           => ['required', 'integer', 'min:1'],
            'items.*.notes'              => ['nullable', 'string'],
            'items.*.extras'             => ['sometimes', 'array'],
            'items.*.extras.*.extra_id'  => ['required', 'exists:extras,id'],
            'items.*.extras.*.quantity'  => ['sometimes', 'integer', 'min:1'],
        ]);

        DB::transaction(function () use ($request, $order) {
            foreach ($request->items as $itemData) {
                $product = Product::findOrFail($itemData['product_id']);
                $unitPrice = (float) $product->price;

                if (!empty($itemData['product_variant_id'])) {
                    $variant = $product->variants()->find($itemData['product_variant_id']);
                    if ($variant) $unitPrice += (float) $variant->price_modifier;
                }

                $qty     = $itemData['quantity'];
                $itemSub = round($unitPrice * $qty, 2);

                $item = OrderItem::create([
                    'order_id'           => $order->id,
                    'product_id'         => $itemData['product_id'],
                    'product_variant_id' => $itemData['product_variant_id'] ?? null,
                    'quantity'           => $qty,
                    'unit_price'         => $unitPrice,
                    'subtotal'           => $itemSub,
                    'notes'              => $itemData['notes'] ?? null,
                    'status'             => 'pending',
                ]);

                $extrasSub = 0;
                if (!empty($itemData['extras'])) {
                    foreach ($itemData['extras'] as $extraData) {
                        $extra    = \App\Models\Extra::findOrFail($extraData['extra_id']);
                        $eQty     = $extraData['quantity'] ?? 1;
                        $eSub     = round((float) $extra->price * $eQty, 2);
                        $extrasSub += $eSub;
                        $item->extras()->create([
                            'extra_id'   => $extra->id,
                            'quantity'   => $eQty,
                            'unit_price' => (float) $extra->price,
                            'subtotal'   => $eSub,
                        ]);
                    }
                    $item->update(['subtotal' => $itemSub + $extrasSub]);
                }
            }

            $order->recalculate();

            // If order was already dispatched (ready), bring it back to confirmed so kitchen sees new items
            if ($order->status === Order::STATUS_READY) {
                $order->update(['status' => Order::STATUS_CONFIRMED]);
            }
        });

        // Broadcast a refresh to KDS because order changed
        broadcast(new OrderStatusUpdated($order->fresh(['table', 'user', 'items.product', 'items.variant', 'items.extras.extra'])))->toOthers();

        AuditLogger::log(
            'order.items_added',
            "Items adicionales agregados a orden #{$order->order_number}",
            ['order_id' => $order->id],
            $order
        );

        return response()->json([
            'message' => 'Items agregados a la orden',
            'data'    => new OrderResource($order->fresh(['table', 'user', 'items.product', 'items.variant', 'items.extras.extra'])),
        ]);
    }

    // ── REMOVE ITEM FROM ORDER ────────────────────────
    public function removeItem(Request $request, Order $order, OrderItem $item): JsonResponse
    {
        $this->authorizeTenant($request, $order->restaurant_id);

        if ($item->order_id !== $order->id) {
            return response()->json(['message' => 'Item no pertenece a la orden'], 422);
        }

        if ($item->status !== 'pending') {
            return response()->json(['message' => 'Solo se pueden eliminar productos pendientes (si están en preparación, solicite cancelación a gerencia)'], 422);
        }

        $item->delete();
        $order->recalculate();

        broadcast(new OrderStatusUpdated($order->fresh(['table', 'user', 'items.product', 'items.variant', 'items.extras.extra'])))->toOthers();

        AuditLogger::log(
            'order.item_removed',
            "Item eliminado de orden #{$order->order_number}",
            ['order_id' => $order->id, 'item_id' => $item->id],
            $order
        );

        return response()->json(['message' => 'Item eliminado', 'data' => new OrderResource($order->fresh())]);
    }

    // ── SHOW ───────────────────────────────────────────
    public function show(Request $request, Order $order): JsonResponse
    {
        $this->authorizeTenant($request, $order->restaurant_id);
        return response()->json([
            'data' => new OrderResource($order->load(['table', 'user', 'items.product', 'items.variant', 'items.extras.extra'])),
        ]);
    }

    // ── UPDATE STATUS ──────────────────────────────────
    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $this->authorizeTenant($request, $order->restaurant_id);

        $request->validate([
            'status' => ['required', Rule::in(['confirmed', 'ready', 'delivered', 'paid', 'cancelled'])],
        ]);

        $timestamps = [];
        match ($request->status) {
            'confirmed' => $timestamps['confirmed_at'] = now(),
            'ready'     => $timestamps['ready_at']     = now(),
            'paid'      => $timestamps['paid_at']      = now(),
            default     => null,
        };

        $order->update(array_merge(['status' => $request->status], $timestamps));

        if ($request->status === 'ready') {
            $order->items()->whereNotIn('status', ['ready', 'delivered'])->update(['status' => 'ready']);
        }

        // Free table when paid or cancelled
        if (in_array($request->status, ['paid', 'cancelled']) && $order->table_id) {
            Table::where('id', $order->table_id)->update(['status' => 'available']);
        }

        // Broadcast event
        broadcast(new OrderStatusUpdated($order->fresh(['table', 'user', 'items.product', 'items.variant', 'items.extras.extra'])))->toOthers();

        // Audit Log for sensitive status changes
        if (in_array($request->status, ['paid', 'cancelled'])) {
            AuditLogger::log(
                "order.{$request->status}",
                "Orden #{$order->order_number} marcada como {$request->status}",
                ['order_id' => $order->id, 'total' => $order->total],
                $order
            );
        }

        return response()->json([
            'message' => 'Estado actualizado',
            'data'    => new OrderResource($order->fresh(['table', 'items.product'])),
        ]);
    }

    // ── UPDATE ITEM STATUS (para cocina) ───────────────
    public function updateItemStatus(Request $request, Order $order, OrderItem $item): JsonResponse
    {
        $this->authorizeTenant($request, $order->restaurant_id);

        $request->validate([
            'status' => ['required', Rule::in(['pending', 'preparing', 'ready', 'delivered'])],
        ]);

        $item->update(['status' => $request->status]);

        // Auto-advance order to ready when all items are ready
        $allReady = $order->items()->whereNotIn('status', ['ready', 'delivered'])->doesntExist();
        if ($allReady && $order->status === Order::STATUS_CONFIRMED) {
            $order->update(['status' => Order::STATUS_READY, 'ready_at' => now()]);
        }

        // Broadcast event
        broadcast(new OrderStatusUpdated($order->fresh(['table', 'user', 'items.product', 'items.variant', 'items.extras.extra'])))->toOthers();

        return response()->json(['message' => 'Ítem actualizado', 'item_status' => $item->status, 'order_status' => $order->fresh()->status]);
    }

    // ── CANCEL ─────────────────────────────────────────
    public function destroy(Request $request, Order $order): JsonResponse
    {
        $this->authorizeTenant($request, $order->restaurant_id);

        if (in_array($order->status, [Order::STATUS_PAID])) {
            return response()->json(['message' => 'No se puede cancelar una orden pagada'], 422);
        }

        $order->update(['status' => Order::STATUS_CANCELLED]);
        
        AuditLogger::log(
            'order.cancelled',
            "Orden #{$order->order_number} cancelada por el usuario",
            ['order_id' => $order->id],
            $order
        );

        if ($order->table_id) {
            Table::where('id', $order->table_id)->update(['status' => 'available']);
        }

        return response()->json(['message' => 'Orden cancelada']);
    }

    private function authorizeTenant(Request $request, int $restaurantId): void
    {
        $user = $request->user();
        if (!$user->hasRole('superadmin') && $user->restaurant_id !== $restaurantId) {
            abort(403);
        }
    }
}
