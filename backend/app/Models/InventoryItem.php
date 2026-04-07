<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryItem extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'restaurant_id', 'name', 'category', 'unit', 'item_type',
        'product_id', 'current_stock', 'min_stock', 'cost_per_unit',
        'notes', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'current_stock' => 'decimal:3',
            'min_stock'     => 'decimal:3',
            'cost_per_unit' => 'decimal:2',
            'is_active'     => 'boolean',
        ];
    }

    // ── Relationships ──────────────────────────────────
    public function restaurant()   { return $this->belongsTo(Restaurant::class); }
    public function product()      { return $this->belongsTo(Product::class); }
    public function movements()    { return $this->hasMany(InventoryMovement::class); }

    // ── Scopes ─────────────────────────────────────────
    public function scopeForRestaurant($q, $id) { return $q->where('restaurant_id', $id); }
    public function scopeLowStock($q)
    {
        return $q->whereRaw('current_stock <= min_stock AND min_stock > 0');
    }
    public function scopeActive($q) { return $q->where('is_active', true); }

    // ── Helpers ────────────────────────────────────────
    public function isLowStock(): bool
    {
        return $this->min_stock > 0 && $this->current_stock <= $this->min_stock;
    }
}
