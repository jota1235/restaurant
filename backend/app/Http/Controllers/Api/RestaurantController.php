<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Restaurant\StoreRestaurantRequest;
use App\Http\Requests\Restaurant\UpdateRestaurantRequest;
use App\Http\Resources\RestaurantResource;
use App\Models\Plan;
use App\Models\Restaurant;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RestaurantController extends Controller
{
    /**
     * Listar restaurantes (solo superadmin ve todos; admin solo el suyo)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Restaurant::with(['subscription.plan'])
            ->withCount(['users', 'members']);

        // Superadmin ve todos; admin ve los que tiene asignados
        if (!$user->hasRole('superadmin')) {
            $restaurantIds = $user->restaurants()->pluck('restaurants.id')->push($user->restaurant_id)->unique()->filter();
            $query->whereIn('id', $restaurantIds);
        }

        $restaurants = $query->latest()->paginate(20);

        return response()->json([
            'data'  => RestaurantResource::collection($restaurants),
            'meta'  => [
                'total'        => $restaurants->total(),
                'current_page' => $restaurants->currentPage(),
                'last_page'    => $restaurants->lastPage(),
            ],
        ]);
    }

    /**
     * Crear restaurante (solo superadmin)
     */
    public function store(StoreRestaurantRequest $request): JsonResponse
    {
        $restaurant = Restaurant::create([
            ...$request->validated(),
            'slug'      => Str::slug($request->name),
            'is_active' => true,
        ]);

        // Create subscription (use provided plan or default to first plan)
        $planId = $request->plan_id ?? Plan::where('is_active', true)->value('id');
        if ($planId) {
            Subscription::create([
                'restaurant_id' => $restaurant->id,
                'plan_id'       => $planId,
                'starts_at'     => now(),
                'ends_at'       => now()->addMonths($request->duration_months ?? 12),
                'status'        => 'active',
            ]);
        }

        return response()->json([
            'message' => 'Restaurante creado exitosamente',
            'data'    => new RestaurantResource($restaurant->load('subscription.plan')),
        ], 201);
    }

    /**
     * Mostrar restaurante
     */
    public function show(Request $request, Restaurant $restaurant): JsonResponse
    {
        $this->authorizeRestaurantAccess($request, $restaurant);

        return response()->json([
            'data' => new RestaurantResource(
                $restaurant->load(['subscription.plan', 'users'])
            ),
        ]);
    }

    /**
     * Actualizar restaurante
     */
    public function update(UpdateRestaurantRequest $request, Restaurant $restaurant): JsonResponse
    {
        $this->authorizeRestaurantAccess($request, $restaurant);

        $data = $request->validated();
        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $restaurant->update($data);

        return response()->json([
            'message' => 'Restaurante actualizado exitosamente',
            'data'    => new RestaurantResource($restaurant->load('subscription.plan')),
        ]);
    }

    /**
     * Activar/desactivar restaurante (solo superadmin)
     */
    public function toggleActive(Request $request, Restaurant $restaurant): JsonResponse
    {
        if (!$request->user()->hasRole('superadmin')) {
            return response()->json(['message' => 'Sin permisos'], 403);
        }

        $restaurant->update(['is_active' => !$restaurant->is_active]);

        return response()->json([
            'message'   => $restaurant->is_active ? 'Restaurante activado' : 'Restaurante desactivado',
            'is_active' => $restaurant->is_active,
        ]);
    }

    /**
     * Eliminar restaurante (solo superadmin)
     */
    public function destroy(Request $request, Restaurant $restaurant): JsonResponse
    {
        if (!$request->user()->hasRole('superadmin')) {
            return response()->json(['message' => 'Sin permisos'], 403);
        }

        $restaurant->delete();

        return response()->json(['message' => 'Restaurante eliminado']);
    }

    /**
     * Extender o renovar suscripción (solo superadmin)
     */
    public function extendSubscription(Request $request, Restaurant $restaurant): JsonResponse
    {
        if (!$request->user()->hasRole('superadmin')) {
            return response()->json(['message' => 'Sin permisos'], 403);
        }

        $request->validate([
            'ends_at' => ['required', 'date', 'after:today'],
            'status'  => ['sometimes', 'in:active,trial,cancelled'],
        ]);

        $subscription = $restaurant->subscription;

        if ($subscription) {
            $subscription->update([
                'ends_at' => $request->ends_at,
                'status'  => $request->status ?? 'active',
            ]);
        } else {
            $planId = Plan::where('is_active', true)->value('id');

            // Si no hay plan en la base de datos, crea uno genérico por defecto
            if (!$planId) {
                $plan = Plan::create([
                    'name' => 'Plan Básico',
                    'price' => 0,
                    'is_active' => true,
                    'features' => ['all'],
                ]);
                $planId = $plan->id;
            }

            Subscription::create([
                'restaurant_id' => $restaurant->id,
                'plan_id'       => $planId,
                'starts_at'     => now(),
                'ends_at'       => $request->ends_at,
                'status'        => $request->status ?? 'active',
            ]);
        }

        return response()->json([
            'message' => 'Suscripción actualizada',
            'data'    => new RestaurantResource($restaurant->fresh(['subscription.plan'])),
        ]);
    }

    /**
     * Asegurar que admin solo accede a su restaurante
     */
    private function authorizeRestaurantAccess(Request $request, Restaurant $restaurant): void
    {
        $user = $request->user();
        if (!$user->canAccessRestaurant($restaurant->id)) {
            abort(403, 'Sin permisos para este restaurante');
        }
    }
}
