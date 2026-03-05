<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use SoftDeletes;

    // Status lifecycle constants
    const STATUS_PENDING   = 'pending';
    const STATUS_CONFIRMED = 'confirmed';
    const STATUS_READY     = 'ready';
    const STATUS_DELIVERED = 'delivered';
    const STATUS_PAID      = 'paid';
    const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'restaurant_id', 'table_id', 'user_id',
        'order_number', 'status', 'type',
        'customer_name', 'notes',
        'subtotal', 'tax', 'discount', 'total',
        'confirmed_at', 'ready_at', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'subtotal'     => 'decimal:2',
            'tax'          => 'decimal:2',
            'discount'     => 'decimal:2',
            'total'        => 'decimal:2',
            'confirmed_at' => 'datetime',
            'ready_at'     => 'datetime',
            'paid_at'      => 'datetime',
        ];
    }

    // ── Relationships ──────────────────────────────────
    public function restaurant() { return $this->belongsTo(Restaurant::class); }
    public function table()      { return $this->belongsTo(Table::class); }
    public function user()       { return $this->belongsTo(User::class); }
    public function items()      { return $this->hasMany(OrderItem::class); }

    // ── Scopes ─────────────────────────────────────────
    public function scopeForRestaurant($q, int $id) { return $q->where('restaurant_id', $id); }
    public function scopeActive($q)
    {
        return $q->whereNotIn('status', [self::STATUS_PAID, self::STATUS_CANCELLED]);
    }

    // ── Helpers ────────────────────────────────────────
    public function recalculate(): void
    {
        $subtotal = $this->items()->sum('subtotal');
        $tax      = round($subtotal * 0.16, 2); // IVA 16%
        $this->update([
            'subtotal' => $subtotal,
            'tax'      => $tax,
            'total'    => $subtotal + $tax - $this->discount,
        ]);
    }

    /**
     * Genera el siguiente número de orden para el restaurante (reinicia a 1 diariamente)
     */
    public static function nextOrderNumber(int $restaurantId): string
    {
        $lastNumber = self::withTrashed()
            ->where('restaurant_id', $restaurantId)
            ->whereDate('created_at', today())
            ->max('order_number');

        if ($lastNumber) {
            $num = (int) str_replace('#', '', $lastNumber);
            return '#' . str_pad($num + 1, 3, '0', STR_PAD_LEFT);
        }

        return '#001';
    }
}
