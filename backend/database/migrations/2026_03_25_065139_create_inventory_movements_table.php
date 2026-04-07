<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained('restaurants')->cascadeOnDelete();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->enum('type', ['entrada', 'salida', 'ajuste']);
            $table->decimal('quantity', 10, 3); // Positive for entrada, negative handled in model
            $table->decimal('stock_before', 10, 3)->default(0);
            $table->decimal('stock_after', 10, 3)->default(0);
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['restaurant_id', 'inventory_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
    }
};
