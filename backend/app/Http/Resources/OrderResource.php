<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'order_number'  => $this->order_number,
            'status'        => $this->status,
            'type'          => $this->type,
            'customer_name' => $this->customer_name,
            'notes'         => $this->notes,
            'subtotal'      => (float) $this->subtotal,
            'tax'           => (float) $this->tax,
            'discount'      => (float) $this->discount,
            'total'         => (float) $this->total,
            'table'         => $this->whenLoaded('table', fn() => [
                'id'   => $this->table->id,
                'name' => $this->table->name,
                'zone' => $this->table->zone,
            ]),
            'user' => $this->whenLoaded('user', fn() => [
                'id'   => $this->user->id,
                'name' => $this->user->name,
            ]),
            'items' => $this->whenLoaded('items', function () {
                return $this->items->map(fn($item) => [
                    'id'         => $item->id,
                    'status'     => $item->status,
                    'quantity'   => $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'subtotal'   => (float) $item->subtotal,
                    'notes'      => $item->notes,
                    'product'    => $item->relationLoaded('product') ? [
                        'id'   => $item->product->id,
                        'name' => $item->product->name,
                    ] : null,
                    'variant' => $item->relationLoaded('variant') && $item->variant ? [
                        'id'   => $item->variant->id,
                        'name' => $item->variant->name,
                    ] : null,
                    'extras' => $item->relationLoaded('extras')
                        ? $item->extras->map(fn($e) => [
                            'id'       => $e->extra_id,
                            'name'     => $e->relationLoaded('extra') ? $e->extra->name : null,
                            'price'    => (float) $e->unit_price,
                            'quantity' => $e->quantity,
                            'subtotal' => (float) $e->subtotal,
                        ])
                        : [],
                ]);
            }),
            'confirmed_at' => $this->confirmed_at?->format('H:i'),
            'ready_at'     => $this->ready_at?->format('H:i'),
            'paid_at'      => $this->paid_at?->format('H:i'),
            'created_at'   => $this->created_at?->format('H:i'),
        ];
    }
}
