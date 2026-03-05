<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

try {
    $count = User::count();
    echo "Total users: $count\n";
    $users = User::all();
    foreach ($users as $u) {
        echo "Email: {$u->email} | Active: " . ($u->is_active ? 'Yes' : 'No') . "\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
