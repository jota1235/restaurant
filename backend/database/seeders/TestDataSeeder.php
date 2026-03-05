<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\Restaurant;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Plan
        $plan = Plan::firstOrCreate(
            ['name' => 'Pro'],
            [
                'description'   => 'Plan profesional',
                'price'         => 299.00,
                'max_users'     => 20,
                'max_branches'  => 5,
                'is_active'     => true,
            ]
        );

        // 2. Restaurante
        $restaurant = Restaurant::firstOrCreate(
            ['slug' => 'taqueria-demo'],
            [
                'name'      => 'Taquería El Demo',
                'email'     => 'contacto@taqueria.com',
                'phone'     => '555-1234',
                'address'   => 'Av. Principal 123',
                'city'      => 'Guadalajara',
                'state'     => 'Jalisco',
                'country'   => 'México',
                'is_active' => true,
            ]
        );

        // 3. Suscripción activa
        Subscription::firstOrCreate(
            ['restaurant_id' => $restaurant->id],
            [
                'plan_id'    => $plan->id,
                'starts_at'  => now(),
                'ends_at'    => now()->addYear(),
                'status'     => 'active',
            ]
        );

        // 4. Usuarios de prueba
        $users = [
            [
                'name'      => 'Super Admin',
                'email'     => 'superadmin@pos.com',
                'password'  => Hash::make('password'),
                'role'      => 'superadmin',
            ],
            [
                'name'      => 'Admin Restaurante',
                'email'     => 'admin@pos.com',
                'password'  => Hash::make('password'),
                'role'      => 'admin',
            ],
            [
                'name'      => 'Mesero Juan',
                'email'     => 'mesero@pos.com',
                'password'  => Hash::make('password'),
                'role'      => 'mesero',
            ],
            [
                'name'      => 'Chef María',
                'email'     => 'cocina@pos.com',
                'password'  => Hash::make('password'),
                'role'      => 'cocina',
            ],
            [
                'name'      => 'Cajero Pedro',
                'email'     => 'caja@pos.com',
                'password'  => Hash::make('password'),
                'role'      => 'caja',
            ],
        ];

        foreach ($users as $userData) {
            $role = $userData['role'];
            unset($userData['role']);

            $user = User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    ...$userData,
                    'restaurant_id' => $restaurant->id,
                    'is_active'     => true,
                ]
            );

            $user->syncRoles([$role]);
        }

        $this->command->info('✅ Datos de prueba creados');
        $this->command->table(
            ['Rol', 'Email', 'Contraseña'],
            [
                ['superadmin', 'superadmin@pos.com', 'password'],
                ['admin',      'admin@pos.com',      'password'],
                ['mesero',     'mesero@pos.com',     'password'],
                ['cocina',     'cocina@pos.com',     'password'],
                ['caja',       'caja@pos.com',       'password'],
            ]
        );
    }
}
