<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Ejecutar seeders de roles y permisos
        $this->call([
            RoleSeeder::class,
            PermissionSeeder::class,
            TestDataSeeder::class,
        ]);

        $this->command->info('Seeders ejecutados exitosamente');
    }
}
