<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->onDelete('cascade');
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // Who processed the payment
            $table->foreignId('cash_register_id')->nullable()->constrained()->onDelete('set null');
            
            $table->decimal('amount', 12, 2);
            $table->decimal('tip', 12, 2)->default(0);
            $table->string('payment_method'); // cash, card, transfer, etc.
            $table->string('reference')->nullable(); // transaction id, voucher, etc.
            $table->string('status')->default('completed'); // completed, refunded
            $table->text('notes')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
