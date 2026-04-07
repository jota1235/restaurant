<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $restaurantId = $request->get('restaurant_id');

        $categories = Category::withCount('products')
            ->with('assignedCook:id,name')
            ->forRestaurant($restaurantId)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => CategoryResource::collection($categories)]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'             => 'required|string|max:100',
            'description'      => 'nullable|string',
            'image'            => 'nullable|string',
            'sort_order'       => 'sometimes|integer|min:0',
            'assigned_cook_id' => 'nullable|exists:users,id',
        ]);

        $restaurantId = $request->get('restaurant_id');

        // Ensure unique slug within restaurant
        $slug = Str::slug($request->name);
        $exists = Category::forRestaurant($restaurantId)->where('slug', $slug)->exists();
        if ($exists) {
            $slug = $slug . '-' . time();
        }

        $category = Category::create([
            'restaurant_id'    => $restaurantId,
            'name'             => $request->name,
            'slug'             => $slug,
            'description'      => $request->description,
            'image'            => $request->image,
            'sort_order'       => $request->sort_order ?? 0,
            'is_active'        => true,
            'assigned_cook_id' => $request->assigned_cook_id,
        ]);

        return response()->json([
            'message' => 'Categoría creada',
            'data'    => new CategoryResource($category->load('assignedCook')),
        ], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $this->authorizeTenant($request, $category->restaurant_id);

        $request->validate([
            'name'             => 'sometimes|string|max:100',
            'description'      => 'sometimes|nullable|string',
            'sort_order'       => 'sometimes|integer|min:0',
            'is_active'        => 'sometimes|boolean',
            'assigned_cook_id' => 'sometimes|nullable|exists:users,id',
        ]);

        $data = $request->only(['name', 'description', 'sort_order', 'is_active']);

        // Allow explicitly unsetting the cook (null = no cook assigned)
        if ($request->has('assigned_cook_id')) {
            $data['assigned_cook_id'] = $request->assigned_cook_id;
        }

        $category->update($data);

        return response()->json([
            'message' => 'Categoría actualizada',
            'data'    => new CategoryResource($category->load('assignedCook')),
        ]);
    }

    public function destroy(Request $request, Category $category): JsonResponse
    {
        $this->authorizeTenant($request, $category->restaurant_id);

        if ($category->products()->exists()) {
            return response()->json(['message' => 'No puedes eliminar una categoría con productos'], 422);
        }

        $category->delete();
        return response()->json(['message' => 'Categoría eliminada']);
    }

    private function authorizeTenant(Request $request, int $restaurantId): void
    {
        $user = $request->user();
        if ($user->hasRole('superadmin')) return;

        // Use the active restaurant_id set by RestaurantScope middleware
        // (already validated that the user has access to this restaurant)
        $activeRestaurantId = (int) $request->get('restaurant_id');
        if ($activeRestaurantId !== $restaurantId) {
            abort(403, 'Sin permisos');
        }
    }
}
