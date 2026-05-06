<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\DB;

try {
    echo "--- Reparando Guards de Roles y Permisos ---\n";
    
    // 1. Actualizar roles a guard_name = 'web'
    $updatedRoles = DB::table('roles')->update(['guard_name' => 'web']);
    echo "Roles actualizados: $updatedRoles\n";

    // 2. Actualizar permisos a guard_name = 'web'
    $updatedPermissions = DB::table('permissions')->update(['guard_name' => 'web']);
    echo "Permisos actualizados: $updatedPermissions\n";

    // 3. Limpiar caché de Spatie
    app()->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    echo "Caché de permisos limpiada.\n";

    echo "\n--- Resumen Final ---\n";
    $roles = Role::all();
    foreach ($roles as $role) {
        echo "Rol: {$role->name} | Guard: {$role->guard_name}\n";
    }

    echo "\n✅ Reparación completada exitosamente.\n";

} catch (\Exception $e) {
    echo "❌ Error durante la reparación: " . $e->getMessage() . "\n";
}
