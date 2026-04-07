<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeCredit extends Model
{
    protected $fillable = [
        'restaurant_id', 'user_id', 'product_id',
        'product_name', 'product_price', 'quantity', 'total',
        'notes', 'status',
        'paid_at', 'cancelled_at',
        'registered_by', 'approved_by',
        'cash_register_id', 'cash_movement_id',
    ];

    protected function casts(): array
    {
        return [
            'product_price'  => 'decimal:2',
            'quantity'       => 'decimal:3',
            'total'          => 'decimal:2',
            'paid_at'        => 'datetime',
            'cancelled_at'   => 'datetime',
        ];
    }

    // ── Relationships ──────────────────────────────────
    public function user()         { return $this->belongsTo(User::class, 'user_id'); }
    public function product()      { return $this->belongsTo(Product::class); }
    public function registeredBy() { return $this->belongsTo(User::class, 'registered_by'); }
    public function approvedBy()   { return $this->belongsTo(User::class, 'approved_by'); }
    public function cashRegister() { return $this->belongsTo(CashRegister::class); }
    public function cashMovement() { return $this->belongsTo(CashMovement::class); }

    // ── Scopes ─────────────────────────────────────────
    public function scopeForRestaurant($q, $id) { return $q->where('restaurant_id', $id); }
    public function scopePending($q)    { return $q->where('status', 'pending'); }
    public function scopePaid($q)       { return $q->where('status', 'paid'); }
    public function scopeCancelled($q)  { return $q->where('status', 'cancelled'); }
}
