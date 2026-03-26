<?php
$db = new PDO('sqlite:database/magli.db');
$stmt = $db->query('SELECT id, nome, email, senha, perfil FROM usuarios');
$usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Usuarios no banco:\n";
print_r($usuarios);

echo "\n\nTestando senha admin123:\n";
echo "Hash gerado: " . password_hash('admin123', PASSWORD_DEFAULT) . "\n";

if (count($usuarios) > 0) {
    $admin = $usuarios[0];
    echo "Senha do banco: " . $admin['senha'] . "\n";
    echo "Verificacao: " . (password_verify('admin123', $admin['senha']) ? 'VALIDO' : 'INVALIDO') . "\n";
}