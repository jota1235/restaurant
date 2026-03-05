<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Table;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    /**
     * Obtener métricas generales para el dashboard de administración
     */
    public function dashboard(Request $request): JsonResponse
    {
        $restaurantId = $request->get('restaurant_id');
        $today = today();

        // 1. Órdenes hoy
        $ordersToday = Order::forRestaurant($restaurantId)
            ->whereDate('created_at', $today)
            ->count();

        // 2. Ventas hoy (Solo pagadas)
        $salesToday = Order::forRestaurant($restaurantId)
            ->whereDate('created_at', $today)
            ->where('status', Order::STATUS_PAID)
            ->sum('total');

        // 3. Mesas activas (Ocupadas)
        $activeTables = Table::forRestaurant($restaurantId)
            ->where('status', Table::STATUS_OCCUPIED)
            ->count();

        // 4. Pendiente cocina (Items pendientes o preparándose)
        $kitchenPending = OrderItem::whereHas('order', function ($q) use ($restaurantId) {
                $q->where('restaurant_id', $restaurantId)
                  ->whereNotIn('status', [Order::STATUS_PAID, Order::STATUS_CANCELLED]);
            })
            ->whereIn('status', ['pending', 'preparing'])
            ->count();

        // 5. Top Productos (Basado en cantidad vendida hoy)
        $topProducts = OrderItem::whereHas('order', function ($q) use ($restaurantId, $today) {
                $q->where('restaurant_id', $restaurantId)
                  ->whereDate('created_at', $today)
                  ->where('status', '!=', Order::STATUS_CANCELLED);
            })
            ->select('product_id', DB::raw('SUM(quantity) as total_qty'))
            ->groupBy('product_id')
            ->orderByDesc('total_qty')
            ->limit(5)
            ->with('product:id,name,price')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->product ? $item->product->name : 'Producto eliminado',
                    'qty'  => (int) $item->total_qty,
                    'total' => $item->product ? round($item->product->price * $item->total_qty, 2) : 0
                ];
            });

        return response()->json([
            'data' => [
                'orders_today'    => $ordersToday,
                'sales_today'     => (float) $salesToday,
                'active_tables'   => $activeTables,
                'kitchen_pending' => $kitchenPending,
                'top_products'    => $topProducts,
            ]
        ]);
    }
}
