<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Definir permisos por módulo
        $permissions = [
            // Restaurantes
            'restaurants.create',
            'restaurants.read',
            'restaurants.update',
            'restaurants.delete',
            
            // Usuarios
            'users.create',
            'users.read',
            'users.update',
            'users.delete',
            
            // Productos
            'products.create',
            'products.read',
            'products.update',
            'products.delete',
            
            // Mesas
            'tables.create',
            'tables.read',
            'tables.update',
            'tables.delete',
            
            // Órdenes
            'orders.create',
            'orders.read',
            'orders.update',
            'orders.delete',
            'orders.manage_status',
            
            // Pagos
            'payments.create',
            'payments.read',
            'payments.process',
            
            // Caja
            'cash_register.open',
            'cash_register.close',
            'cash_register.view',
            
            // Reportes
            'reports.view',
            'reports.export',
        ];

        // Crear permisos
        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web'
            ]);
        }

        // Asignar permisos a roles
        $this->assignPermissionsToRoles();

        $this->command->info('Permisos creados y asignados exitosamente');
    }

    private function assignPermissionsToRoles(): void
    {
        // Superadmin: todos los permisos
        $superadmin = Role::findByName('superadmin');
        $superadmin->givePermissionTo(Permission::all());

        // Admin: gestión del restaurante
        $admin = Role::findByName('admin');
        $admin->givePermissionTo([
            'users.create', 'users.read', 'users.update', 'users.delete',
            'products.create', 'products.read', 'products.update', 'products.delete',
            'tables.create', 'tables.read', 'tables.update', 'tables.delete',
            'orders.read', 'orders.update',
            'payments.read',
            'cash_register.view',
            'reports.view', 'reports.export',
        ]);

        // Mesero: manejo de órdenes y mesas
        $mesero = Role::findByName('mesero');
        $mesero->givePermissionTo([
            'tables.read', 'tables.update',
            'orders.create', 'orders.read', 'orders.update',
            'products.read',
        ]);

        // Cocina: ver y actualizar órdenes
        $cocina = Role::findByName('cocina');
        $cocina->givePermissionTo([
            'orders.read', 'orders.manage_status',
        ]);

        // Caja: procesar pagos y cortes
        $caja = Role::findByName('caja');
        $caja->givePermissionTo([
            'orders.read',
            'payments.create', 'payments.read', 'payments.process',
            'cash_register.open', 'cash_register.close', 'cash_register.view',
        ]);
    }
}
