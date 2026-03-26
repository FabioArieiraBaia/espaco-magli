<?php
// API Magli - Backend  SQLite
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config/database.php';

$pdo = Database::getInstance();
$method = $_SERVER['REQUEST_METHOD'];

// Cachear o corpo da requisição (php://input só pode ser lido uma vez)
$GLOBALS['_RAW_INPUT'] = file_get_contents('php://input');
$GLOBALS['_PARSED_INPUT'] = json_decode($GLOBALS['_RAW_INPUT'], true) ?? [];

// Suporte a method override para hosts que bloqueiam PUT/DELETE
if ($method === 'POST' && isset($GLOBALS['_PARSED_INPUT']['_method'])) {
    $method = strtoupper($GLOBALS['_PARSED_INPUT']['_method']);
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Remover prefixos até a pasta /api
$uri = preg_replace('#^.*?/api#', '', $uri);
$uri = rtrim($uri, '/') ?: '/';

// Obter token de autenticação
function getAuthUser($pdo) {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    
    if (!$token) {
        return null;
    }
    
    // Token simples: base64(email:timestamp)
    $decoded = base64_decode(str_replace('Bearer ', '', $token));
    $parts = explode(':', $decoded);
    
    if (count($parts) < 1) {
        return null;
    }
    
    $email = $parts[0];
    $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ? AND ativo = 1");
    $stmt->execute([$email]);
    return $stmt->fetch();
}

// ========== ROTAS ==========

// ROTA: Login
if ($uri === '/login' && $method === 'POST') {
    $input = getInput();
    $raw = file_get_contents('php://input');
    
    // Debug - retorna info para teste
    if (isset($input['debug'])) {
        jsonResponse([
            'raw' => $raw,
            'input' => $input,
            'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set'
        ]);
    }
    
    $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ?");
    $stmt->execute([$input['email'] ?? '']);
    $user = $stmt->fetch();
    
    $senhaOk = $user ? password_verify($input['senha'] ?? '', $user['senha']) : false;
    
    if ($user && $senhaOk) {
        $token = base64_encode($user['email'] . ':' . time());
        jsonResponse([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'nome' => $user['nome'],
                'email' => $user['email'],
                'perfil' => $user['perfil']
            ]
        ]);
    }
    
    jsonResponse(['success' => false, 'error' => 'Credenciais inválidas'], 401);
}

// ROTA: Verificar token
if ($uri === '/auth/verify' && $method === 'GET') {
    $user = getAuthUser($pdo);
    
    if ($user) {
        jsonResponse([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'nome' => $user['nome'],
                'email' => $user['email'],
                'perfil' => $user['perfil']
            ]
        ]);
    }
    
    jsonResponse(['success' => false], 401);
}

// ROTA: Listar professoras (para select) — inclui admin também
if ($uri === '/professoras' && $method === 'GET') {
    $stmt = $pdo->query("SELECT id, nome, perfil FROM usuarios WHERE perfil IN ('professora', 'admin') AND ativo = 1 ORDER BY nome");
    jsonResponse($stmt->fetchAll());
}

// ROTA: Configurações
if ($uri === '/configuracoes') {
    // GET é público (para landing page exibir preços)
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT chave, valor FROM configuracoes");
        $rows = $stmt->fetchAll();
        $config = [];
        foreach ($rows as $row) {
            $config[$row['chave']] = $row['valor'];
        }
        jsonResponse($config);
    }

    // PUT requer admin
    if ($method === 'PUT') {
        $user = getAuthUser($pdo);
        if (!$user || $user['perfil'] !== 'admin') jsonResponse(['error' => 'Não autorizado'], 403);
        $input = getInput();
        $stmt = $pdo->prepare("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)");
        foreach ($input as $chave => $valor) {
            $stmt->execute([$chave, $valor]);
        }
        jsonResponse(['success' => true]);
    }
}

