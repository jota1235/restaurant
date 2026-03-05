<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->boolean('ticket_generated')->default(false)->after('notes');
            $table->boolean('registered_in_cash')->default(true)->after('ticket_generated');
            $table->string('ticket_folio')->nullable()->after('registered_in_cash');
            $table->json('ticket_data')->nullable()->after('ticket_folio');
            $table->decimal('amount_received', 10, 2)->nullable()->after('ticket_data');
            $table->decimal('change_amount', 10, 2)->nullable()->after('amount_received');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'ticket_generated',
                'registered_in_cash',
                'ticket_folio',
                'ticket_data',
                'amount_received',
                'change_amount',
            ]);
        });
    }
};
