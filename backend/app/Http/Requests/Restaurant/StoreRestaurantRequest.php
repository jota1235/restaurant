<?php

namespace App\Http\Requests\Restaurant;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRestaurantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('superadmin');
    }

    public function rules(): array
    {
        return [
            'name'             => ['required', 'string', 'max:150'],
            'email'            => ['nullable', 'email', 'unique:restaurants,email'],
            'phone'            => ['nullable', 'string', 'max:20'],
            'whatsapp'         => ['nullable', 'string', 'max:20'],
            'address'          => ['nullable', 'string', 'max:255'],
            'city'             => ['nullable', 'string', 'max:100'],
            'state'            => ['nullable', 'string', 'max:100'],
            'country'          => ['nullable', 'string', 'max:100'],
            'plan_id'          => ['nullable', 'exists:plans,id'],
            'duration_months'  => ['nullable', 'integer', 'min:1', 'max:36'],
            'logo'             => ['nullable', 'string'], // base64 data URI
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'  => 'El nombre del restaurante es obligatorio',
            'email.unique'   => 'Ya existe un restaurante con este correo',
            'plan_id.exists' => 'El plan seleccionado no existe',
        ];
    }
}
