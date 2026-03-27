<?php
require_once __DIR__ . '/config/database.php';
$pdo = Database::getInstance();
$stmt = $pdo->prepare('SELECT * FROM receitas WHERE id = 2');
$stmt->execute();
$recipe = $stmt->fetch();
echo json_encode($recipe, JSON_PRETTY_PRINT);
