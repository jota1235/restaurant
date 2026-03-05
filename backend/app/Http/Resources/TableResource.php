<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TableResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'name'       => $this->name,
            'zone'       => $this->zone,
            'capacity'   => $this->capacity,
            'status'     => $this->status,
            'sort_order' => $this->sort_order,
            'is_active'  => $this->is_active,
        ];
    }
}
