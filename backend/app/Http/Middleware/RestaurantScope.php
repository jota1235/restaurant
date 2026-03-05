<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RestaurantScope
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'No autenticado'
            ], 401);
        }

        // Determine restaurant_id from: X-Restaurant-Id header > user default
        $restaurantId = $request->header('X-Restaurant-Id') ?? $user->restaurant_id;

        if (!$restaurantId) {
            return response()->json([
                'message' => 'No se ha seleccionado una sucursal'
            ], 403);
        }

        // Validate user has access to this restaurant
        if (!$user->canAccessRestaurant((int) $restaurantId)) {
            return response()->json([
                'message' => 'No tienes acceso a esta sucursal'
            ], 403);
        }

        // Inject restaurant_id into the request for global use
        $request->merge(['restaurant_id' => (int) $restaurantId]);
        app()->instance('restaurant_id', (int) $restaurantId);

        return $next($request);
    }
}
