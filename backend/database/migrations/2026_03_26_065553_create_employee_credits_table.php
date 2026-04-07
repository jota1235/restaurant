<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_credits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();

            // Who is charged
            $table->foreignId('user_id')->constrained('users'); // Employee being charged

            // Product snapshot (in case product gets deleted later)
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('product_name');           // snapshot
            $table->decimal('product_price', 10, 2);  // snapshot
            $table->decimal('quantity', 8, 3)->default(1);
            $table->decimal('total', 10, 2);

            $table->string('notes')->nullable();

            // Lifecycle
            $table->enum('status', ['pending', 'paid', 'cancelled'])->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            // Who registered and who approved the payment
            $table->foreignId('registered_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users');

            // Link to cash register when paid (for reconciliation)
            $table->foreignId('cash_register_id')->nullable()->constrained('cash_registers')->nullOnDelete();
            $table->foreignId('cash_movement_id')->nullable()->constrained('cash_movements')->nullOnDelete();

            $table->timestamps();
            $table->index(['restaurant_id', 'status']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_credits');
    }
};
