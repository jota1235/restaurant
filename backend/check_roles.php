<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\DB;

try {
    echo "--- Roles ---\n";
    $roles = Role::all();
    foreach ($roles as $role) {
        echo "ID: {$role->id} | Name: {$role->name} | Guard: {$role->guard_name}\n";
    }

    echo "\n--- Permissions (first 10) ---\n";
    $permissions = Permission::limit(10)->get();
    foreach ($permissions as $permission) {
        echo "ID: {$permission->id} | Name: {$permission->name} | Guard: {$permission->guard_name}\n";
    }

    echo "\n--- Auth Guards Config ---\n";
    print_r(config('auth.guards'));

    echo "\n--- Default Guard ---\n";
    echo config('auth.defaults.guard') . "\n";

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
