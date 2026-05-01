<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id', 'product_id', 'product_variant_id',
        'quantity', 'unit_price', 'subtotal', 'notes', 'status', 'promotion_type',
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

    public function billedQuantity(): int
    {
        if ($this->promotion_type === '2x1') {
            return (int) ceil($this->quantity / 2);
        }
        if ($this->promotion_type === '3x2') {
            return (int) ceil($this->quantity * 2 / 3);
        }
        return $this->quantity;
    }

    public function getBilledQuantityAttribute(): int
    {
        return $this->billedQuantity();
    }
}
