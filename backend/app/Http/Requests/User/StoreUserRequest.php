<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['superadmin', 'admin']);
    }

    public function rules(): array
    {
        return [
            'name'          => ['required', 'string', 'max:150'],
            'email'         => ['required', 'email', 'unique:users,email'],
            'password'      => ['required', 'string', 'min:8', 'confirmed'],
            'role'          => ['required', Rule::in(['admin', 'mesero', 'cocina', 'caja'])],
            'restaurant_id'   => ['nullable', 'exists:restaurants,id'],
            'restaurant_ids'  => ['sometimes', 'array'],
            'restaurant_ids.*' => ['exists:restaurants,id'],
            'is_active'       => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique'    => 'Este correo ya está registrado',
            'password.min'    => 'La contraseña debe tener al menos 8 caracteres',
            'password.confirmed' => 'Las contraseñas no coinciden',
            'role.in'         => 'El rol seleccionado no es válido',
        ];
    }
}
