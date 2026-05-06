<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable;
    
    protected $guard_name = 'web';


    protected $fillable = [
        'name',
        'email',
        'password',
        'restaurant_id',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Primary restaurant (default)
     */
    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    /**
     * All restaurants this user can access (multi-branch)
     */
    public function restaurants()
    {
        return $this->belongsToMany(Restaurant::class, 'restaurant_user')
                    ->withPivot('role')
                    ->withTimestamps();
    }

    /**
     * Check if user can access a specific restaurant
     */
    public function canAccessRestaurant(int $restaurantId): bool
    {
        // Superadmin can access everything
        if ($this->hasRole('superadmin')) {
            return true;
        }

        // Check pivot table first
        if ($this->restaurants()->where('restaurants.id', $restaurantId)->exists()) {
            return true;
        }

        // Fallback: check user's own restaurant_id column
        return $this->restaurant_id === $restaurantId;
    }
}
