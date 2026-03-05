<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    require __DIR__.'/vendor/autoload.php';
    $app = require_once __DIR__.'/bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $status = $kernel->bootstrap();
    echo "Bootstrap successful\n";
} catch (\Throwable $e) {
    echo "Error Class: " . get_class($e) . "\n";
    echo "Error Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "Stack Trace:\n" . $e->getTraceAsString() . "\n";
}
