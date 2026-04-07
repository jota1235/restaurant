<?php

namespace App\Http\Requests\Restaurant;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRestaurantRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $restaurant = $this->route('restaurant');
        return $user->hasRole('superadmin') || $user->restaurant_id === $restaurant->id;
    }

    public function rules(): array
    {
        $restaurantId = $this->route('restaurant')->id;

        return [
            'name'     => ['sometimes', 'string', 'max:150'],
            'email'    => ['sometimes', 'nullable', 'email', Rule::unique('restaurants', 'email')->ignore($restaurantId)],
            'phone'    => ['sometimes', 'nullable', 'string', 'max:20'],
            'address'  => ['sometimes', 'nullable', 'string', 'max:255'],
            'city'     => ['sometimes', 'nullable', 'string', 'max:100'],
            'state'    => ['sometimes', 'nullable', 'string', 'max:100'],
            'country'  => ['sometimes', 'nullable', 'string', 'max:100'],
            'tax_rate' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:1'],
            'logo'     => ['sometimes', 'nullable', 'string'], // base64 data URI
        ];
    }
}
