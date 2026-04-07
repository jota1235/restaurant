<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Crear roles del sistema
        $roles = [
            [
                'name' => 'superadmin',
                'guard_name' => 'web',
            ],
            [
                'name' => 'admin',
                'guard_name' => 'web',
            ],
            [
                'name' => 'mesero',
                'guard_name' => 'web',
            ],
            [
                'name' => 'cocina',
                'guard_name' => 'web',
            ],
            [
                'name' => 'caja',
                'guard_name' => 'web',
            ],
            [
                'name' => 'almacenista',
                'guard_name' => 'web',
            ],
        ];

        foreach ($roles as $roleData) {
            Role::firstOrCreate(
                ['name' => $roleData['name']],
                $roleData
            );
        }

        $this->command->info('Roles creados exitosamente');
    }
}
