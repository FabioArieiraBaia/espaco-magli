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

// Servir arquivos estáticos da pasta uploads (Imagens de Treino)
$requestPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('/^(\/api)?\/uploads\/(.+)$/', $requestPath, $matches)) {
    $filePath = __DIR__ . '/uploads/' . $matches[2];

    if (file_exists($filePath) && !is_dir($filePath)) {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp'
        ];

        $contentType = $mimeTypes[$ext] ?? 'application/octet-stream';

        if (ob_get_level())
            ob_end_clean();
        header('Content-Type: ' . $contentType);
        header('Content-Length: ' . filesize($filePath));
        header('Access-Control-Allow-Origin: *'); // Garantir CORS para imagens se necessário
        readfile($filePath);
        exit;
    }
}

// Polyfill para getallheaders se não existir (necessário em alguns ambientes FastCGI/Nginx)
if (!function_exists('getallheaders')) {
    function getallheaders()
    {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            } elseif ($name == 'CONTENT_TYPE') {
                $headers['Content-Type'] = $value;
            } elseif ($name == 'CONTENT_LENGTH') {
                $headers['Content-Length'] = $value;
            }
        }
        return $headers;
    }
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/ia/GeminiService.php';

try {
    $pdo = Database::getInstance();

    // Buscar chave e modelo da IA nas configurações
    $stmtKey = $pdo->prepare("SELECT chave, valor FROM configuracoes WHERE chave IN ('gemini_api_key', 'gemini_api_model')");
    $stmtKey->execute();
    $configIA = $stmtKey->fetchAll(PDO::FETCH_KEY_PAIR);

    $dbKey = $configIA['gemini_api_key'] ?? '';
    $dbModel = $configIA['gemini_api_model'] ?? '';

    // Fallbacks caso não configurado
    $geminiKey = $dbKey ?: "";
    $geminiModel = $dbModel ?: "gemini-1.5-flash";

    $gemini = new GeminiService($geminiKey, $geminiModel);

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
    function getAuthUser($pdo)
    {
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
            if (!$user || $user['perfil'] !== 'admin')
                jsonResponse(['error' => 'Não autorizado'], 403);
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
        if (!$user || $user['perfil'] !== 'admin')
            jsonResponse(['error' => 'Não autorizado'], 403);

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
        if (!$user || $user['perfil'] !== 'admin')
            jsonResponse(['error' => 'Não autorizado'], 403);

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

    // ROTA: Importar Bioimpedância (Proxy)
    if ($method === 'GET' && preg_match('/^\/importar-bio\/([a-zA-Z0-9-]+)$/', $uri, $matches)) {
        $uuid = $matches[1];
        $url = "https://balancaapi.avanutrionline.com/Relatorio/" . $uuid;

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false, // Compatibilidade com XAMPP sem certificados
            CURLOPT_HTTPHEADER => [
                "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept: application/json"
            ]
        ]);

        $data = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($data === false || $httpCode !== 200) {
            jsonResponse([
                'error' => 'Falha ao buscar dados do relatório',
                'http_code' => $httpCode,
                'curl_error' => $error
            ], 500);
        }

        header('Content-Type: application/json');
        echo $data;
        exit;
    }

    // ROTA: CRUD Alunas
    if (preg_match('/^\/alunas(\/(\d+))?$/', $uri, $matches)) {
        $user = getAuthUser($pdo);
        if (!$user)
            jsonResponse(['error' => 'Não autorizado'], 401);

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
                $mesAtual = date('Y-m');
                $stmt = $pdo->prepare("
                SELECT a.*, u.nome as professora_nome,
                (SELECT COUNT(*) FROM receitas r WHERE r.aluna_id = a.id AND r.mes = ? AND r.pago = 1) as pago_mes_atual
                FROM alunas a 
                LEFT JOIN usuarios u ON a.professora_id = u.id 
                WHERE a.ativa = 1 
                ORDER BY a.nome
            ");
                $stmt->execute([$mesAtual]);
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
            INSERT INTO alunas (nome, nascimento, email, cpf, telefone, professora_id, vezes_semana, data_inicio, dias_semana, horarios, data_vencimento, desconto)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                $input['data_vencimento'] ?? null,
                isset($input['desconto']) ? floatval($input['desconto']) : 0
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
            $valorBase = $precoConfig ? floatval($precoConfig['valor']) : 0;

            $stmtReceita = $pdo->prepare("
            INSERT INTO receitas (aluna_id, valor, vezes_semana, mes)
            VALUES (?, ?, ?, ?)
        ");
            $stmtReceita->execute([
                $alunaId,
                $valorBase,
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
            professora_id = ?, vezes_semana = ?, data_inicio = ?, dias_semana = ?, horarios = ?,
            data_vencimento = ?, desconto = ?
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
                $input['data_vencimento'] ?? null,
                isset($input['desconto']) ? floatval($input['desconto']) : 0,
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


    // POST - Upload de foto do treino
    if ($method === 'POST' && preg_match('/^\/treinos\/(\d+)\/foto$/', $uri, $matches)) {
        $user = getAuthUser($pdo);
        if (!$user)
            jsonResponse(['error' => 'Não autorizado'], 401);

        $id = $matches[1];
        if (!isset($_FILES['foto'])) {
            jsonResponse(['error' => 'Nenhuma imagem enviada'], 400);
        }

        $file = $_FILES['foto'];

        // Verificar se houve erro no upload (ex: PHP max size)
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errorMsgs = [
                UPLOAD_ERR_INI_SIZE => 'O arquivo excede o limite (upload_max_filesize)',
                UPLOAD_ERR_FORM_SIZE => 'O arquivo excede o limite do formulário',
                UPLOAD_ERR_PARTIAL => 'O upload foi feito apenas parcialmente',
                UPLOAD_ERR_NO_FILE => 'Nenhum arquivo enviado',
                UPLOAD_ERR_NO_TMP_DIR => 'Pasta temporária ausente',
                UPLOAD_ERR_CANT_WRITE => 'Falha ao escrever no disco',
                UPLOAD_ERR_EXTENSION => 'Extensão PHP interrompeu o upload'
            ];
            $msg = $errorMsgs[$file['error']] ?? 'Erro desconhecido no upload';
            jsonResponse(['error' => $msg, 'code' => $file['error']], 500);
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'webp'];

        if (!in_array($ext, $allowed)) {
            jsonResponse(['error' => 'Formato não suportado. Use JPG, JPEG, PNG ou WEBP.'], 400);
        }

        $uploadDir = __DIR__ . '/uploads/treinos/';
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0777, true)) {
                jsonResponse(['error' => 'Não foi possível criar o diretório de uploads. Verifique as permissões da pasta api/uploads/.'], 500);
            }
        }

        if (!is_writable($uploadDir)) {
            jsonResponse(['error' => 'O diretório de uploads não tem permissão de escrita (chmod).'], 500);
        }

        // Remover foto anterior se existir
        $stmt = $pdo->prepare("SELECT imagem_treino FROM treinos WHERE id = ?");
        $stmt->execute([$id]);
        $oldFile = $stmt->fetch()['imagem_treino'] ?? null;
        if ($oldFile) {
            $oldPath = $uploadDir . $oldFile;
            if (file_exists($oldPath)) {
                unlink($oldPath);
            }
        }

        $fileName = 'treino_' . $id . '_' . time() . '.' . $ext;
        $targetPath = $uploadDir . $fileName;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            $stmt = $pdo->prepare("UPDATE treinos SET imagem_treino = ? WHERE id = ?");
            $stmt->execute([$fileName, $id]);
            jsonResponse(['success' => true, 'path' => $fileName]);
        } else {
            jsonResponse(['error' => 'Falha ao mover o arquivo para a pasta final. Verifique as permissões de pasta.'], 500);
        }
    }

    // DELETE - Remover foto do treino
    if ($method === 'DELETE' && preg_match('/^\/treinos\/(\d+)\/foto$/', $uri, $matches)) {
        $user = getAuthUser($pdo);
        if (!$user)
            jsonResponse(['error' => 'Não autorizado'], 401);

        $id = $matches[1];

        // Buscar nome da imagem atual
        $stmt = $pdo->prepare("SELECT imagem_treino FROM treinos WHERE id = ?");
        $stmt->execute([$id]);
        $treino = $stmt->fetch();

        if ($treino && $treino['imagem_treino']) {
            $filePath = __DIR__ . '/uploads/treinos/' . $treino['imagem_treino'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }

            $stmt = $pdo->prepare("UPDATE treinos SET imagem_treino = NULL WHERE id = ?");
            $stmt->execute([$id]);
        }

        jsonResponse(['success' => true]);
    }

    // ROTA: Treinos
    if (preg_match('/^\/treinos(\/(\d+))?$/', $uri, $matches)) {
        $user = getAuthUser($pdo);
        if (!$user)
            jsonResponse(['error' => 'Não autorizado'], 401);

        $id = $matches[2] ?? null;

        // GET - Listar
        if ($method === 'GET') {
            if ($id) {
                // Auto-concluir treinos passados
                $pdo->prepare("UPDATE treinos SET status = 'concluido' WHERE aluna_id = ? AND status = 'pendente' AND data_proxima < ?")->execute([$id, date('Y-m-d')]);

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
                // Auto-concluir treinos passados geral
                $pdo->prepare("UPDATE treinos SET status = 'concluido' WHERE status = 'pendente' AND data_proxima < ?")->execute([date('Y-m-d')]);

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
            $dataTreino = new DateTime($input['data_treino']);

            if (isset($input['data_proxima']) && !empty($input['data_proxima'])) {
                $dataProxima = new DateTime($input['data_proxima']);
                // Se data manual, calcular quantas semanas isso representa
                $diff = $dataTreino->diff($dataProxima);
                $duracaoSemanas = ceil($diff->days / 7);
            } else {
                $duracaoSemanas = isset($input['duracao_semanas']) ? (int) $input['duracao_semanas'] : 8;
                $dataProxima = clone $dataTreino;
                $dataProxima->modify('+' . ($duracaoSemanas * 7) . ' days');
            }

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

            // Se tem duração ou data, recalcular data_proxima (ou aceitar data_proxima manual)
            if (isset($input['data_treino']) || isset($input['duracao_semanas']) || isset($input['data_proxima'])) {
                // Buscar treino atual
                $stmt = $pdo->prepare("SELECT * FROM treinos WHERE id = ?");
                $stmt->execute([$id]);
                $treino = $stmt->fetch();

                $dataTreinoStr = $input['data_treino'] ?? $treino['data_treino'];
                $dataTreino = new DateTime($dataTreinoStr);

                if (isset($input['data_proxima']) && !empty($input['data_proxima'])) {
                    $dataProxima = new DateTime($input['data_proxima']);
                    // Se data manual, recalcular semanas para a ficha ficar correta
                    $diff = $dataTreino->diff($dataProxima);
                    $duracaoSemanas = ceil($diff->days / 7);
                } else {
                    $duracaoSemanas = isset($input['duracao_semanas']) ? (int) $input['duracao_semanas'] : (int) ($treino['duracao_semanas'] ?? 8);
                    $dataProxima = clone $dataTreino;
                    $dataProxima->modify('+' . ($duracaoSemanas * 7) . ' days');
                }

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



        // DELETE - Deletar treino
        if ($method === 'DELETE' && $id) {
            $user = getAuthUser($pdo);
            if (!$user || $user['perfil'] !== 'admin')
                jsonResponse(['error' => 'Não autorizado'], 403);

            $stmt = $pdo->prepare("DELETE FROM treinos WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(['success' => true]);
        }
    }

    // ROTA: Treinos por professora
    if (preg_match('/^\/treinos\/professora\/(\d+)$/', $uri, $matches)) {
        $user = getAuthUser($pdo);
        if (!$user)
            jsonResponse(['error' => 'Não autorizado'], 401);

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

        // --- GERAÇÃO AUTOMÁTICA DE RECEITAS PARA O MÊS ---
        // 1. Pegar todas alunas ativas
        $stmtAlunas = $pdo->query("SELECT id, vezes_semana, desconto FROM alunas WHERE ativa = 1");
        $alunasAtivas = $stmtAlunas->fetchAll();

        // 2. Pegar todas receitas já existentes para este mês
        $stmtEx = $pdo->prepare("SELECT aluna_id FROM receitas WHERE mes = ?");
        $stmtEx->execute([$mes]);
        $idsComReceita = $stmtEx->fetchAll(PDO::FETCH_COLUMN);

        // 3. Pegar precos das configuracoes
        $stmtPrecos = $pdo->query("SELECT chave, valor FROM configuracoes WHERE chave LIKE 'preco_%'");
        $precosRows = $stmtPrecos->fetchAll();
        $precos = [];
        foreach ($precosRows as $pr) {
            $precos[$pr['chave']] = floatval($pr['valor']);
        }

        // 4. Criar receitas faltantes
        $stmtInsert = $pdo->prepare("INSERT INTO receitas (aluna_id, valor, vezes_semana, mes) VALUES (?, ?, ?, ?)");
        foreach ($alunasAtivas as $aluna) {
            if (!in_array($aluna['id'], $idsComReceita)) {
                $valorBase = $precos['preco_' . $aluna['vezes_semana'] . 'x'] ?? 0;
                $stmtInsert->execute([
                    $aluna['id'],
                    $valorBase,
                    $aluna['vezes_semana'],
                    $mes
                ]);
            }
        }
        // --- FIM DA GERAÇÃO ---

        $stmt = $pdo->prepare("
        SELECT r.*, a.nome as aluna_nome, a.desconto as aluna_desconto, a.data_vencimento as aluna_vencimento
        FROM receitas r
        JOIN alunas a ON r.aluna_id = a.id
        WHERE r.mes = ?
        ORDER BY r.pago DESC, a.nome
    ");
        $stmt->execute([$mes]);

        $receitas = $stmt->fetchAll();

        $total = 0;
        foreach ($receitas as $r) {
            $desconto = floatval($r['aluna_desconto'] ?? 0);
            $valorBase = floatval($r['valor']);
            $total += max(0, $valorBase - $desconto);
        }

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
        $meioPagamento = $input['meio_pagamento'] ?? 'Dinheiro';
        $tipoConta = $input['tipo_conta'] ?? 'cnpj'; // Padrão é CNPJ se não informado

        $stmt = $pdo->prepare("UPDATE receitas SET pago = 1, data_pagamento = ?, meio_pagamento = ?, tipo_conta = ? WHERE id = ?");
        $stmt->execute([date('Y-m-d'), $meioPagamento, $tipoConta, $id]);

        jsonResponse(['success' => true]);
    }

    // ROTA: Estornar Pagamento
    if (preg_match('/^\/receitas\/(\d+)\/estornar$/', $uri, $matches)) {
        $user = getAuthUser($pdo);
        if (!$user || $user['perfil'] !== 'admin') {
            jsonResponse(['error' => 'Não autorizado'], 403);
        }

        $id = $matches[1];

        $stmt = $pdo->prepare("UPDATE receitas SET pago = 0, data_pagamento = NULL, meio_pagamento = NULL WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse(['success' => true]);
    }

    // ROTA: Fiscal (Relatórios Dinâmicos)
    if ($uri === '/fiscal' && $method === 'GET') {
        $user = getAuthUser($pdo);
        if (!$user || $user['perfil'] !== 'admin') {
            jsonResponse(['error' => 'Não autorizado'], 403);
        }

        $mes = $_GET['mes'] ?? date('Y-m');
        
        $query = "
            SELECT r.*, a.nome as aluna_nome, a.cpf as aluna_cpf, a.nascimento as aluna_nascimento, a.desconto as aluna_desconto
            FROM receitas r
            JOIN alunas a ON r.aluna_id = a.id
            WHERE r.mes = ? AND r.pago = 1
        ";
        
        $params = [$mes];

        // Filtros opcionais simplificados (o frontend pode filtrar tb, mas aqui ajuda na performance)
        if (!empty($_GET['meio_pagamento'])) {
            $query .= " AND r.meio_pagamento = ?";
            $params[] = $_GET['meio_pagamento'];
        }

        if (!empty($_GET['tipo_conta'])) {
            $query .= " AND r.tipo_conta = ?";
            $params[] = $_GET['tipo_conta'];
        }

        $query .= " ORDER BY a.nome";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);

        jsonResponse($stmt->fetchAll());
    }

    // ROTA: Receitas (Existente)

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
        if (!$user)
            jsonResponse(['error' => 'Não autorizado'], 401);

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

        // DELETE - Deletar/Desativar usuário
        if ($method === 'DELETE' && $id) {
            // Buscar status atual
            $stmt = $pdo->prepare("SELECT ativo FROM usuarios WHERE id = ?");
            $stmt->execute([$id]);
            $u = $stmt->fetch();

            if (!$u)
                jsonResponse(['error' => 'Usuário não encontrado'], 404);

            if ($u['ativo']) {
                // Se ativo, apenas desativa (lógica antiga)
                $stmt = $pdo->prepare("UPDATE usuarios SET ativo = 0 WHERE id = ?");
                $stmt->execute([$id]);
                jsonResponse(['success' => true, 'message' => 'Membro desativado com sucesso']);
            } else {
                // Se já inativo, tenta excluir permanentemente
                // Verificação de segurança: não pode excluir se tiver alunas vinculadas
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM alunas WHERE professora_id = ?");
                $stmt->execute([$id]);
                if ($stmt->fetchColumn() > 0) {
                    jsonResponse(['error' => 'Este membro possui alunas vinculadas. Troque a professora das alunas antes de excluir permanentemente.'], 400);
                }

                $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");
                $stmt->execute([$id]);
                jsonResponse(['success' => true, 'message' => 'Membro excluído permanentemente']);
            }
        }
    }

    // ROTA: Anamnese CRUD
    if (preg_match('#^/anamnese(/(\d+))?$#', $uri, $matches)) {
        $user = getAuthUser($pdo);
        if (!$user)
            jsonResponse(['error' => 'Não autorizado'], 401);

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

            $columns = [
                'aluna_id',
                'nome',
                'nascimento',
                'idade',
                'estado_civil',
                'profissao',
                'telefone',
                'email',
                'altura',
                'peso',
                'imc',
                'gordura_corporal',
                'problema_saude',
                'problema_saude_qual',
                'liberacao_medica',
                'usa_medicamentos',
                'medicamentos_qual',
                'possui_alergias',
                'alergias_qual',
                'problemas_cardiacos',
                'cardiacos_qual',
                'problemas_respiratorios',
                'respiratorios_qual',
                'historico_familiar',
                'pratica_atividade',
                'atividade_qual',
                'frequentou_academia',
                'academia_tempo',
                'nivel_atividade',
                'objetivos',
                'tempo_objetivo',
                'habitos',
                'sofreu_lesoes',
                'lesoes_qual',
                'passou_cirurgias',
                'cirurgias_qual',
                'ultimo_ciclo',
                'menopausa',
                'menopausa_desde',
                'info_adicionais',
                'bioimpedancia_json'
            ];

            $placeholders = implode(',', array_fill(0, count($columns), '?'));
            $colNames = implode(',', $columns);

            $values = array_map(function ($col) use ($input) {
                return $input[$col] ?? null;
            }, $columns);

            $stmt = $pdo->prepare("INSERT INTO anamnese ($colNames) VALUES ($placeholders)");
            $stmt->execute($values);

            jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
        }

        // PUT - Atualizar anamnese
        if ($method === 'PUT' && $alunaId) {
            $input = getInput();

            $columns = [
                'nome',
                'nascimento',
                'idade',
                'estado_civil',
                'profissao',
                'telefone',
                'email',
                'altura',
                'peso',
                'imc',
                'gordura_corporal',
                'problema_saude',
                'problema_saude_qual',
                'liberacao_medica',
                'usa_medicamentos',
                'medicamentos_qual',
                'possui_alergias',
                'alergias_qual',
                'problemas_cardiacos',
                'cardiacos_qual',
                'problemas_respiratorios',
                'respiratorios_qual',
                'historico_familiar',
                'pratica_atividade',
                'atividade_qual',
                'frequentou_academia',
                'academia_tempo',
                'nivel_atividade',
                'objetivos',
                'tempo_objetivo',
                'habitos',
                'sofreu_lesoes',
                'lesoes_qual',
                'passou_cirurgias',
                'cirurgias_qual',
                'ultimo_ciclo',
                'menopausa',
                'menopausa_desde',
                'info_adicionais',
                'bioimpedancia_json'
            ];

            $setClause = implode(',', array_map(function ($col) {
                return "$col = ?";
            }, $columns));
            $values = array_map(function ($col) use ($input) {
                return $input[$col] ?? null;
            }, $columns);
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

    // ========== ROTAS DE IA ==========

    // ROTA: Gerar sugestão de treino
    if ($uri === '/ia/gerar-treino' && $method === 'POST') {
        $user = getAuthUser($pdo);
        if (!$user)
            jsonResponse(['error' => 'Não autorizado'], 401);

        $input = getInput();
        $alunaId = $input['aluna_id'] ?? null;
        if (!$alunaId)
            jsonResponse(['error' => 'ID da aluna é obrigatório'], 400);

        // Buscar dados essenciais da aluna
        $stmt = $pdo->prepare("SELECT a.nome, a.nascimento, a.data_inicio FROM alunas a WHERE a.id = ?");
        $stmt->execute([$alunaId]);
        $aluna = $stmt->fetch();

        // Buscar apenas campos relevantes da anamnese
        $stmt = $pdo->prepare("SELECT peso, altura, nivel_atividade, objetivos, sofreu_lesoes, lesoes_qual, passou_cirurgias, cirurgias_qual, problema_saude, problema_saude_qual FROM anamnese WHERE aluna_id = ? ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$alunaId]);
        $anamnese = $stmt->fetch();

        // Buscar apenas o último treino (descrição)
        $stmt = $pdo->prepare("SELECT descricao_treino, treino_num FROM treinos WHERE aluna_id = ? AND descricao_treino IS NOT NULL AND descricao_treino != '' ORDER BY treino_num DESC LIMIT 1");
        $stmt->execute([$alunaId]);
        $ultimoTreino = $stmt->fetch();

        // Montar contexto compacto
        $ctx = "Aluna: " . $aluna['nome'] . " | Início: " . $aluna['data_inicio'];
        if ($aluna['nascimento'])
            $ctx .= " | Nasc: " . $aluna['nascimento'];
        $ctx .= "\n";

        if ($anamnese) {
            if ($anamnese['peso'])
                $ctx .= "Peso: " . $anamnese['peso'] . "kg";
            if ($anamnese['altura'])
                $ctx .= " | Alt: " . $anamnese['altura'] . "cm";
            if ($anamnese['nivel_atividade'])
                $ctx .= " | Nível: " . $anamnese['nivel_atividade'];
            if ($anamnese['objetivos'])
                $ctx .= " | Obj: " . $anamnese['objetivos'];
            $ctx .= "\n";
            if ($anamnese['sofreu_lesoes'] && $anamnese['lesoes_qual'])
                $ctx .= "Lesões: " . $anamnese['lesoes_qual'] . "\n";
            if ($anamnese['passou_cirurgias'] && $anamnese['cirurgias_qual'])
                $ctx .= "Cirurgias: " . $anamnese['cirurgias_qual'] . "\n";
            if ($anamnese['problema_saude'] && $anamnese['problema_saude_qual'])
                $ctx .= "Saúde: " . $anamnese['problema_saude_qual'] . "\n";
        }

        if ($ultimoTreino) {
            $ctx .= "Último treino (#" . $ultimoTreino['treino_num'] . "):\n" . mb_substr($ultimoTreino['descricao_treino'], 0, 800) . "\n";
        }

        $prompt = "Padrão Magli (Pilates/Funcional Feminino). Crie a próxima evolução. Formato: Exercício | Séries x Reps. Sem introdução. Direto ao conteúdo.";

        $resposta = $gemini->generate($ctx, $prompt);
        jsonResponse(['sugestao' => $resposta]);
    }

    // ROTA: Chat da Admin
    if ($uri === '/ia/chat' && $method === 'POST') {
        $user = getAuthUser($pdo);
        if (!$user || $user['perfil'] !== 'admin')
            jsonResponse(['error' => 'Não autorizado'], 403);

        $input = getInput();
        $pergunta = $input['pergunta'] ?? '';
        $historico = $input['historico'] ?? [];

        $mesAtual = date('Y-m');

        // Resumos numéricos (leves)
        $totalAlunas = (int) $pdo->query("SELECT COUNT(*) FROM alunas WHERE ativa = 1")->fetchColumn();
        $totalEquipe = (int) $pdo->query("SELECT COUNT(*) FROM usuarios WHERE ativo = 1")->fetchColumn();

        // Equipe (poucos registros, ok enviar nomes)
        $equipe = $pdo->query("SELECT nome, perfil FROM usuarios WHERE ativo = 1 ORDER BY nome")->fetchAll();

        // Financeiro compacto e contagens (IA)
        $stmtF = $pdo->prepare("SELECT SUM(valor) FROM receitas WHERE mes = ? AND pago = 1");
        $stmtF->execute([$mesAtual]);
        $recebido = (float) $stmtF->fetchColumn();

        $stmtF = $pdo->prepare("SELECT SUM(valor), COUNT(DISTINCT aluna_id) FROM receitas WHERE mes = ? AND pago = 0");
        $stmtF->execute([$mesAtual]);
        $resPendentes = $stmtF->fetch(PDO::FETCH_ASSOC);
        $pendenteValor = (float) ($resPendentes['SUM(valor)'] ?? 0);
        $pendenteQtde = (int) ($resPendentes['COUNT(DISTINCT aluna_id)'] ?? 0);

        $stmtF = $pdo->prepare("SELECT SUM(valor) FROM despesas WHERE mes = ?");
        $stmtF->execute([$mesAtual]);
        $despesas = (float) $stmtF->fetchColumn();

        $totalRec = $pdo->query("SELECT SUM(valor) FROM receitas WHERE pago = 1")->fetchColumn() ?: 0;
        $totalDesp = $pdo->query("SELECT SUM(valor) FROM despesas")->fetchColumn() ?: 0;
        $saldo = (float) $totalRec - (float) $totalDesp;

        // Inadimplência total (contagem para a IA)
        $inadimplentesTotalQtde = (int) $pdo->query("SELECT COUNT(DISTINCT aluna_id) FROM receitas WHERE pago = 0 AND mes <= '$mesAtual'")->fetchColumn();

        // Lista de Inadimplência (máx 10)
        $stmtAt = $pdo->prepare("SELECT a.nome, r.mes FROM receitas r JOIN alunas a ON r.aluna_id = a.id WHERE r.pago = 0 AND r.mes <= ? ORDER BY r.mes DESC LIMIT 10");
        $stmtAt->execute([$mesAtual]);
        $atrasadas = $stmtAt->fetchAll();

        // Montar contexto compacto
        $ctx = "Espaço Magli (" . date('d/m/Y') . ") | Usuário: " . $user['nome'] . "\n";
        $ctx .= "Alunas ativas: $totalAlunas | Equipe: $totalEquipe\n";

        $ctx .= "Equipe: ";
        $nomes = [];
        foreach ($equipe as $m)
            $nomes[] = $m['nome'];
        $ctx .= implode(", ", $nomes) . "\n";

        $ctx .= "Financeiro $mesAtual: Recebido R$" . number_format($recebido, 2, ',', '.') . " | Pendente R$" . number_format($pendenteValor, 2, ',', '.') . " ($pendenteQtde alunas) | Despesas R$" . number_format($despesas, 2, ',', '.') . "\n";
        $ctx .= "Caixa total: R$" . number_format($saldo, 2, ',', '.') . "\n";
        $ctx .= "Total de alunas inadimplentes (geral): $inadimplentesTotalQtde\n";

        if (!empty($atrasadas)) {
            $ctx .= "Inadimplentes: ";
            $atr = [];
            foreach ($atrasadas as $at)
                $atr[] = $at['nome'];
            $ctx .= implode(", ", $atr) . "\n";
        }

        // Configuração Dinâmica de Ferramentas (Function Calling)
        $toolsConfig = [
            'declarations' => [
                [
                    "name" => "buscar_aluna",
                    "description" => "Busca informações e o treino atual de uma aluna no banco de dados.",
                    "parameters" => [
                        "type" => "OBJECT",
                        "properties" => [
                            "nome" => [
                                "type" => "STRING",
                                "description" => "Nome ou parte do nome da aluna"
                            ]
                        ],
                        "required" => ["nome"]
                    ]
                ],
                [
                    "name" => "atualizar_treino",
                    "description" => "Lança e salva um treino no banco de dados. DEVE ser acionado se o usuário pedir para gerar, adicionar, remover ou ajustar o treino.",
                    "parameters" => [
                        "type" => "OBJECT",
                        "properties" => [
                            "treino_id" => [
                                "type" => "INTEGER",
                                "description" => "O ID único do treino retornado na ferramenta buscar_aluna."
                            ],
                            "nova_descricao" => [
                                "type" => "STRING",
                                "description" => "Todo o texto da ficha de treino em markdown com o novo ajuste aplicado."
                            ]
                        ],
                        "required" => ["treino_id", "nova_descricao"]
                    ]
                ],
                [
                    "name" => "listar_alunas_pendentes",
                    "description" => "Lista os nomes de todas as alunas que possuem pagamentos pendentes no sistema.",
                    "parameters" => [
                        "type" => "OBJECT",
                        "properties" => [
                            "mes" => [
                                "type" => "STRING",
                                "description" => "O mês de referência no formato YYYY-MM (ex: 2026-04). Se não fornecido, busca do mês atual."
                            ]
                        ]
                    ]
                ],
                [
                    "name" => "analisar_saude_treinos",
                    "description" => "Faz uma varredura no banco de dados para identificar alunas com treinos vencendo em breve ou que já expiraram e precisam de troca.",
                    "parameters" => [
                        "type" => "OBJECT",
                        "properties" => (object) []
                    ]
                ],
                [
                    "name" => "obter_ficha_completa_aluna",
                    "description" => "Gera um RELATÓRIO COMPLETO da aluna. Busca o perfil (idade, horários), anamnese (dores, objetivos, patologias) e o histórico dos últimos 3 treinos realizados.",
                    "parameters" => [
                        "type" => "OBJECT",
                        "properties" => [
                            "aluna_id" => [
                                "type" => "INTEGER",
                                "description" => "O ID único da aluna (opcional se fornecer nome)."
                            ],
                            "nome" => [
                                "type" => "STRING",
                                "description" => "Nome da aluna para busca automática (opcional se fornecer ID)."
                            ]
                        ]
                    ]
                ],
                [
                    "name" => "salvar_novo_treino",
                    "description" => "Cria e salva um NOVO registro de treino para uma aluna no banco de dados. Use quando o usuário aprovar uma sugestão de novo treino ou pedir para 'registrar' algo novo.",
                    "parameters" => [
                        "type" => "OBJECT",
                        "properties" => [
                            "nome_aluna" => [
                                "type" => "STRING",
                                "description" => "O nome da aluna."
                            ],
                            "descricao_treino" => [
                                "type" => "STRING",
                                "description" => "O conteúdo completo do treino em Markdown."
                            ]
                        ],
                        "required" => ["nome_aluna", "descricao_treino"]
                    ]
                ],
                [
                    "name" => "gerar_relatorio_equipe",
                    "description" => "Gera um relatório detalhado da equipe, mostrando a distribuição de alunas por professora e a lista nominal de quem cada uma atende.",
                    "parameters" => [
                        "type" => "OBJECT",
                        "properties" => (object) []
                    ]
                ]
            ],
            'callbacks' => [
                'buscar_aluna' => function ($args) use ($pdo) {
                    $nome = $args['nome'] ?? '';
                    $stmt = $pdo->prepare("SELECT id, nome, professora_id FROM alunas WHERE ativa = 1 AND LOWER(nome) LIKE ? LIMIT 3");
                    $stmt->execute(['%' . mb_strtolower($nome) . '%']);
                    $alunas = $stmt->fetchAll(PDO::FETCH_ASSOC);

                    if (empty($alunas))
                        return "Nenhuma aluna encontrada com o nome: " . $nome;

                    foreach ($alunas as &$aluna) {
                        // Buscar treinos desta aluna
                        $stmtT = $pdo->prepare("SELECT id, treino_num, status, descricao_treino FROM treinos WHERE aluna_id = ? ORDER BY treino_num ASC");
                        $stmtT->execute([$aluna['id']]);
                        $aluna['treinos_disponiveis'] = $stmtT->fetchAll(PDO::FETCH_ASSOC);
                    }

                    return json_encode($alunas);
                },
                'atualizar_treino' => function ($args) use ($pdo) {
                    $treino_id = $args['treino_id'] ?? null;
                    $nova_descricao = $args['nova_descricao'] ?? '';

                    if (!$treino_id)
                        return "Erro: O ID do treino não foi fornecido pela IA.";

                    $stmt = $pdo->prepare("UPDATE treinos SET descricao_treino = ? WHERE id = ?");
                    $success = $stmt->execute([$nova_descricao, $treino_id]);

                    if ($success) {
                        return "Sucesso! O treino foi gravado fisicamente no banco.";
                    } else {
                        return "Erro ao gravar no banco. Diga ao usuário que houve uma falha de sistema.";
                    }
                },
                'listar_alunas_pendentes' => function ($args) use ($pdo) {
                    $mes = $args['mes'] ?? date('Y-m');
                    $stmt = $pdo->prepare("SELECT a.nome FROM receitas r JOIN alunas a ON r.aluna_id = a.id WHERE r.pago = 0 AND r.mes = ? ORDER BY a.nome ASC");
                    $stmt->execute([$mes]);
                    $lista = $stmt->fetchAll(PDO::FETCH_COLUMN);

                    if (empty($lista)) {
                        return "Não foram encontradas alunas pendentes para o período: " . $mes;
                    }

                    return "Alunas com pagamento pendente ($mes):\n- " . implode("\n- ", $lista);
                },
                'analisar_saude_treinos' => function ($args) use ($pdo) {
                    $hoje = date('Y-m-d');
                    $proximaSemana = date('Y-m-d', strtotime('+7 days'));

                    // 1. Alunas com treino vencendo em breve (7 dias)
                    $stmt1 = $pdo->prepare("
                        SELECT a.nome, t.data_proxima, t.treino_num 
                        FROM treinos t 
                        JOIN alunas a ON t.aluna_id = a.id 
                        WHERE a.ativa = 1 AND t.status = 'pendente' AND t.data_proxima <= ?
                        ORDER BY t.data_proxima ASC
                    ");
                    $stmt1->execute([$proximaSemana]);
                    $vencendo = $stmt1->fetchAll(PDO::FETCH_ASSOC);

                    // 2. Alunas ativas SEM treino pendente (Troca pendente)
                    $stmt2 = $pdo->query("
                        SELECT a.nome 
                        FROM alunas a 
                        WHERE a.ativa = 1 AND NOT EXISTS (
                            SELECT 1 FROM treinos t WHERE t.aluna_id = a.id AND t.status = 'pendente'
                        )
                    ");
                    $expirados = $stmt2->fetchAll(PDO::FETCH_COLUMN);

                    $res = "### Diagnóstico de Saúde dos Treinos\n\n";

                    if (!empty($vencendo)) {
                        $res .= "📅 **Vencendo em breve (Próximos 7 dias):**\n";
                        foreach ($vencendo as $v) {
                            $res .= "- " . $v['nome'] . " (Treino " . $v['treino_num'] . " vence em " . date('d/m', strtotime($v['data_proxima'])) . ")\n";
                        }
                    } else {
                        $res .= "✅ Nenhuma aluna com treino vencendo nos próximos 7 dias.\n";
                    }

                    $res .= "\n";

                    if (!empty($expirados)) {
                        $res .= "⚠️ **Pendente de Troca (Expirados ou Sem Treino Ativo):**\n";
                        foreach ($expirados as $e) {
                            $res .= "- " . $e . "\n";
                        }
                    } else {
                        $res .= "✅ Todas as alunas ativas possuem treinos válidos.\n";
                    }

                    return $res;
                },
                'obter_ficha_completa_aluna' => function ($args) use ($pdo) {
                    $id = $args['aluna_id'] ?? null;
                    $nome = $args['nome'] ?? null;

                    if (!$id && $nome) {
                        $stmtS = $pdo->prepare("SELECT id FROM alunas WHERE ativa = 1 AND LOWER(nome) LIKE ? LIMIT 1");
                        $stmtS->execute(['%' . mb_strtolower($nome) . '%']);
                        $id = $stmtS->fetchColumn();
                    }

                    if (!$id) return "Erro: Aluna não encontrada ou ID/Nome não fornecido. Use 'buscar_aluna' se tiver dúvidas.";

                    // 1. Dados da Aluna
                    $stmtA = $pdo->prepare("SELECT nome, nascimento, vezes_semana, dias_semana, horarios FROM alunas WHERE id = ?");
                    $stmtA->execute([$id]);
                    $aluna = $stmtA->fetch(PDO::FETCH_ASSOC);

                    // 2. Anamnese
                    $stmtAn = $pdo->prepare("SELECT * FROM anamnese WHERE aluna_id = ?");
                    $stmtAn->execute([$id]);
                    $anamnese = $stmtAn->fetch(PDO::FETCH_ASSOC);

                    // 3. Histórico de Treinos (Últimos 3)
                    $stmtT = $pdo->prepare("SELECT treino_num, data_proxima, descricao_treino, status FROM treinos WHERE aluna_id = ? ORDER BY id DESC LIMIT 3");
                    $stmtT->execute([$id]);
                    $historico = $stmtT->fetchAll(PDO::FETCH_ASSOC);

                    $res = "### FICHA COMPLETA: " . ($aluna['nome'] ?? 'Desconhecida') . "\n";
                    $res .= "**Perfil:** Nascimento: " . ($aluna['nascimento'] ?? 'N/A') . " | Frequência: " . ($aluna['vezes_semana'] ?? 'N/A') . "x na semana\n";
                    
                    if ($anamnese) {
                        $res .= "\n**ANAMNESE:**\n";
                        $res .= "- Objetivo: " . ($anamnese['objetivo'] ?? 'N/A') . "\n";
                        $res .= "- Lesões/Dores: " . ($anamnese['lesoes_dores'] ?? 'Não') . " (" . ($anamnese['onde_dores'] ?? '') . ")\n";
                        $res .= "- Cirurgias: " . ($anamnese['cirurgias'] ?? 'Não') . "\n";
                        $res .= "- Medicamentos: " . ($anamnese['medicacao'] ?? 'Não') . "\n";
                        $res .= "- Observações: " . ($anamnese['observacoes_anamnese'] ?? 'Nenhum') . "\n";
                    }

                    if (!empty($historico)) {
                        $res .= "\n**HISTÓRICO RECENTE (Últimos treinos):**\n";
                        foreach ($historico as $h) {
                            $res .= "--- Treino " . $h['treino_num'] . " (" . $h['status'] . ") ---\n";
                            $res .= $h['descricao_treino'] . "\n";
                        }
                    }

                    return $res;
                },
                'salvar_novo_treino' => function ($args) use ($pdo) {
                    $nome = $args['nome_aluna'] ?? null;
                    $descricao = $args['descricao_treino'] ?? '';

                    if (!$nome) return "Erro: Nome da aluna não fornecido.";

                    // 1. Buscar ID da Aluna
                    $stmtA = $pdo->prepare("SELECT id, professora_id FROM alunas WHERE ativa = 1 AND LOWER(nome) LIKE ? LIMIT 1");
                    $stmtA->execute(['%' . mb_strtolower($nome) . '%']);
                    $aluna = $stmtA->fetch(PDO::FETCH_ASSOC);

                    if (!$aluna) return "Erro: Aluna '$nome' não encontrada.";

                    $aluna_id = $aluna['id'];
                    $professor_id = $aluna['professora_id'];

                    // 2. Buscar último número de treino
                    $stmtN = $pdo->prepare("SELECT MAX(treino_num) as ultimo FROM treinos WHERE aluna_id = ?");
                    $stmtN->execute([$aluna_id]);
                    $ultimo = $stmtN->fetch()['ultimo'] ?? 0;
                    $novoNum = $ultimo + 1;

                    // 3. Gerar Datas
                    $hoje = date('Y-m-d');
                    $validade = date('Y-m-d', strtotime('+56 days'));

                    // 4. Inserir
                    $stmtI = $pdo->prepare("
                        INSERT INTO treinos (aluna_id, professor_id, treino_num, data_treino, data_proxima, duracao_semanas, status, descricao_treino)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $success = $stmtI->execute([
                        $aluna_id,
                        $professor_id,
                        $novoNum,
                        $hoje,
                        $validade,
                        8,
                        'pendente',
                        $descricao
                    ]);

                    if ($success) {
                        return "Sucesso! Novo treino (Nº $novoNum) registrado para $nome com validade até " . date('d/m/Y', strtotime($validade));
                    } else {
                        return "Erro ao gravar no banco de dados.";
                    }
                },
                'gerar_relatorio_equipe' => function ($args) use ($pdo) {
                    $stmt = $pdo->prepare("
                        SELECT u.nome as professora, COUNT(a.id) as total, GROUP_CONCAT(a.nome, ', ') as lista
                        FROM usuarios u
                        LEFT JOIN alunas a ON u.id = a.professora_id AND a.ativa = 1
                        WHERE u.perfil = 'professora' AND u.ativo = 1
                        GROUP BY u.id
                        ORDER BY total DESC
                    ");
                    $stmt->execute();
                    $dados = $stmt->fetchAll(PDO::FETCH_ASSOC);

                    if (empty($dados)) return "Nenhuma professora encontrada no sistema.";

                    $res = "### RELATÓRIO DE DISTRIBUIÇÃO DA EQUIPE\n\n";
                    foreach ($dados as $d) {
                        $res .= "👤 **Professora " . $d['professora'] . "**\n";
                        $res .= "- Total de alunas: " . $d['total'] . "\n";
                        $res .= "- Lista: " . ($d['lista'] ?: "Nenhuma aluna vinculada") . "\n\n";
                    }
                    return $res;
                }
            ]
        ];

        // Buscar Nome e Personalidade da IA
        $stmtName = $pdo->prepare("SELECT valor FROM configuracoes WHERE chave = 'gemini_api_name'");
        $stmtName->execute();
        $aiName = $stmtName->fetchColumn() ?: "Magli AI";

        $stmtPers = $pdo->prepare("SELECT valor FROM configuracoes WHERE chave = 'gemini_api_personality'");
        $stmtPers->execute();
        $aiPersonality = $stmtPers->fetchColumn() ?: "uma assistente Magli prestativa e profissional";

        $ctx .= "Responda como assistente $aiName. PERSONALIDADE: $aiPersonality. Chame o usuário de " . $user['nome'] . ". Seja direto, profissional e focado em AÇÃO. REGRAS CRÍTICAS: 1. SE O USUÁRIO FORNECER UM NOME DE ALUNA (ex: 'relatório da Maria'), USE A FERRAMENTA 'obter_ficha_completa_aluna' IMEDIATAMENTE. Não peça confirmação de nome nem ID. Assuma que o nome está correto. 2. NUNCA peça IDs técnicos ao usuário. Use o campo 'nome' das ferramentas para busca automática. 3. Se o usuário gostar de uma sugestão de treino e disser 'salve', use IMEDIATAMENTE a ferramenta 'salvar_novo_treino' passando o nome da aluna e o texto sugerido. 4. Só peça ajuda se as ferramentas retornarem erro de 'Aluna não encontrada'. 5. Após usar uma ferramenta, você DEVE sempre elaborar uma resposta em texto para o usuário, explicando os resultados ou apresentando a sugestão solicitada.";

        // Passa a configuração dinâmica de ferramentas (Tools)
        $resposta = $gemini->generate($ctx, $pergunta, $historico, $toolsConfig);
        jsonResponse(['resposta' => $resposta]);
    }

    // Rota não encontrada
    jsonResponse(['error' => 'Rota não encontrada'], 404);

} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Erro interno do servidor',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    exit;
}
?> ]);
exit;
}
?>