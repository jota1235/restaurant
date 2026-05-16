<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = User::where('email', 'superadmin@pos.com')->first();
if ($user) {
    $user->password = Hash::make('password');
    $user->save();
    echo "Password set correctly using Laravel Hash facade for: " . $user->email . "\n";
} else {
    echo "User not found\n";
}
