<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('table_id')->nullable()->constrained('tables')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // mesero que tomó la orden
            $table->string('order_number', 20);         // "#001", "#002" por restaurante
            $table->enum('status', [
                'pending',      // recién creada, esperando confirmación
                'confirmed',    // confirmada, en preparación
                'ready',        // lista para servir
                'delivered',    // entregada en mesa
                'paid',         // pagada / cerrada
                'cancelled',    // cancelada
            ])->default('pending');
            $table->enum('type', ['dine_in', 'takeaway', 'delivery'])->default('dine_in');
            $table->string('customer_name')->nullable();
            $table->text('notes')->nullable();           // notas generales de la orden
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('ready_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['restaurant_id', 'status']);
            $table->index(['restaurant_id', 'table_id']);
            $table->unique(['restaurant_id', 'order_number']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->decimal('unit_price', 10, 2);        // precio al momento de la venta
            $table->decimal('subtotal', 10, 2);
            $table->text('notes')->nullable();            // "sin cebolla", "bien cocido"
            $table->enum('status', ['pending', 'preparing', 'ready', 'delivered'])->default('pending');
            $table->timestamps();

            $table->index('order_id');
        });

        Schema::create('order_item_extras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('extra_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->decimal('unit_price', 8, 2);
            $table->decimal('subtotal', 8, 2);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_item_extras');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
