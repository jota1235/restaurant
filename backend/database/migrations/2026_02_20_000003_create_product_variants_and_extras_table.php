<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);       // Ej: "Tamaño Grande", "Sin picante"
            $table->decimal('price_modifier', 8, 2)->default(0); // +/- al precio base
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('product_id');
        });

        Schema::create('extras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);       // Ej: "Guacamole", "Chile"
            $table->decimal('price', 8, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('restaurant_id');
        });

        // Tabla pivot: producto ↔ extra (qué extras aplican a qué productos)
        Schema::create('product_extra', function (Blueprint $table) {
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('extra_id')->constrained()->cascadeOnDelete();
            $table->primary(['product_id', 'extra_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_extra');
        Schema::dropIfExists('extras');
        Schema::dropIfExists('product_variants');
    }
};
