<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    protected $fillable = [
        'restaurant_id',
        'plan_id',
        'starts_at',
        'ends_at',
        'status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'date',
            'ends_at' => 'date',
            'metadata' => 'array',
        ];
    }

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active')
                    ->where('ends_at', '>=', now()->toDateString());
    }

    public function isActive(): bool
    {
        return $this->status === 'active' && $this->ends_at >= now()->toDateString();
    }
}
