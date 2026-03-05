<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\Restaurant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Login de usuario y generación de token Sanctum
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        if (!Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'Credenciales incorrectas'
            ], 401);
        }

        $user = Auth::user();

        // Verificar que el usuario esté activo
        if (!$user->is_active) {
            Auth::logout();
            return response()->json([
                'message' => 'Usuario inactivo. Contacte al administrador.'
            ], 403);
        }

        // Crear token para SPA
        $token = $user->createToken('auth_token')->plainTextToken;

        // Get all restaurants this user can access
        $restaurants = $user->restaurants()->get(['restaurants.id', 'restaurants.name', 'restaurants.slug', 'restaurants.address', 'restaurants.city']);

        // Auto-sync: if user has restaurant_id but no pivot entries, create one
        if ($restaurants->isEmpty() && $user->restaurant_id) {
            $roleName = $user->roles->first()?->name ?? 'mesero';
            $user->restaurants()->syncWithoutDetaching([
                $user->restaurant_id => ['role' => $roleName]
            ]);
            $restaurants = $user->restaurants()->get(['restaurants.id', 'restaurants.name', 'restaurants.slug', 'restaurants.address', 'restaurants.city']);
        }

        $requiresBranchSelection = $restaurants->count() > 1;
        $activeRestaurantId = $restaurants->count() === 1 ? $restaurants->first()->id : $user->restaurant_id;

        return response()->json([
            'message' => 'Login exitoso',
            'user' => new UserResource($user->load(['restaurant', 'roles', 'permissions'])),
            'token' => $token,
            'restaurants' => $restaurants,
            'requires_branch_selection' => $requiresBranchSelection,
            'active_restaurant_id' => $activeRestaurantId,
        ]);
    }

    /**
     * Select active branch for multi-restaurant users
     */
    public function selectBranch(Request $request): JsonResponse
    {
        $request->validate([
            'restaurant_id' => ['required', 'integer', 'exists:restaurants,id'],
        ]);

        $user = $request->user();
        $restaurantId = $request->restaurant_id;

        if (!$user->canAccessRestaurant($restaurantId)) {
            return response()->json([
                'message' => 'No tienes acceso a esta sucursal'
            ], 403);
        }

        $restaurant = Restaurant::find($restaurantId);

        return response()->json([
            'message' => 'Sucursal seleccionada',
            'active_restaurant_id' => $restaurantId,
            'restaurant' => $restaurant,
        ]);
    }

    /**
     * Registro de nuevo usuario
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'restaurant_id' => $request->restaurant_id,
            'is_active' => true,
        ]);

        // Asignar rol por defecto si se proporciona
        if ($request->role) {
            $user->assignRole($request->role);
        }

        // Also add to pivot table
        if ($request->restaurant_id) {
            $user->restaurants()->attach($request->restaurant_id, ['role' => $request->role]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Usuario registrado exitosamente',
            'user' => new UserResource($user->load(['restaurant', 'roles', 'permissions'])),
            'token' => $token,
        ], 201);
    }

    /**
     * Logout y revocación de token
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout exitoso'
        ]);
    }

    /**
     * Obtener usuario autenticado
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['restaurant.subscription.plan', 'roles', 'permissions']);
        $restaurants = $request->user()->restaurants()->get(['restaurants.id', 'restaurants.name', 'restaurants.slug', 'restaurants.address', 'restaurants.city']);

        return response()->json([
            'user' => new UserResource($user),
            'restaurants' => $restaurants,
        ]);
    }
}
