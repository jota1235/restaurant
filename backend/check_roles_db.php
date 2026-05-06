<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

try {
    $roles = DB::table('roles')->get();
    echo "Count: " . count($roles) . "\n";
    foreach ($roles as $role) {
        echo "Name: {$role->name} | Guard: {$role->guard_name}\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
