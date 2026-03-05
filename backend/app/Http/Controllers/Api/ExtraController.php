<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Extra;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExtraController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $restaurantId = $request->get('restaurant_id');

        $extras = Extra::forRestaurant($restaurantId)
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $extras,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'  => 'required|string|max:100',
            'price' => 'required|numeric|min:0',
        ]);

        $extra = Extra::create([
            'restaurant_id' => $request->get('restaurant_id'),
            'name'          => $request->name,
            'price'         => $request->price,
            'is_active'     => true,
        ]);

        return response()->json([
            'message' => 'Extra creado',
            'data'    => $extra,
        ], 201);
    }

    public function update(Request $request, Extra $extra): JsonResponse
    {
        $request->validate([
            'name'      => 'sometimes|string|max:100',
            'price'     => 'sometimes|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $extra->update($request->only(['name', 'price', 'is_active']));

        return response()->json([
            'message' => 'Extra actualizado',
            'data'    => $extra,
        ]);
    }

    public function destroy(Extra $extra): JsonResponse
    {
        $extra->delete();

        return response()->json(['message' => 'Extra eliminado']);
    }
}
