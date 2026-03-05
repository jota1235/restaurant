<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['superadmin', 'admin']);
    }

    public function rules(): array
    {
        $userId = $this->route('user')->id;

        return [
            'name'      => ['sometimes', 'string', 'max:150'],
            'email'     => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($userId)],
            'password'  => ['sometimes', 'nullable', 'string', 'min:8', 'confirmed'],
            'role'      => ['sometimes', Rule::in(['admin', 'mesero', 'cocina', 'caja'])],
            'restaurant_ids'  => ['sometimes', 'array'],
            'restaurant_ids.*' => ['exists:restaurants,id'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
