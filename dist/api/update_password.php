<?php
// Script para atualizar a senha do admin
$dbPath = __DIR__ . '/database/magli.db';

try {
    $db = new PDO('sqlite:' . $dbPath);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $hash = password_hash('admin123', PASSWORD_DEFAULT);
    
    $stmt = $db->prepare('UPDATE usuarios SET senha = ? WHERE email = "admin@magli.com.br"');
    $stmt->execute([$hash]);
    
    echo "Senha atualizada com sucesso!\n";
    echo "Novo hash: " . $hash . "\n";
    
    // Verificar se funciona
    $verify = password_verify('admin123', $hash);
    echo "Verificação: " . ($verify ? 'OK' : 'ERRO') . "\n";
    
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}