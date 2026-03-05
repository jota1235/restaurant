<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurant_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('restaurant_id')->constrained()->onDelete('cascade');
            $table->string('role')->nullable(); // role override per branch
            $table->timestamps();

            $table->unique(['user_id', 'restaurant_id']);
        });

        // Migrate existing users into the pivot table
        $users = DB::table('users')->whereNotNull('restaurant_id')->get();
        foreach ($users as $user) {
            // Get the user's primary role from spatie
            $role = DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $user->id)
                ->where('model_has_roles.model_type', 'App\\Models\\User')
                ->value('roles.name');

            DB::table('restaurant_user')->insert([
                'user_id' => $user->id,
                'restaurant_id' => $user->restaurant_id,
                'role' => $role,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_user');
    }
};
