<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('restaurant.{restaurantId}', function ($user, $restaurantId) {
    return (int) $user->restaurant_id === (int) $restaurantId;
});

// Private channel for each cook — only the cook themselves can subscribe
Broadcast::channel('cook.{cookId}', function ($user, $cookId) {
    return (int) $user->id === (int) $cookId && $user->hasRole('cocina');
});
