<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

DB::statement('SET session_replication_role = replica;');

// Delete order-related data
DB::table('order_item_extras')->truncate();
DB::table('order_items')->truncate();
DB::table('orders')->truncate();
DB::table('payments')->truncate();
DB::table('cash_registers')->truncate();
DB::table('audit_logs')->truncate();

// Reset all tables to available
DB::table('tables')->update(['status' => 'available']);

DB::statement('SET session_replication_role = DEFAULT;');

echo "Done! All orders, payments, and cash registers cleared. Tables reset to available.\n";
