<?php
$hash = '$2y$10$3e9ldUN/aTC4AcbPcjLQ7uGwOyYHNGJhcvU2JCl83U8NmSCGfPf0S';
try {
    $pdo = new PDO('pgsql:host=127.0.0.1;port=5432;dbname=pv', 'postgres', 'postgres');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Check user first
    $stmt = $pdo->prepare("SELECT id, email FROM users WHERE email = 'superadmin@pos.com'");
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        $update = $pdo->prepare("UPDATE users SET password = :hash, is_active = true WHERE id = :id");
        $update->execute(['hash' => $hash, 'id' => $user['id']]);
        echo "SUCCESS: Password for superadmin@pos.com set to 'password'. User ID: " . $user['id'] . "\n";
    } else {
        echo "ERROR: User superadmin@pos.com not found.\n";
    }
} catch (PDOException $e) {
    echo "DB ERROR: " . $e->getMessage() . "\n";
}
