<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'slug'         => $this->slug,
            'description'  => $this->description,
            'image'        => $this->image ? asset('storage/' . $this->image) : null,
            'price'        => (float) $this->price,
            'sort_order'   => $this->sort_order,
            'is_available' => $this->is_available,
            'is_active'    => $this->is_active,
            'category'     => $this->whenLoaded('category', fn() => [
                'id'   => $this->category->id,
                'name' => $this->category->name,
            ]),
            'variants' => $this->whenLoaded('variants', function () {
                return $this->variants->map(fn($v) => [
                    'id'             => $v->id,
                    'name'           => $v->name,
                    'price_modifier' => (float) $v->price_modifier,
                    'is_open_price'  => (bool) $v->is_open_price,
                    'is_active'      => $v->is_active,
                ]);
            }),
            'extras' => $this->whenLoaded('extras', function () {
                return $this->extras->map(fn($e) => [
                    'id'    => $e->id,
                    'name'  => $e->name,
                    'price' => (float) $e->price,
                ]);
            }),
            'created_at' => $this->created_at?->format('Y-m-d'),
        ];
    }
}
