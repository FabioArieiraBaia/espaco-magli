<?php
require_once __DIR__ . '/api/config/database.php';
$pdo = Database::getInstance();

echo "--- BUSCANDO ALUNA ---\n";
$stmt = $pdo->prepare("SELECT id, nome FROM alunas WHERE nome LIKE '%Alessandra%'");
$stmt->execute();
$alunas = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($alunas);

if (!empty($alunas)) {
    $aluna_id = $alunas[0]['id'];
    echo "\n--- TREINOS DA ALUNA (ID $aluna_id) ---\n";
    $stmt = $pdo->prepare("SELECT id, treino_num, data_treino, status, descricao_treino FROM treinos WHERE aluna_id = ? ORDER BY treino_num ASC");
    $stmt->execute([$aluna_id]);
    $treinos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($treinos as $t) {
        echo "ID: {$t['id']} | Num: {$t['treino_num']} | Status: {$t['status']} | Texto: " . mb_substr($t['descricao_treino'], 0, 100) . "...\n";
    }
    
    echo "\n--- ÚLTIMO LOG DE DEBUG (Últimas 50 linhas) ---\n";
    if (file_exists('api/ia/gemini_debug.log')) {
        $logs = file('api/ia/gemini_debug.log');
        echo implode("", array_slice($logs, -50));
    }
}
?>
