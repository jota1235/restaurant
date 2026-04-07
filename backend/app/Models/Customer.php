<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $fillable = [
        'restaurant_id',
        'name',
        'phone',
        'notes',
    ];

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(CustomerAddress::class)->orderByDesc('is_default');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function defaultAddress(): BelongsTo|HasMany
    {
        return $this->hasMany(CustomerAddress::class)->where('is_default', true)->limit(1);
    }
}
