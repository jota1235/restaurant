<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TableResource;
use App\Models\Table;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TableController extends Controller
{
    /**
     * Listar mesas con conteo por estado (útil para el mapa)
     */
    public function index(Request $request): JsonResponse
    {
        $restaurantId = $request->get('restaurant_id');

        $tables = Table::forRestaurant($restaurantId)
            ->when($request->zone, fn($q) => $q->where('zone', $request->zone))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        // Summary stats
        $stats = [
            'available' => $tables->where('status', 'available')->count(),
            'occupied'  => $tables->where('status', 'occupied')->count(),
            'reserved'  => $tables->where('status', 'reserved')->count(),
            'disabled'  => $tables->where('status', 'disabled')->count(),
            'total'     => $tables->where('is_active', true)->count(),
        ];

        return response()->json([
            'data'  => TableResource::collection($tables),
            'stats' => $stats,
        ]);
    }

    /**
     * Crear mesa (admin)
     */
    public function store(Request $request): JsonResponse
    {
        $restaurantId = $request->get('restaurant_id');

        $request->validate([
            'name'       => ['required', 'string', 'max:50',
                Rule::unique('tables')->where('restaurant_id', $restaurantId)],
            'zone'       => ['nullable', 'string', 'max:80'],
            'capacity'   => ['sometimes', 'integer', 'min:1', 'max:50'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $table = Table::create([
            'restaurant_id' => $restaurantId,
            'name'          => $request->name,
            'zone'          => $request->zone,
            'capacity'      => $request->capacity ?? 4,
            'sort_order'    => $request->sort_order ?? 0,
            'status'        => 'available',
            'is_active'     => true,
        ]);

        return response()->json([
            'message' => 'Mesa creada',
            'data'    => new TableResource($table),
        ], 201);
    }

    /**
     * Actualizar mesa (admin)
     */
    public function update(Request $request, Table $table): JsonResponse
    {
        $this->authorizeTenant($request, $table->restaurant_id);

        $request->validate([
            'name'       => ['sometimes', 'string', 'max:50',
                Rule::unique('tables')->where('restaurant_id', $table->restaurant_id)->ignore($table->id)],
            'zone'       => ['sometimes', 'nullable', 'string', 'max:80'],
            'capacity'   => ['sometimes', 'integer', 'min:1', 'max:50'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active'  => ['sometimes', 'boolean'],
        ]);

        $table->update($request->only(['name', 'zone', 'capacity', 'sort_order', 'is_active']));

        return response()->json([
            'message' => 'Mesa actualizada',
            'data'    => new TableResource($table),
        ]);
    }

    /**
     * Cambiar estado de mesa (mesero, admin)
     * available → occupied → available, or → reserved
     */
    public function changeStatus(Request $request, Table $table): JsonResponse
    {
        $this->authorizeTenant($request, $table->restaurant_id);

        $request->validate([
            'status' => ['required', Rule::in(['available', 'occupied', 'reserved', 'disabled'])],
        ]);

        $table->update(['status' => $request->status]);

        return response()->json([
            'message' => 'Estado actualizado',
            'data'    => new TableResource($table),
        ]);
    }

    /**
     * Eliminar mesa (solo admin)
     */
    public function destroy(Request $request, Table $table): JsonResponse
    {
        $this->authorizeTenant($request, $table->restaurant_id);

        if ($table->status === 'occupied') {
            return response()->json(['message' => 'No se puede eliminar una mesa ocupada'], 422);
        }

        $table->delete();

        return response()->json(['message' => 'Mesa eliminada']);
    }

    private function authorizeTenant(Request $request, int $restaurantId): void
    {
        $user = $request->user();
        if (!$user->hasRole('superadmin') && $user->restaurant_id !== $restaurantId) {
            abort(403, 'Sin permisos');
        }
    }
}
