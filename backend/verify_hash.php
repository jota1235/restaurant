<?php
try {
    $pdo = new PDO('pgsql:host=127.0.0.1;port=5432;dbname=pv', 'postgres', 'postgres');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $pdo->query("SELECT id, name, email, password FROM users WHERE email = 'superadmin@pos.com'");
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "ID: " . $user['id'] . "\n";
    echo "Email: " . $user['email'] . "\n";
    echo "Hash: " . $user['password'] . "\n";
    echo "Verify 'password': " . (password_verify('password', $user['password']) ? 'YES' : 'NO') . "\n";
} catch (PDOException $e) {
    echo "DB ERROR: " . $e->getMessage();
}
