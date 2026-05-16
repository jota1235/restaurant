<?php
try {
    $pdo = new PDO('pgsql:host=127.0.0.1;port=5432;dbname=pv', 'postgres', 'postgres');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $pdo->query("SELECT u.id, u.name, u.email FROM users u JOIN model_has_roles mhr ON u.id = mhr.model_id JOIN roles r ON mhr.role_id = r.id WHERE r.name = 'superadmin'");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($users, JSON_PRETTY_PRINT);
} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
}
