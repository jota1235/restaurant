<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Restaurant;

$user = User::where('email', 'superadmin@pos.com')->first();
if ($user) {
    $user->assignRole('superadmin');
    echo "Rol superadmin asignado a: " . $user->email . "\n";
} else {
    echo "Usuario no encontrado.\n";
}

echo "Total de restaurantes: " . Restaurant::count() . "\n";
