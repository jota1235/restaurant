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

    /**
     * Reportes detallados para administradores (Multi-sucursal o rango de fechas)
     */
    public function reports(Request $request): JsonResponse
    {
        $user = $request->user();
        $baseQuery = Order::query()
            ->whereIn('status', [Order::STATUS_PAID])
            ->whereNotNull('total');

        // Leer restaurant de Header o parámetro, default al del usuario activo
        $restaurantId = $request->header('X-Restaurant-Id', $request->get('restaurant_id', $user->restaurant_id));

        // Determinar qué restaurantes se incluirán
        if ($restaurantId === 'all') {
            if (! $user->hasRole('superadmin')) {
                $baseQuery->where('restaurant_id', $user->restaurant_id);
            }
        } else {
            $baseQuery->where('restaurant_id', $restaurantId);
        }

        // Determinar el rango de fechas ampliando los bordes para resolver offsets de UTC vs Local
        $dateFromStr = $request->get('date_from', now()->startOfMonth()->toDateString());
        $dateToStr   = $request->get('date_to', now()->endOfDay()->toDateTimeString());

        $dateFrom = \Carbon\Carbon::parse($dateFromStr)->subHours(12)->toDateTimeString();
        $dateTo   = \Carbon\Carbon::parse($dateToStr)->addHours(12)->toDateTimeString();
        $baseQuery->whereBetween('created_at', [$dateFrom, $dateTo]);

        // Clonar queries para las diferentes consultas
        $salesOverTimeQuery = clone $baseQuery;
        $waiterQuery = clone $baseQuery;
        $typeQuery = clone $baseQuery;
        $branchQuery = clone $baseQuery;

        // 1. Ventas a lo largo del tiempo (agrupado por día)
        // Solo para MySQL. Adaptable si usan SQLite date()
        $isSqlite = DB::connection()->getDriverName() === 'sqlite';
        $dateFormat = $isSqlite ? "strftime('%Y-%m-%d', created_at)" : "DATE(created_at)";
        
        $salesOverTime = $salesOverTimeQuery
            ->select(DB::raw("{$dateFormat} as date"), DB::raw('SUM(total) as total'))
            ->groupBy(DB::raw($dateFormat))
            ->orderBy('date')
            ->get()
            ->map(fn($row) => [
                'date' => $row->date,
                'total' => (float) $row->total,
            ]);

        // 2. Ventas por mesero / usuario
        $waiterPerformance = $waiterQuery
            ->select('user_id', DB::raw('SUM(total) as sold_amount'), DB::raw('COUNT(id) as orders_count'))
            ->groupBy('user_id')
            ->orderByDesc('sold_amount')
            ->with('user:id,name')
            ->get()
            ->map(fn($row) => [
                'waiter_name' => $row->user ? $row->user->name : 'Usuario Desconocido',
                'orders_count' => (int) $row->orders_count,
                'sold_amount' => (float) $row->sold_amount,
            ]);

        // 3. Ventas por tipo de pedido
        $salesByType = $typeQuery
            ->select('type', DB::raw('SUM(total) as sold_amount'), DB::raw('COUNT(id) as orders_count'))
            ->groupBy('type')
            ->get()
            ->map(fn($row) => [
                'type' => $row->type,
                'orders_count' => (int) $row->orders_count,
                'sold_amount' => (float) $row->sold_amount,
            ]);

        // 4. Ventas por sucursal (Util solo para dueños/superadmins)
        $salesByBranch = $branchQuery
            ->select('restaurant_id', DB::raw('SUM(total) as sold_amount'), DB::raw('COUNT(id) as orders_count'))
            ->groupBy('restaurant_id')
            ->with('restaurant:id,name')
            ->get()
            ->map(fn($row) => [
                'branch_name' => $row->restaurant ? $row->restaurant->name : 'Desconocida',
                'orders_count' => (int) $row->orders_count,
                'sold_amount' => (float) $row->sold_amount,
            ]);

        // 5. Productos más vendidos en el rango de fechas
        $topProducts = OrderItem::whereHas('order', function ($q) use ($baseQuery) {
                // Aplicar exactamente los mismos filtros de la baseQuery
                $q->mergeConstraintsFrom($baseQuery);
            })
            ->select('product_id', DB::raw('SUM(quantity) as total_qty'), DB::raw('SUM(subtotal) as total_sold'))
            ->groupBy('product_id')
            ->orderByDesc('total_qty')
            ->limit(10)
            ->with('product:id,name,price')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->product ? $item->product->name : 'Desconocido',
                    'qty'  => (int) $item->total_qty,
                    'total' => (float) $item->total_sold,
                ];
            });

        return response()->json([
            'data' => [
                'sales_over_time' => $salesOverTime,
                'waiter_performance' => $waiterPerformance,
                'sales_by_type' => $salesByType,
                'sales_by_branch' => $salesByBranch,
                'top_products' => $topProducts,
            ]
        ]);
    }
}
