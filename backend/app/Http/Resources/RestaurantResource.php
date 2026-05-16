<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RestaurantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'name'       => $this->name,
            'slug'       => $this->slug,
            'email'      => $this->email,
            'phone'      => $this->phone,
            'address'    => $this->address,
            'city'       => $this->city,
            'state'      => $this->state,
            'country'    => $this->country,
            'is_active'  => $this->is_active,
            'users_count' => max((int)($this->users_count ?? 0), (int)($this->members_count ?? 0)),
            'subscription' => $this->whenLoaded('subscription', function () {
                return [
                    'status'  => $this->subscription?->status,
                    'ends_at' => $this->subscription?->ends_at?->format('Y-m-d'),
                    'plan'    => $this->whenLoaded('subscription.plan', function () {
                        return [
                            'id'           => $this->subscription->plan->id,
                            'name'         => $this->subscription->plan->name,
                            'max_users'    => $this->subscription->plan->max_users,
                            'max_branches' => $this->subscription->plan->max_branches,
                        ];
                    }),
                ];
            }),
            'tax_rate'   => (float) $this->tax_rate,
            'logo'       => $this->logo,
            'whatsapp'   => $this->whatsapp,
            'created_at' => $this->created_at?->format('Y-m-d'),
        ];
    }
}
