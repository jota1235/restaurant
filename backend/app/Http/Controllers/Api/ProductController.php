<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $restaurantId = $request->get('restaurant_id');

        $products = Product::with(['category', 'variants', 'extras'])
            ->forRestaurant($restaurantId)
            ->when($request->category_id, fn($q) => $q->where('category_id', $request->category_id))
            ->when($request->search, fn($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->available, fn($q) => $q->available())
            ->orderBy('category_id')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(50);

        return response()->json([
            'data' => ProductResource::collection($products),
            'meta' => [
                'total'        => $products->total(),
                'current_page' => $products->currentPage(),
                'last_page'    => $products->lastPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'category_id'  => 'required|exists:categories,id',
            'name'         => 'required|string|max:150',
            'description'  => 'nullable|string',
            'price'        => 'required|numeric|min:0',
            'sort_order'   => 'sometimes|integer|min:0',
            'is_available' => 'sometimes',
            'image'        => 'nullable|image|max:2048',
            'variants'     => 'sometimes|array',
            'variants.*.name'           => 'required|string|max:100',
            'variants.*.price_modifier' => 'required|numeric',
            'extras'       => 'sometimes|array',
            'extras.*'     => 'exists:extras,id',
        ]);

        $restaurantId = $request->get('restaurant_id');

        $slug = Str::slug($request->name);
        if (Product::forRestaurant($restaurantId)->where('slug', $slug)->exists()) {
            $slug = $slug . '-' . time();
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
        }

        $product = Product::create([
            'restaurant_id' => $restaurantId,
            'category_id'   => $request->category_id,
            'name'          => $request->name,
            'slug'          => $slug,
            'description'   => $request->description,
            'price'         => $request->price,
            'image'         => $imagePath,
            'sort_order'    => $request->sort_order ?? 0,
            'is_available'  => $request->boolean('is_available', true),
            'is_active'     => true,
        ]);

        // Crear variantes
        if ($request->variants) {
            $variants = is_string($request->variants) ? json_decode($request->variants, true) : $request->variants;
            foreach ($variants as $variantData) {
                $product->variants()->create($variantData);
            }
        }

        // Asociar extras
        if ($request->extras) {
            $extras = is_string($request->extras) ? json_decode($request->extras, true) : $request->extras;
            $product->extras()->sync($extras);
        }

        AuditLogger::log(
            'product.created',
            "Producto creado: {$product->name} (Precio: \$" . number_format($product->price, 2) . ")",
            ['product_id' => $product->id, 'price' => $product->price],
            $product
        );

        return response()->json([
            'message' => 'Producto creado',
            'data'    => new ProductResource($product->load(['category', 'variants', 'extras'])),
        ], 201);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        $this->authorizeTenant($request, $product->restaurant_id);

        return response()->json([
            'data' => new ProductResource($product->load(['category', 'variants', 'extras'])),
        ]);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $this->authorizeTenant($request, $product->restaurant_id);

        $request->validate([
            'category_id'  => 'sometimes|exists:categories,id',
            'name'         => 'sometimes|string|max:150',
            'description'  => 'sometimes|nullable|string',
            'price'        => 'sometimes|numeric|min:0',
            'sort_order'   => 'sometimes|integer|min:0',
            'is_available' => 'sometimes',
            'is_active'    => 'sometimes',
            'image'        => 'nullable|image|max:2048',
            'variants'     => 'sometimes',
            'extras'       => 'sometimes',
        ]);

        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            $product->image = $request->file('image')->store('products', 'public');
        }

        $product->update($request->only([
            'category_id', 'name', 'description', 'price',
            'sort_order', 'is_available', 'is_active',
        ]) + ($request->hasFile('image') ? ['image' => $product->image] : []));

        // Reemplazar variantes si se envían
        if ($request->has('variants')) {
            $product->variants()->delete();
            $variants = is_string($request->variants) ? json_decode($request->variants, true) : $request->variants;
            if (is_array($variants)) {
                foreach ($variants as $variantData) {
                    $product->variants()->create($variantData);
                }
            }
        }

        // Sync extras
        if ($request->has('extras')) {
            $extras = is_string($request->extras) ? json_decode($request->extras, true) : $request->extras;
            if (is_array($extras)) {
                $product->extras()->sync($extras);
            }
        }

        AuditLogger::log(
            'product.updated',
            "Producto actualizado: {$product->name}",
            ['product_id' => $product->id, 'changes' => $request->only(['name', 'price', 'is_available', 'is_active'])],
            $product
        );

        return response()->json([
            'message' => 'Producto actualizado',
            'data'    => new ProductResource($product->load(['category', 'variants', 'extras'])),
        ]);
    }

    public function toggleAvailability(Request $request, Product $product): JsonResponse
    {
        $this->authorizeTenant($request, $product->restaurant_id);
        $product->update(['is_available' => !$product->is_available]);

        return response()->json([
            'message'      => $product->is_available ? 'Producto disponible' : 'Producto no disponible',
            'is_available' => $product->is_available,
        ]);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $this->authorizeTenant($request, $product->restaurant_id);
        $product->delete();

        AuditLogger::log(
            'product.deleted',
            "Producto eliminado: {$product->name}",
            ['product_id' => $product->id, 'name' => $product->name]
        );

        return response()->json(['message' => 'Producto eliminado']);
    }

    private function authorizeTenant(Request $request, int $restaurantId): void
    {
        $user = $request->user();
        if (!$user->hasRole('superadmin') && $user->restaurant_id !== $restaurantId) {
            abort(403, 'Sin permisos');
        }
    }
}
