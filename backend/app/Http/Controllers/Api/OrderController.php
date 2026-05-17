<?php

namespace App\Http\Controllers\Api;

use App\Events\CookBellRung;
use App\Events\OrderBellRung;
use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Table;
use App\Services\AuditLogger;
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
        $authUser = $request->user();
        $isCook = $authUser->hasRole('cocina');

        $query = Order::with([
            'table', 'user',
            'items.product.category',
            'items.variant',
            'items.extras.extra',
        ])
            ->forRestaurant($restaurantId)
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->types, fn ($q) => $q->whereIn('type', explode(',', $request->types)))
            ->when($request->table_id, fn ($q) => $q->where('table_id', $request->table_id))
            ->when(! $request->include_closed, fn ($q) => $q->active())
            ->orderByDesc('created_at');

        $orders = $request->paginate ? $query->paginate(30) : $query->get();

        // For cooks: filter order items to only the ones belonging to their assigned categories
        if ($isCook) {
            $cookId = $authUser->id;
            $orders = $orders->map(function ($order) use ($cookId) {
                $order->setRelation('items', $order->items->filter(function ($item) use ($cookId) {
                    $assignedCookId = $item->product?->category?->assigned_cook_id;

                    // Only show items whose category is explicitly assigned to THIS cook
                    return $assignedCookId !== null && $assignedCookId === $cookId;
                })->values());

                return $order;
            })->filter(fn ($order) => $order->items->isNotEmpty())->values();
        }

        return response()->json([
            'data' => OrderResource::collection($orders),
        ]);
    }

    // ── CREATE ─────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $restaurantId = $request->get('restaurant_id');

        $request->validate([
            'table_id' => ['nullable', 'exists:tables,id'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'type' => ['sometimes', Rule::in(['dine_in', 'takeaway', 'delivery'])],
            'customer_name' => ['nullable', 'string', 'max:100'],
            'delivery_address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.product_variant_id' => ['nullable', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.promotion_type' => ['nullable', Rule::in(['2x1', '3x2'])],
            'items.*.notes' => ['nullable', 'string'],
            'items.*.extras' => ['sometimes', 'array'],
            'items.*.extras.*.extra_id' => ['required', 'exists:extras,id'],
            'items.*.extras.*.quantity' => ['sometimes', 'integer', 'min:1'],
            'items.*.custom_price' => ['sometimes', 'numeric', 'min:0'],
        ]);

        $order = DB::transaction(function () use ($request, $restaurantId) {
            $order = Order::create([
                'restaurant_id' => $restaurantId,
                'table_id' => $request->table_id,
                'user_id' => $request->user()->id,
                'customer_id' => $request->customer_id,
                'order_number' => Order::nextOrderNumber($restaurantId),
                'type' => $request->type ?? 'dine_in',
                'customer_name' => $request->customer_name,
                'delivery_address' => $request->delivery_address,
                'notes' => $request->notes,
                'status' => Order::STATUS_CONFIRMED,
                'confirmed_at' => now(),
            ]);

            foreach ($request->items as $itemData) {
                $product = Product::findOrFail($itemData['product_id']);
                $unitPrice = (float) $product->price;

                // Add variant price modifier
                // Add variant price modifier or use open price
                if (! empty($itemData['product_variant_id'])) {
                    $variant = $product->variants()->find($itemData['product_variant_id']);
                    if ($variant) {
                        if ($variant->is_open_price && isset($itemData['custom_price'])) {
                            $unitPrice = (float) $itemData['custom_price'];
                        } else {
                            $unitPrice += (float) $variant->price_modifier;
                        }
                    }
                }

                $qty = $itemData['quantity'];
                $promo = $itemData['promotion_type'] ?? null;

                $billedQty = $qty;
                if ($promo === '2x1') {
                    $billedQty = (int) ceil($qty / 2);
                } elseif ($promo === '3x2') {
                    $billedQty = (int) ceil($qty * 2 / 3);
                }

                $itemSub = round($unitPrice * $billedQty, 2);

                $item = OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $itemData['product_id'],
                    'product_variant_id' => $itemData['product_variant_id'] ?? null,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'subtotal' => $itemSub,
                    'notes' => $itemData['notes'] ?? null,
                    'status' => 'pending',
                    'promotion_type' => $promo,
                ]);

                // Extras
                $extrasSub = 0;
                if (! empty($itemData['extras'])) {
                    foreach ($itemData['extras'] as $extraData) {
                        $extra = \App\Models\Extra::findOrFail($extraData['extra_id']);
                        $eQty = $extraData['quantity'] ?? 1;
                        $eSub = round((float) $extra->price * $eQty, 2);
                        $extrasSub += $eSub;
                        $item->extras()->create([
                            'extra_id' => $extra->id,
                            'quantity' => $eQty,
                            'unit_price' => (float) $extra->price,
                            'subtotal' => $eSub,
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
        $this->safeBroadcast(new OrderCreated($order->load(['table', 'user', 'items.product', 'items.variant', 'items.extras.extra'])));

        return response()->json([
            'message' => 'Orden creada',
            'data' => new OrderResource($order->load(['table', 'user', 'items.product', 'items.variant', 'items.extras.extra'])),
        ], 201);
    }

    public function printTicket(Request $request, Order $order): JsonResponse
    {
        $this->authorizeTenant($request, $order->restaurant_id);

        $order->loadMissing(['table', 'user', 'restaurant', 'items.product', 'items.variant', 'items.extras.extra']);
        $restaurant = $order->restaurant;

        $ticketData = [
            'is_pre_cuenta' => true,
            'folio' => $order->order_number, // We use order number since there is no payment folio yet
            'restaurant' => [
                'name' => $restaurant->name,
                'address' => $restaurant->address,
                'phone' => $restaurant->phone,
                'whatsapp' => $restaurant->whatsapp,
                'city' => $restaurant->city,
                'logo' => $restaurant->logo,
            ],
            'cashier' => $order->user->name ?? 'Sistema',
            'date' => now()->format('d/m/Y'),
            'time' => now()->format('H:i:s'),
            'order_type' => $order->type,
            'customer_name' => $order->customer_name,
            'delivery_address' => $order->delivery_address,
            'order_number' => $order->order_number,
            'table' => $order->getRelation('table')?->name,
            'items' => $order->items->map(fn ($item) => [
                'name' => $item->product->name,
                'variant' => $item->variant?->name,
                'extras' => $item->extras->map(fn ($e) => $e->extra->name)->all(),
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'subtotal' => (float) $item->subtotal,
            ])->all(),
            'subtotal' => (float) $order->subtotal,
            'tax' => (float) $order->tax,
            'delivery_fee' => (float) $order->delivery_fee,
            'total' => (float) $order->total,
            'grand_total' => (float) $order->total,
        ];

        return response()->json(['ticket_data' => $ticketData]);
    }

    // ── ADD ITEMS ALREADY CREATED ORDER ────────────────

    public function addItems(Request $request, Order $order): JsonResponse
    {

        $this->authorizeTenant($request, $order->restaurant_id);

        if (in_array($order->status, [Order::STATUS_PAID, Order::STATUS_CANCELLED])) {
            return response()->json(['message' => 'No se pueden agregar ítems a una orden cerrada o pagada'], 422);
        }

        $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.product_variant_id' => ['nullable', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.promotion_type' => ['nullable', Rule::in(['2x1', '3x2'])],
            'items.*.notes' => ['nullable', 'string'],
            'items.*.extras' => ['sometimes', 'array'],
            'items.*.extras.*.extra_id' => ['required', 'exists:extras,id'],
            'items.*.extras.*.quantity' => ['sometimes', 'integer', 'min:1'],
            'items.*.custom_price' => ['sometimes', 'numeric', 'min:0'],
        ]);

        $newItems = new \Illuminate\Database\Eloquent\Collection;

        DB::transaction(function () use ($request, $order, &$newItems) {
            foreach ($request->items as $itemData) {
                $product = Product::findOrFail($itemData['product_id']);
                $unitPrice = (float) $product->price;

                if (! empty($itemData['product_variant_id'])) {
                    $variant = $product->variants()->find($itemData['product_variant_id']);
                    if ($variant) {
                        if ($variant->is_open_price && isset($itemData['custom_price'])) {
                            $unitPrice = (float) $itemData['custom_price'];
                        } else {
                            $unitPrice += (float) $variant->price_modifier;
                        }
                    }
                }

                $qty = $itemData['quantity'];
                $promo = $itemData['promotion_type'] ?? null;

                $billedQty = $qty;
                if ($promo === '2x1') {
                    $billedQty = (int) ceil($qty / 2);
                } elseif ($promo === '3x2') {
                    $billedQty = (int) ceil($qty * 2 / 3);
                }

                $itemSub = round($unitPrice * $billedQty, 2);

                $item = OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $itemData['product_id'],
                    'product_variant_id' => $itemData['product_variant_id'] ?? null,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'subtotal' => $itemSub,
                    'notes' => $itemData['notes'] ?? null,
                    'status' => 'pending',
                    'promotion_type' => $promo,
                ]);

                $newItems->push($item);

                $extrasSub = 0;
                if (! empty($itemData['extras'])) {
                    foreach ($itemData['extras'] as $extraData) {
                        $extra = \App\Models\Extra::findOrFail($extraData['extra_id']);
                        $eQty = $extraData['quantity'] ?? 1;
                        $eSub = round((float) $extra->price * $eQty, 2);
                        $extrasSub += $eSub;
                        $item->extras()->create([
                            'extra_id' => $extra->id,
                            'quantity' => $eQty,
                            'unit_price' => (float) $extra->price,
                            'subtotal' => $eSub,
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
        $this->safeBroadcast(new OrderStatusUpdated($order->fresh(['table', 'user', 'items.product.category', 'items.variant', 'items.extras.extra'])));

        // Broadcast bell to assigned cooks for the newly added items
        $newItems->load('product.category');
        $cookIds = $newItems
            ->map(fn ($item) => $item->product?->category?->assigned_cook_id)
            ->filter()
            ->unique()
            ->values()
            ->toArray();

        if (! empty($cookIds)) {
            $this->safeBroadcast(new CookBellRung($cookIds, $order->order_number));
        }

        AuditLogger::log(
            'order.items_added',
            "Items adicionales agregados a orden #{$order->order_number}",
            ['order_id' => $order->id],
            $order
        );

        return response()->json([
            'message' => 'Items agregados a la orden',
            'data' => new OrderResource($order->fresh(['table', 'user', 'items.product', 'items.variant', 'items.extras.extra'])),
        ]);
    }

    // ── REMOVE ITEM FROM ORDER ────────────────────────
    public function removeItem(Request $request, Order $order, OrderItem $item): JsonResponse
    {
        $this->authorizeTenant($request, $order->restaurant_id);

        if ($item->order_id !== $order->id) {
            return response()->json(['message' => 'Item no pertenece a la orden'], 422);
        }

        if (! in_array($item->status, ['pending', 'preparing'])) {
            return response()->json(['message' => 'Solo se pueden eliminar productos pendientes o en preparación (si ya están listos, contacte a gerencia)'], 422);
        }

        $item->delete();
        $order->recalculate();

        $this->safeBroadcast(new OrderStatusUpdated($order->fresh(['table', 'user', 'items.product.category', 'items.variant', 'items.extras.extra'])));

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
            'ready' => $timestamps['ready_at'] = now(),
            'paid' => $timestamps['paid_at'] = now(),
            default => null,
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
        $this->safeBroadcast(new OrderStatusUpdated($order->fresh(['table', 'user', 'items.product.category', 'items.variant', 'items.extras.extra'])));

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
            'data' => new OrderResource($order->fresh(['table', 'items.product'])),
        ]);
    }

    // ── UPDATE DELIVERY FEE ────────────────────────────
    public function updateDeliveryFee(Request $request, Order $order): JsonResponse
    {
        $this->authorizeTenant($request, $order->restaurant_id);

        $request->validate([
            'delivery_fee' => ['required', 'numeric', 'min:0'],
        ]);

        if (in_array($order->status, [Order::STATUS_PAID, Order::STATUS_CANCELLED])) {
            return response()->json(['message' => 'No se puede modificar una orden pagada o cancelada'], 422);
        }

        $order->update(['delivery_fee' => $request->delivery_fee]);
        $order->recalculate();

        $this->safeBroadcast(new OrderStatusUpdated($order->fresh(['table', 'user', 'items.product.category', 'items.variant', 'items.extras.extra'])));

        AuditLogger::log(
            'order.delivery_fee_updated',
            "Costo de envío actualizado a {$request->delivery_fee} en orden #{$order->order_number}",
            ['order_id' => $order->id, 'delivery_fee' => $request->delivery_fee],
            $order
        );

        return response()->json([
            'message' => 'Costo de envío actualizado',
            'data' => new OrderResource($order->fresh(['table', 'items.product', 'items.variant', 'items.extras.extra'])),
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
        $this->safeBroadcast(new OrderStatusUpdated($order->fresh(['table', 'user', 'items.product.category', 'items.variant', 'items.extras.extra'])));

        return response()->json(['message' => 'Ítem actualizado', 'item_status' => $item->status, 'order_status' => $order->fresh()->status]);
    }

    // ── MARK COOK ITEMS READY ──────────────────────────
    public function markCookItemsReady(Request $request, Order $order): JsonResponse
    {
        $this->authorizeTenant($request, $order->restaurant_id);
        $cookId = $request->user()->id;

        // Find items that belong to this cook and are not ready
        $items = $order->items()->whereNotIn('status', ['ready', 'delivered'])->get();

        $updated = false;
        foreach ($items as $item) {
            $assignedCookId = $item->product?->category?->assigned_cook_id;
            if ($assignedCookId === $cookId) {
                $item->update(['status' => 'ready']);
                $updated = true;
            }
        }

        if ($updated) {
            $allReady = $order->items()->whereNotIn('status', ['ready', 'delivered'])->doesntExist();
            if ($allReady && $order->status === Order::STATUS_CONFIRMED) {
                $order->update(['status' => Order::STATUS_READY, 'ready_at' => now()]);
            }
            $this->safeBroadcast(new OrderStatusUpdated($order->fresh(['table', 'user', 'items.product.category', 'items.variant', 'items.extras.extra'])));
        }

        return response()->json(['message' => 'Tus ítems fueron marcados como completados']);
    }

    // ── RING BELL ───────────────────────────────────────
    public function ringBell(Request $request, Order $order): JsonResponse
    {
        $this->authorizeTenant($request, $order->restaurant_id);

        $this->safeBroadcast(new OrderBellRung($order));

        return response()->json(['message' => 'Timbre enviado']);
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

    /**
     * Aplicar/Remover IVA (16%) manualmente a la orden
     */
    public function toggleTax(Request $request, Order $order): JsonResponse
    {
        $subtotal = $order->subtotal;

        // Si ya tiene IVA, lo quitamos. Si no, aplicamos el 16%
        if ($order->tax > 0) {
            $tax = 0;
        } else {
            $tax = round($subtotal * 0.16, 2);
        }

        $order->update([
            'tax' => $tax,
            'total' => $subtotal + $tax + ($order->delivery_fee ?? 0) - ($order->discount ?? 0),
        ]);

        return response()->json([
            'message' => $tax > 0 ? 'IVA aplicado correctamente' : 'IVA removido correctamente',
            'data' => $order->load(['items.product', 'table', 'items.variant', 'items.extras.extra']),
        ]);
    }

    private function authorizeTenant(Request $request, int $restaurantId): void
    {
        $user = $request->user();
        if (! $user->hasRole('superadmin') && $user->restaurant_id !== $restaurantId) {
            abort(403);
        }
    }

    private function safeBroadcast($event): void
    {
        try {
            broadcast($event)->toOthers();
        } catch (\Throwable $e) {
            \Log::warning('Broadcasting failed: '.$e->getMessage());
        }
    }
}
