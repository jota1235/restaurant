<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained('restaurants')->cascadeOnDelete();
            $table->string('name');
            $table->string('category')->nullable(); // e.g. "Carnes", "Verduras", "Lácteos"
            $table->string('unit')->default('pieza'); // kg, lt, pieza, caja, etc.
            $table->string('item_type')->default('ingredient'); // ingredient | menu_product
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete(); // Link a menu product if item_type=menu_product
            $table->decimal('current_stock', 10, 3)->default(0);
            $table->decimal('min_stock', 10, 3)->default(0);  // Alert threshold
            $table->decimal('cost_per_unit', 10, 2)->default(0);
            $table->string('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['restaurant_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
