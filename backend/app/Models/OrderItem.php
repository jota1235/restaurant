<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id', 'product_id', 'product_variant_id',
        'quantity', 'unit_price', 'subtotal', 'notes', 'status',
    ];

    protected function casts(): array
    {
        return [
            'unit_price' => 'decimal:2',
            'subtotal'   => 'decimal:2',
            'quantity'   => 'integer',
        ];
    }

    public function order()          { return $this->belongsTo(Order::class); }
    public function product()        { return $this->belongsTo(Product::class); }
    public function variant()        { return $this->belongsTo(ProductVariant::class, 'product_variant_id'); }
    public function extras()         { return $this->hasMany(OrderItemExtra::class); }
}
