<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    // GET /customers?search=...
    public function index(Request $request): JsonResponse
    {
        $restaurantId = $request->get('restaurant_id');
        $search = $request->search;

        $customers = Customer::with('addresses')
            ->where('restaurant_id', $restaurantId)
            ->when($search, function ($q) use ($search) {
                $q->where(function ($q2) use ($search) {
                    $q2->where('name', 'ilike', "%{$search}%")
                       ->orWhere('phone', 'ilike', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit(20)
            ->get();

        return response()->json(['data' => $customers]);
    }

    // POST /customers
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'                    => 'required|string|max:120',
            'phone'                   => 'nullable|string|max:30',
            'notes'                   => 'nullable|string',
            'address.street'          => 'nullable|string|max:255',
            'address.references'      => 'nullable|string|max:255',
            'address.label'           => 'nullable|string|max:50',
        ]);

        $restaurantId = $request->get('restaurant_id');

        $customer = Customer::create([
            'restaurant_id' => $restaurantId,
            'name'          => $request->name,
            'phone'         => $request->phone,
            'notes'         => $request->notes,
        ]);

        // Create first address if provided
        if ($request->filled('address.street')) {
            $customer->addresses()->create([
                'label'      => $request->input('address.label', 'Casa'),
                'street'     => $request->input('address.street'),
                'references' => $request->input('address.references'),
                'is_default' => true,
            ]);
        }

        return response()->json([
            'message' => 'Cliente creado',
            'data'    => $customer->load('addresses'),
        ], 201);
    }

    // PATCH /customers/{customer}
    public function update(Request $request, Customer $customer): JsonResponse
    {
        $this->authorizeCustomer($request, $customer);

        $request->validate([
            'name'  => 'sometimes|string|max:120',
            'phone' => 'nullable|string|max:30',
            'notes' => 'nullable|string',
        ]);

        $customer->update($request->only(['name', 'phone', 'notes']));

        return response()->json([
            'message' => 'Cliente actualizado',
            'data'    => $customer->load('addresses'),
        ]);
    }

    // POST /customers/{customer}/addresses
    public function addAddress(Request $request, Customer $customer): JsonResponse
    {
        $this->authorizeCustomer($request, $customer);

        $request->validate([
            'street'     => 'required|string|max:255',
            'references' => 'nullable|string|max:255',
            'label'      => 'nullable|string|max:50',
            'is_default' => 'sometimes|boolean',
        ]);

        if ($request->boolean('is_default')) {
            $customer->addresses()->update(['is_default' => false]);
        }

        $address = $customer->addresses()->create([
            'label'      => $request->input('label', 'Casa'),
            'street'     => $request->street,
            'references' => $request->references,
            'is_default' => $request->boolean('is_default', $customer->addresses()->count() === 0),
        ]);

        return response()->json(['message' => 'Dirección agregada', 'data' => $address], 201);
    }

    // PATCH /customers/{customer}/addresses/{address}
    public function updateAddress(Request $request, Customer $customer, CustomerAddress $address): JsonResponse
    {
        $this->authorizeCustomer($request, $customer);
        abort_if($address->customer_id !== $customer->id, 404);

        $request->validate([
            'street'     => 'sometimes|string|max:255',
            'references' => 'nullable|string|max:255',
            'label'      => 'sometimes|string|max:50',
            'is_default' => 'sometimes|boolean',
        ]);

        if ($request->boolean('is_default')) {
            $customer->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
        }

        $address->update($request->only(['street', 'references', 'label', 'is_default']));

        return response()->json(['message' => 'Dirección actualizada', 'data' => $address]);
    }

    // DELETE /customers/{customer}/addresses/{address}
    public function deleteAddress(Request $request, Customer $customer, CustomerAddress $address): JsonResponse
    {
        $this->authorizeCustomer($request, $customer);
        abort_if($address->customer_id !== $customer->id, 404);

        $address->delete();

        // Set another address as default if needed
        if ($address->is_default) {
            $customer->addresses()->first()?->update(['is_default' => true]);
        }

        return response()->json(['message' => 'Dirección eliminada']);
    }

    private function authorizeCustomer(Request $request, Customer $customer): void
    {
        $user = $request->user();
        if (!$user->hasRole('superadmin') && $customer->restaurant_id !== (int) $request->get('restaurant_id')) {
            abort(403, 'Sin permisos');
        }
    }
}
