<?php
$password = 'password';
$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

try {
    $pdo = new PDO('pgsql:host=127.0.0.1;port=5432;dbname=pv', 'postgres', 'postgres');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $pdo->prepare("UPDATE users SET password = :password WHERE email = 'superadmin@pos.com'");
    $stmt->execute(['password' => $hash]);
    echo "Password reset successful!";
} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
}
