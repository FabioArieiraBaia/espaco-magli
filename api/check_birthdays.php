<?php
require_once __DIR__ . '/config/database.php';
$pdo = Database::getInstance();
$stmt = $pdo->query('SELECT nome, nascimento FROM alunas WHERE ativa = 1');
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($results, JSON_PRETTY_PRINT);
