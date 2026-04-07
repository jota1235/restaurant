<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryMovement extends Model
{
    protected $fillable = [
        'restaurant_id', 'inventory_item_id', 'user_id',
        'type', 'quantity', 'stock_before', 'stock_after', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity'     => 'decimal:3',
            'stock_before' => 'decimal:3',
            'stock_after'  => 'decimal:3',
        ];
    }

    // ── Relationships ──────────────────────────────────
    public function item() { return $this->belongsTo(InventoryItem::class, 'inventory_item_id'); }
    public function user() { return $this->belongsTo(User::class); }
}
