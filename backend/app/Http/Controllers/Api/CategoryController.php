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
            ->forRestaurant($restaurantId)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => CategoryResource::collection($categories)]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string',
            'image'       => 'nullable|string',
            'sort_order'  => 'sometimes|integer|min:0',
        ]);

        $restaurantId = $request->get('restaurant_id');

        // Ensure unique slug within restaurant
        $slug = Str::slug($request->name);
        $exists = Category::forRestaurant($restaurantId)->where('slug', $slug)->exists();
        if ($exists) {
            $slug = $slug . '-' . time();
        }

        $category = Category::create([
            'restaurant_id' => $restaurantId,
            'name'          => $request->name,
            'slug'          => $slug,
            'description'   => $request->description,
            'image'         => $request->image,
            'sort_order'    => $request->sort_order ?? 0,
            'is_active'     => true,
        ]);

        return response()->json([
            'message' => 'Categoría creada',
            'data'    => new CategoryResource($category),
        ], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $this->authorizeTenant($request, $category->restaurant_id);

        $request->validate([
            'name'        => 'sometimes|string|max:100',
            'description' => 'sometimes|nullable|string',
            'sort_order'  => 'sometimes|integer|min:0',
            'is_active'   => 'sometimes|boolean',
        ]);

        $category->update($request->only(['name', 'description', 'sort_order', 'is_active']));

        return response()->json([
            'message' => 'Categoría actualizada',
            'data'    => new CategoryResource($category),
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
        if (!$user->hasRole('superadmin') && $user->restaurant_id !== $restaurantId) {
            abort(403, 'Sin permisos');
        }
    }
}
