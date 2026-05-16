<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('products', 'promotion_type')) {
            Schema::table('products', function (Blueprint $table) {
                $table->string('promotion_type', 10)->nullable()->after('is_available');
            });
        }
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('promotion_type');
        });
    }
};
