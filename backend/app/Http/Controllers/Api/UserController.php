<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;


class UserController extends Controller
{
    /**
     * Listar usuarios del restaurante
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $restaurantId = $request->get('restaurant_id', $user->restaurant_id);

        $query = User::with(['roles'])
            ->when(!$user->hasRole('superadmin'), function ($q) use ($restaurantId) {
                $q->where('restaurant_id', $restaurantId);
            });

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        if ($request->role) {
            $query->role($request->role);
        }

        $users = $query->latest()->paginate(20);

        return response()->json([
            'data' => UserResource::collection($users),
            'meta' => [
                'total'        => $users->total(),
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
            ],
        ]);
    }

    /**
     * Crear usuario en el restaurante
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $currentUser = $request->user();

            // Determinar restaurant_id: superadmin uses first of restaurant_ids; admin uses own
            $restaurantIds = $request->restaurant_ids ?? [];
            $restaurantId = $currentUser->hasRole('superadmin')
                ? ($request->restaurant_id ?? ($restaurantIds[0] ?? $currentUser->restaurant_id))
                : ($request->get('restaurant_id', $currentUser->restaurant_id));

            $user = User::create([
                'name'          => $request->name,
                'email'         => $request->email,
                'password'      => Hash::make($request->password),
                'restaurant_id' => $restaurantId,
                'is_active'     => $request->boolean('is_active', true),
            ]);

            if ($request->role) {
                // Ensure we use the correct guard if specified in the model
                $user->assignRole($request->role);
            }

            // Sync pivot table for multi-branch access
            if ($currentUser->hasRole('superadmin') && !empty($restaurantIds)) {
                $pivotData = collect($restaurantIds)->mapWithKeys(fn($id) => [
                    $id => ['role' => $request->role]
                ])->all();
                $user->restaurants()->sync($pivotData);
            } elseif ($restaurantId) {
                $user->restaurants()->syncWithoutDetaching([
                    $restaurantId => ['role' => $request->role]
                ]);
            }

            return response()->json([
                'message' => 'Usuario creado exitosamente',
                'data'    => new UserResource($user->load(['restaurant', 'roles'])),
            ], 201);
        });
    }

    /**
     * Mostrar usuario
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorizeUserAccess($request, $user);

        return response()->json([
            'data' => new UserResource($user->load(['restaurant', 'roles', 'permissions'])),
        ]);
    }

    /**
     * Actualizar usuario
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $this->authorizeUserAccess($request, $user);

        return DB::transaction(function () use ($request, $user) {
            $data = $request->validated();

            if (isset($data['password'])) {
                $data['password'] = Hash::make($data['password']);
            } else {
                unset($data['password']);
            }

            $user->update($data);

            // Actualizar rol si se envía
            if ($request->has('role') && $request->role) {
                $user->syncRoles([$request->role]);
            }

            // Sync multi-branch access (superadmin only)
            $restaurantIds = $request->restaurant_ids ?? [];
            if ($request->user()->hasRole('superadmin') && !empty($restaurantIds)) {
                $pivotData = collect($restaurantIds)->mapWithKeys(fn($id) => [
                    $id => ['role' => $request->role ?? $user->roles->first()?->name]
                ])->all();
                $user->restaurants()->sync($pivotData);
                // Update default restaurant_id to the first selected
                $user->update(['restaurant_id' => $restaurantIds[0]]);
            }

            return response()->json([
                'message' => 'Usuario actualizado exitosamente',
                'data'    => new UserResource($user->load(['restaurant', 'roles'])),
            ]);
        });
    }

    /**
     * Activar/desactivar usuario
     */
    public function toggleActive(Request $request, User $user): JsonResponse
    {
        $this->authorizeUserAccess($request, $user);

        // No permitir desactivarse a sí mismo
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'No puedes desactivarte a ti mismo'], 422);
        }

        $user->update(['is_active' => !$user->is_active]);

        return response()->json([
            'message'   => $user->is_active ? 'Usuario activado' : 'Usuario desactivado',
            'is_active' => $user->is_active,
        ]);
    }

    /**
     * Eliminar usuario
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorizeUserAccess($request, $user);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'No puedes eliminarte a ti mismo'], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Usuario eliminado']);
    }

    private function authorizeUserAccess(Request $request, User $user): void
    {
        $currentUser = $request->user();
        
        // Superadmin bypass
        try {
            if ($currentUser->hasRole('superadmin')) {
                return;
            }
        } catch (\Exception $e) {}

        // Use the active restaurant from the request context (merged by RestaurantScope middleware)
        // or fallback to the current user's default restaurant
        $activeRestaurantId = (int) ($request->restaurant_id ?? $currentUser->restaurant_id);

        if ((int) $user->restaurant_id !== $activeRestaurantId) {
            abort(403, 'Sin permisos para este usuario (Sucursal no coincide)');
        }
    }
}
