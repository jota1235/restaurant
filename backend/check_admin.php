<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo App\Models\User::role('superadmin')->get(['id', 'name', 'email', 'phone'])->toJson(JSON_PRETTY_PRINT);