// ROTA: Backup do banco de dados
if ($uri === '/backup' && $method === 'GET') {
    $user = getAuthUser($pdo);
    if (!$user || $user['perfil'] !== 'admin') jsonResponse(['error' => 'Não autorizado'], 403);

    $dbPath = Database::getDbPath();
    if (!file_exists($dbPath)) {
        jsonResponse(['error' => 'Banco de dados não encontrado'], 404);
    }

    // Fechar conexão e forçar WAL checkpoint
    $pdo = null;
    
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="magli_backup_' . date('Y-m-d_H-i-s') . '.db"');
    header('Content-Length: ' . filesize($dbPath));
    readfile($dbPath);
    exit;
}

// ROTA: Restaurar banco de dados
if ($uri === '/restore' && $method === 'POST') {
    $user = getAuthUser($pdo);
    if (!$user || $user['perfil'] !== 'admin') jsonResponse(['error' => 'Não autorizado'], 403);

    if (!isset($_FILES['database']) || $_FILES['database']['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(['error' => 'Nenhum arquivo enviado ou erro no upload'], 400);
    }

    $uploadedFile = $_FILES['database']['tmp_name'];
    $dbPath = Database::getDbPath();

    // Validar se é um banco SQLite válido
    try {
        $testPdo = new PDO('sqlite:' . $uploadedFile);
        $testPdo->query("SELECT COUNT(*) FROM usuarios");
        $testPdo = null;
    } catch (Exception $e) {
        jsonResponse(['error' => 'Arquivo inválido. Não é um banco de dados válido.'], 400);
    }

    // Fechar conexão atual
    $pdo = null;

    // Substituir o banco
    if (copy($uploadedFile, $dbPath)) {
        jsonResponse(['success' => true, 'message' => 'Banco restaurado com sucesso!']);
    } else {
        jsonResponse(['error' => 'Erro ao restaurar banco de dados'], 500);
    }
}

// ROTA: CRUD Alunas
if (preg_match('/^\/alunas(\/(\d+))?$/', $uri, $matches)) {
    $user = getAuthUser($pdo);
    if (!$user) jsonResponse(['error' => 'Não autorizado'], 401);
    
    $id = $matches[2] ?? null;
    
    // GET - Listar
    if ($method === 'GET') {
        if ($id) {
            $stmt = $pdo->prepare("SELECT a.*, u.nome as professora_nome FROM alunas a LEFT JOIN usuarios u ON a.professora_id = u.id WHERE a.id = ?");
            $stmt->execute([$id]);
            $aluna = $stmt->fetch();
            if ($aluna) {
                $aluna['dias_semana'] = json_decode($aluna['dias_semana'] ?? '[]', true);
                $aluna['horarios'] = json_decode($aluna['horarios'] ?? '[]', true);
            }
            jsonResponse($aluna ?: ['error' => 'Aluna não encontrada'], $aluna ? 200 : 404);
        } else {
            $stmt = $pdo->query("SELECT a.*, u.nome as professora_nome FROM alunas a LEFT JOIN usuarios u ON a.professora_id = u.id WHERE a.ativa = 1 ORDER BY a.nome");
            $alunas = $stmt->fetchAll();
            foreach ($alunas as &$a) {
                $a['dias_semana'] = json_decode($a['dias_semana'] ?? '[]', true);
                $a['horarios'] = json_decode($a['horarios'] ?? '[]', true);
            }
            jsonResponse($alunas);
        }
    }
    
    // POST - Criar
    if ($method === 'POST') {
        $input = getInput();
        
        $stmt = $pdo->prepare("
            INSERT INTO alunas (nome, nascimento, email, cpf, telefone, professora_id, vezes_semana, data_inicio, dias_semana, horarios)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $input['nome'],
            $input['nascimento'] ?? null,
            $input['email'] ?? null,
            $input['cpf'] ?? null,
            $input['telefone'] ?? null,
            $input['professora_id'],
            $input['vezes_semana'],
            $input['data_inicio'],
            json_encode($input['dias_semana'] ?? []),
            json_encode($input['horarios'] ?? [])
        ]);
        
        $alunaId = $pdo->lastInsertId();
        
        // Criar treinos iniciais
        $dataInicio = new DateTime($input['data_inicio']);
        $dataProxima = clone $dataInicio;
        $dataProxima->modify('+56 days'); // 8 semanas padrão
        
        $stmtTreino = $pdo->prepare("
            INSERT INTO treinos (aluna_id, professor_id, treino_num, data_treino, data_proxima, duracao_semanas)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmtTreino->execute([
            $alunaId,
            $input['professora_id'],
            1,
            $dataInicio->format('Y-m-d'),
            $dataProxima->format('Y-m-d'),
            8
        ]);
        
        // Criar receita usando preços das configurações
        $stmtPreco = $pdo->prepare("SELECT valor FROM configuracoes WHERE chave = ?");
        $stmtPreco->execute(['preco_' . $input['vezes_semana'] . 'x']);
        $precoConfig = $stmtPreco->fetch();
        $valor = $precoConfig ? floatval($precoConfig['valor']) : 0;
        
        $stmtReceita = $pdo->prepare("
            INSERT INTO receitas (aluna_id, valor, vezes_semana, mes)
            VALUES (?, ?, ?, ?)
        ");
        $stmtReceita->execute([
            $alunaId,
            $valor,
            $input['vezes_semana'],
            date('Y-m')
        ]);
        
        jsonResponse(['success' => true, 'id' => $alunaId]);
    }
    
    // PUT - Atualizar
    if ($method === 'PUT' && $id) {
        $input = getInput();
        
        $stmt = $pdo->prepare("
            UPDATE alunas SET nome = ?, nascimento = ?, email = ?, cpf = ?, telefone = ?, 
            professora_id = ?, vezes_semana = ?, data_inicio = ?, dias_semana = ?, horarios = ?
            WHERE id = ?
        ");
        
        $stmt->execute([
            $input['nome'],
            $input['nascimento'] ?? null,
            $input['email'] ?? null,
            $input['cpf'] ?? null,
            $input['telefone'] ?? null,
            $input['professora_id'],
            $input['vezes_semana'],
            $input['data_inicio'],
            json_encode($input['dias_semana'] ?? []),
            json_encode($input['horarios'] ?? []),
            $id
        ]);
        
        jsonResponse(['success' => true]);
    }
    
    // DELETE - Desabilitar (mover para ex-alunas)
    if ($method === 'DELETE' && $id) {
        // Buscar dados da aluna
        $stmt = $pdo->prepare("SELECT * FROM alunas WHERE id = ?");
        $stmt->execute([$id]);
        $aluna = $stmt->fetch();
        
        if ($aluna) {
            // Inserir em ex_alunas
            $stmtEx = $pdo->prepare("
                INSERT INTO ex_alunas (aluna_id, nome, data_saida)
                VALUES (?, ?, ?)
            ");
            $stmtEx->execute([$id, $aluna['nome'], date('Y-m-d')]);
            
            // Marcar como inativa
            $pdo->prepare("UPDATE alunas SET ativa = 0 WHERE id = ?")->execute([$id]);
        }
        
        jsonResponse(['success' => true]);
    }
}

// ROTA: Treinos
if (preg_match('/^\/treinos(\/(\d+))?$/', $uri, $matches)) {
    $user = getAuthUser($pdo);
    if (!$user) jsonResponse(['error' => 'Não autorizado'], 401);
    
    $id = $matches[2] ?? null;
    
    // GET - Listar
    if ($method === 'GET') {
        if ($id) {
            // Treinos de uma aluna específica
            $stmt = $pdo->prepare("
                SELECT t.*, a.nome as aluna_nome, u.nome as professora_nome
                FROM treinos t
                JOIN alunas a ON t.aluna_id = a.id
                LEFT JOIN usuarios u ON a.professora_id = u.id
                WHERE t.aluna_id = ?
                ORDER BY t.treino_num
            ");
            $stmt->execute([$id]);
            jsonResponse($stmt->fetchAll());
        } else {
            // Todos os treinos (admin)
            $stmt = $pdo->query("
                SELECT t.*, a.nome as aluna_nome, u.nome as professora_nome
                FROM treinos t
                JOIN alunas a ON t.aluna_id = a.id
                LEFT JOIN usuarios u ON a.professora_id = u.id
                ORDER BY t.data_proxima ASC
            ");
            jsonResponse($stmt->fetchAll());
        }
    }
    
    // POST - Adicionar treino
    if ($method === 'POST') {
        $input = getInput();
        
        // Buscar último treino
        $stmt = $pdo->prepare("SELECT MAX(treino_num) as ultimo FROM treinos WHERE aluna_id = ?");
        $stmt->execute([$input['aluna_id']]);
        $ultimo = $stmt->fetch()['ultimo'] ?? 0;
        
        $novoNum = $ultimo + 1;
        $duracaoSemanas = $input['duracao_semanas'] ?? 8;
        $dataTreino = new DateTime($input['data_treino']);
        $dataProxima = clone $dataTreino;
        $dataProxima->modify('+' . ($duracaoSemanas * 7) . ' days');
        
        $stmt = $pdo->prepare("
            INSERT INTO treinos (aluna_id, professor_id, treino_num, data_treino, data_proxima, duracao_semanas, descricao_treino)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['aluna_id'],
            $input['professor_id'],
            $novoNum,
            $dataTreino->format('Y-m-d'),
            $dataProxima->format('Y-m-d'),
            $duracaoSemanas,
            $input['descricao_treino'] ?? ''
        ]);
        
        jsonResponse(['success' => true]);
    }
    
    // PUT - Atualizar treino
    if ($method === 'PUT' && $id) {
        $input = getInput();
        
        // Se tem duração ou data, recalcular data_proxima
        if (isset($input['data_treino']) || isset($input['duracao_semanas'])) {
            // Buscar treino atual
            $stmt = $pdo->prepare("SELECT * FROM treinos WHERE id = ?");
            $stmt->execute([$id]);
            $treino = $stmt->fetch();
            
            $dataTreino = new DateTime($input['data_treino'] ?? $treino['data_treino']);
            $duracaoSemanas = $input['duracao_semanas'] ?? $treino['duracao_semanas'] ?? 8;
            $dataProxima = clone $dataTreino;
            $dataProxima->modify('+' . ($duracaoSemanas * 7) . ' days');
            
            $stmt = $pdo->prepare("
                UPDATE treinos SET 
                    data_treino = ?, 
                    data_proxima = ?, 
                    duracao_semanas = ?,
                    descricao_treino = ?,
                    status = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $dataTreino->format('Y-m-d'),
                $dataProxima->format('Y-m-d'),
                $duracaoSemanas,
                $input['descricao_treino'] ?? $treino['descricao_treino'] ?? '',
                $input['status'] ?? $treino['status'],
                $id
            ]);
        } else if (isset($input['status'])) {
            $stmt = $pdo->prepare("UPDATE treinos SET status = ? WHERE id = ?");
            $stmt->execute([$input['status'], $id]);
        } else if (isset($input['descricao_treino'])) {
            $stmt = $pdo->prepare("UPDATE treinos SET descricao_treino = ? WHERE id = ?");
            $stmt->execute([$input['descricao_treino'], $id]);
        }
        
        jsonResponse(['success' => true]);
    }
}

// ROTA: Treinos por professora
if (preg_match('/^\/treinos\/professora\/(\d+)$/', $uri, $matches)) {
    $user = getAuthUser($pdo);
    if (!$user) jsonResponse(['error' => 'Não autorizado'], 401);
    
    $professoraId = $matches[1];
    
    $stmt = $pdo->prepare("
        SELECT t.*, a.nome as aluna_nome, a.ativa, u.nome as professora_nome
        FROM treinos t
        JOIN alunas a ON t.aluna_id = a.id
        LEFT JOIN usuarios u ON a.professora_id = u.id
        WHERE a.professora_id = ? AND a.ativa = 1
        ORDER BY t.data_proxima ASC
    ");
    $stmt->execute([$professoraId]);
    jsonResponse($stmt->fetchAll());
}

// ROTA: Quadro de horários
if ($uri === '/horarios') {
    $stmt = $pdo->query("
        SELECT a.nome, a.dias_semana, a.horarios, u.nome as professora_nome
        FROM alunas a
        LEFT JOIN usuarios u ON a.professora_id = u.id
        WHERE a.ativa = 1
    ");
    $alunas = $stmt->fetchAll();
    
    $horarios = [];
    $dias = ['segunda', 'terça', 'terca', 'quarta', 'quinta', 'sexta'];
    $horas = ['7:00', '8:00', '9:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    
    // Inicializar grid
    $diasNormalizados = ['segunda', 'terça', 'quarta', 'quinta', 'sexta'];
    foreach ($horas as $hora) {
        foreach ($diasNormalizados as $dia) {
            $horarios[$dia][$hora] = [];
        }
    }
    
    foreach ($alunas as $aluna) {
        $diasSemana = json_decode($aluna['dias_semana'] ?? '[]', true);
        $horariosAluna = json_decode($aluna['horarios'] ?? '[]', true);
        
        // Verificar se horarios é o novo formato (objeto por dia) ou antigo (array global)
        if (is_array($horariosAluna) && !empty($horariosAluna)) {
            // Verificar se é array sequencial (formato antigo) ou associativo (formato novo)
            $isOldFormat = array_keys($horariosAluna) === range(0, count($horariosAluna) - 1);
            
            if ($isOldFormat) {
                // Formato antigo: horas aplicadas a todos os dias selecionados
                foreach ($diasSemana as $dia) {
                    $diaNorm = str_replace('terca', 'terça', $dia);
                    foreach ($horariosAluna as $hora) {
                        if (isset($horarios[$diaNorm][$hora])) {
                            $horarios[$diaNorm][$hora][] = $aluna['nome'];
                        }
                    }
                }
            } else {
                // Formato novo: horarios por dia
                foreach ($horariosAluna as $dia => $hsDia) {
                    $diaNorm = str_replace('terca', 'terça', $dia);
                    if (is_array($hsDia)) {
                        foreach ($hsDia as $hora) {
                            if (isset($horarios[$diaNorm][$hora])) {
                                $horarios[$diaNorm][$hora][] = $aluna['nome'];
                            }
                        }
                    }
                }
            }
        }
    }
    
    jsonResponse($horarios);
}

// ROTA: Receitas
if ($uri === '/receitas' && $method === 'GET') {
    $user = getAuthUser($pdo);
    if (!$user || $user['perfil'] !== 'admin') {
        jsonResponse(['error' => 'Não autorizado'], 403);
    }
    
    $mes = $_GET['mes'] ?? date('Y-m');
    
    $stmt = $pdo->prepare("
        SELECT r.*, a.nome as aluna_nome
        FROM receitas r
        JOIN alunas a ON r.aluna_id = a.id
        WHERE r.mes = ?
        ORDER BY a.nome
    ");
    $stmt->execute([$mes]);
    
    $receitas = $stmt->fetchAll();
    $total = array_sum(array_column($receitas, 'valor'));
    
    jsonResponse(['receitas' => $receitas, 'total' => $total]);
}

// ROTA: Marcar pago
if (preg_match('/^\/receitas\/(\d+)\/pago$/', $uri, $matches)) {
    $user = getAuthUser($pdo);
    if (!$user || $user['perfil'] !== 'admin') {
        jsonResponse(['error' => 'Não autorizado'], 403);
    }
    
    $id = $matches[1];
    $input = getInput();
    
    $stmt = $pdo->prepare("UPDATE receitas SET pago = 1, data_pagamento = ? WHERE id = ?");
    $stmt->execute([date('Y-m-d'), $id]);
    
    jsonResponse(['success' => true]);
}

// ROTA: Despesas
if ($uri === '/despesas') {
    $user = getAuthUser($pdo);
    if (!$user || $user['perfil'] !== 'admin') {
        jsonResponse(['error' => 'Não autorizado'], 403);
    }
    
    if ($method === 'GET') {
        $mes = $_GET['mes'] ?? date('Y-m');
        
        $stmt = $pdo->prepare("SELECT * FROM despesas WHERE mes = ? ORDER BY descricao");
        $stmt->execute([$mes]);
        
        $despesas = $stmt->fetchAll();
        $total = array_sum(array_column($despesas, 'valor'));
        
        jsonResponse(['despesas' => $despesas, 'total' => $total]);
    }
    
    if ($method === 'POST') {
        $input = getInput();
        
        $stmt = $pdo->prepare("INSERT INTO despesas (descricao, valor, mes) VALUES (?, ?, ?)");
        $stmt->execute([$input['descricao'], $input['valor'], $input['mes'] ?? date('Y-m')]);
        
        jsonResponse(['success' => true]);
    }
    
    if ($method === 'DELETE') {
        $input = getInput();
        $stmt = $pdo->prepare("DELETE FROM despesas WHERE id = ?");
        $stmt->execute([$input['id']]);
        jsonResponse(['success' => true]);
    }
}

// ROTA: Ex-alunas
if (preg_match('#^/ex-alunas(/(\d+))?$#', $uri, $matches)) {
    $user = getAuthUser($pdo);
    if (!$user || $user['perfil'] !== 'admin') {
        jsonResponse(['error' => 'Não autorizado'], 403);
    }
    
    $exId = $matches[2] ?? null;
    
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM ex_alunas ORDER BY nome");
        jsonResponse($stmt->fetchAll());
    }
    
    // PUT - Reintegrar aluna (reativar)
    if ($method === 'PUT' && $exId) {
        $stmt = $pdo->prepare("SELECT * FROM ex_alunas WHERE id = ?");
        $stmt->execute([$exId]);
        $ex = $stmt->fetch();
        
        if ($ex && $ex['aluna_id']) {
            // Reativar a aluna
            $pdo->prepare("UPDATE alunas SET ativa = 1 WHERE id = ?")->execute([$ex['aluna_id']]);
            // Remover do registro de ex-alunas
            $pdo->prepare("DELETE FROM ex_alunas WHERE id = ?")->execute([$exId]);
            jsonResponse(['success' => true, 'message' => 'Aluna reintegrada com sucesso!']);
        }
        jsonResponse(['error' => 'Ex-aluna não encontrada'], 404);
    }
    
    // DELETE - Excluir permanentemente
    if ($method === 'DELETE' && $exId) {
        $pdo->prepare("DELETE FROM ex_alunas WHERE id = ?")->execute([$exId]);
        jsonResponse(['success' => true]);
    }
}

// ROTA: Contagem de alunas
if ($uri === '/alunas/count') {
    $user = getAuthUser($pdo);
    if (!$user) jsonResponse(['error' => 'Não autorizado'], 401);
    
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM alunas WHERE ativa = 1");
    jsonResponse(['total' => $stmt->fetch()['total']]);
}

// ROTA: Usuários (CRUD completo)
if (preg_match('/^\/usuarios(\/(\d+))?$/', $uri, $matches)) {
    $user = getAuthUser($pdo);
    if (!$user || $user['perfil'] !== 'admin') {
        jsonResponse(['error' => 'Não autorizado'], 403);
    }
    
    $id = $matches[2] ?? null;

    // GET - Listar usuários
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT id, nome, email, perfil, ativo FROM usuarios ORDER BY nome");
        jsonResponse($stmt->fetchAll());
    }

    // POST - Criar usuário (senha obrigatória)
    if ($method === 'POST') {
        $input = getInput();
        
        if (empty($input['senha'])) {
            jsonResponse(['error' => 'A senha é obrigatória'], 400);
        }
        
        $senha = password_hash($input['senha'], PASSWORD_DEFAULT);
        
        try {
            $stmt = $pdo->prepare("INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)");
            $stmt->execute([$input['nome'], $input['email'], $senha, $input['perfil'] ?? 'professora']);
            jsonResponse(['success' => true]);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Email já cadastrado'], 400);
        }
    }

    // PUT - Editar usuário
    if ($method === 'PUT' && $id) {
        $input = getInput();
        
        if (!empty($input['senha'])) {
            $senha = password_hash($input['senha'], PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE usuarios SET nome = ?, email = ?, senha = ?, perfil = ? WHERE id = ?");
            $stmt->execute([$input['nome'], $input['email'], $senha, $input['perfil'] ?? 'professora', $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE usuarios SET nome = ?, email = ?, perfil = ? WHERE id = ?");
            $stmt->execute([$input['nome'], $input['email'], $input['perfil'] ?? 'professora', $id]);
        }
        
        jsonResponse(['success' => true]);
    }

    // DELETE - Desativar usuário
    if ($method === 'DELETE' && $id) {
        $stmt = $pdo->prepare("UPDATE usuarios SET ativo = 0 WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(['success' => true]);
    }
}

// ROTA: Anamnese CRUD
if (preg_match('#^/anamnese(/(\d+))?$#', $uri, $matches)) {
    $user = getAuthUser($pdo);
    if (!$user) jsonResponse(['error' => 'Não autorizado'], 401);
    
    $alunaId = $matches[2] ?? null;
    
    // GET - Listar todas ou buscar por aluna_id
    if ($method === 'GET') {
        if ($alunaId) {
            $stmt = $pdo->prepare("SELECT * FROM anamnese WHERE aluna_id = ? ORDER BY created_at DESC LIMIT 1");
            $stmt->execute([$alunaId]);
            $result = $stmt->fetch();
            jsonResponse($result ?: []);
        } else {
            $stmt = $pdo->query("
                SELECT an.*, a.nome as aluna_nome 
                FROM anamnese an 
                LEFT JOIN alunas a ON an.aluna_id = a.id 
                ORDER BY an.created_at DESC
            ");
            jsonResponse($stmt->fetchAll());
        }
    }
    
    // POST - Criar nova anamnese
    if ($method === 'POST') {
        $input = getInput();
        
        $columns = ['aluna_id','nome','nascimento','idade','estado_civil','profissao','telefone','email',
            'altura','peso','imc','gordura_corporal',
            'problema_saude','problema_saude_qual','liberacao_medica',
            'usa_medicamentos','medicamentos_qual','possui_alergias','alergias_qual',
            'problemas_cardiacos','cardiacos_qual','problemas_respiratorios','respiratorios_qual',
            'historico_familiar','pratica_atividade','atividade_qual',
            'frequentou_academia','academia_tempo','nivel_atividade',
            'objetivos','tempo_objetivo','habitos',
            'sofreu_lesoes','lesoes_qual','passou_cirurgias','cirurgias_qual',
            'ultimo_ciclo','menopausa','menopausa_desde','info_adicionais'];
        
        $placeholders = implode(',', array_fill(0, count($columns), '?'));
        $colNames = implode(',', $columns);
        
        $values = array_map(function($col) use ($input) {
            return $input[$col] ?? null;
        }, $columns);
        
        $stmt = $pdo->prepare("INSERT INTO anamnese ($colNames) VALUES ($placeholders)");
        $stmt->execute($values);
        
        jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
    }
    
    // PUT - Atualizar anamnese
    if ($method === 'PUT' && $alunaId) {
        $input = getInput();
        
        $columns = ['nome','nascimento','idade','estado_civil','profissao','telefone','email',
            'altura','peso','imc','gordura_corporal',
            'problema_saude','problema_saude_qual','liberacao_medica',
            'usa_medicamentos','medicamentos_qual','possui_alergias','alergias_qual',
            'problemas_cardiacos','cardiacos_qual','problemas_respiratorios','respiratorios_qual',
            'historico_familiar','pratica_atividade','atividade_qual',
            'frequentou_academia','academia_tempo','nivel_atividade',
            'objetivos','tempo_objetivo','habitos',
            'sofreu_lesoes','lesoes_qual','passou_cirurgias','cirurgias_qual',
            'ultimo_ciclo','menopausa','menopausa_desde','info_adicionais'];
        
        $setClause = implode(',', array_map(function($col) { return "$col = ?"; }, $columns));
        $values = array_map(function($col) use ($input) { return $input[$col] ?? null; }, $columns);
        $values[] = $alunaId;
        
        $stmt = $pdo->prepare("UPDATE anamnese SET $setClause, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute($values);
        
        jsonResponse(['success' => true]);
    }
    
    // DELETE - Excluir anamnese
    if ($method === 'DELETE' && $alunaId) {
        $stmt = $pdo->prepare("DELETE FROM anamnese WHERE id = ?");
        $stmt->execute([$alunaId]);
        jsonResponse(['success' => true]);
    }
}

// Rota não encontrada
jsonResponse(['error' => 'Rota não encontrada'], 404);
?>