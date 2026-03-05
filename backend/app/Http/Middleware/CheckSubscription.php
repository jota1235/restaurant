<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscription
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'No autenticado'
            ], 401);
        }

        // Use scoped restaurant_id (set by RestaurantScope middleware) or user default
        $restaurantId = $request->get('restaurant_id', $user->restaurant_id);

        if (!$restaurantId) {
            return response()->json([
                'message' => 'Restaurante no encontrado'
            ], 403);
        }

        $restaurant = Restaurant::find($restaurantId);

        if (!$restaurant) {
            return response()->json([
                'message' => 'Restaurante no encontrado'
            ], 403);
        }

        // Verificar si el restaurante tiene suscripción activa
        if (!$restaurant->hasActiveSubscription()) {
            return response()->json([
                'message' => 'Suscripción expirada o inactiva. Por favor contacte a soporte.',
                'subscription_expired' => true
            ], 403);
        }

        return $next($request);
    }
}
