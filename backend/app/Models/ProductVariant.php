<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $fillable = ['product_id', 'name', 'price_modifier', 'is_active'];

    protected function casts(): array
    {
        return [
            'price_modifier' => 'decimal:2',
            'is_active'      => 'boolean',
        ];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
