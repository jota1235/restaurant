<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'is_active' => $this->is_active,
            'restaurant_id' => $this->restaurant_id,
            'restaurant' => $this->whenLoaded('restaurant', function () {
                return [
                    'id' => $this->restaurant->id,
                    'name' => $this->restaurant->name,
                    'slug' => $this->restaurant->slug,
                    'is_active' => $this->restaurant->is_active,
                    'subscription' => $this->whenLoaded('restaurant.subscription', function () {
                        return [
                            'status' => $this->restaurant->subscription->status,
                            'ends_at' => $this->restaurant->subscription->ends_at?->format('Y-m-d'),
                            'plan' => $this->whenLoaded('restaurant.subscription.plan', function () {
                                return [
                                    'name' => $this->restaurant->subscription->plan->name,
                                    'max_users' => $this->restaurant->subscription->plan->max_users,
                                    'max_branches' => $this->restaurant->subscription->plan->max_branches,
                                ];
                            }),
                        ];
                    }),
                ];
            }),
            'roles' => $this->whenLoaded('roles', function () {
                return $this->roles->pluck('name');
            }),
            'permissions' => $this->whenLoaded('permissions', function () {
                return $this->permissions->pluck('name');
            }),
            'restaurant_ids' => $this->whenLoaded('restaurants', function () {
                return $this->restaurants->pluck('id')->map(fn($id) => (int) $id)->values();
            }, fn() => $this->restaurants()->pluck('restaurants.id')->map(fn($id) => (int) $id)->values()),
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
        ];
    }
}
