<?php
// Conexão com SQLite
class Database {
    private static $instance = null;
    private $pdo;
    
    private function __construct() {
        // No servidor de produção o banco está na raiz
        $rootDb = dirname(dirname(__DIR__)) . '/magli.db';
        $apiDb  = dirname(__DIR__) . '/database/magli.db';
        
        if (file_exists($rootDb)) {
            $dbPath = $rootDb;
        } else {
            $dbPath = $apiDb;
            $dir = dirname($dbPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
        
        $this->pdo = new PDO('sqlite:' . $dbPath);
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        
        try {
            $this->createTables();
            $this->runMigrations();
        } catch (\PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'error' => 'Database initialization error',
                'description' => $e->getMessage()
            ]);
            exit;
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance->pdo;
    }

    public static function getDbPath() {
        $rootDb = dirname(dirname(__DIR__)) . '/magli.db';
        if (file_exists($rootDb)) return $rootDb;
        return dirname(__DIR__) . '/database/magli.db';
    }
    
    private function createTables() {
        // Tabela de usuários
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                senha TEXT NOT NULL,
                perfil TEXT NOT NULL DEFAULT 'professora',
                ativo INTEGER DEFAULT 1,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");
        
        // Tabela de alunas
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS alunas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                nascimento DATE,
                email TEXT,
                cpf TEXT,
                telefone TEXT,
                professora_id INTEGER,
                vezes_semana INTEGER,
                data_inicio DATE,
                dias_semana TEXT,
                horarios TEXT,
                data_vencimento DATE,
                desconto REAL DEFAULT 0,
                ativa INTEGER DEFAULT 1,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (professora_id) REFERENCES usuarios(id)
            )
        ");
        
        // Tabela de anamnese
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS anamnese (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aluna_id INTEGER NOT NULL,
                questoes TEXT,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (aluna_id) REFERENCES alunas(id)
            )
        ");
        
        // Tabela de treinos (trocas)
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS treinos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aluna_id INTEGER NOT NULL,
                professor_id INTEGER NOT NULL,
                treino_num INTEGER NOT NULL,
                data_treino DATE NOT NULL,
                data_proxima DATE,
                duracao_semanas INTEGER DEFAULT 8,
                descricao_treino TEXT DEFAULT '',
                status TEXT DEFAULT 'pendente',
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (aluna_id) REFERENCES alunas(id),
                FOREIGN KEY (professor_id) REFERENCES usuarios(id)
            )
        ");
        
        // Tabela de receitas
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS receitas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aluna_id INTEGER NOT NULL,
                valor REAL NOT NULL,
                vezes_semana INTEGER,
                pago INTEGER DEFAULT 0,
                data_pagamento DATE,
                mes TEXT,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (aluna_id) REFERENCES alunas(id)
            )
        ");
        
        // Tabela de despesas
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS despesas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                descricao TEXT NOT NULL,
                valor REAL NOT NULL,
                mes TEXT,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");
        
        // Tabela de ex-alunas
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS ex_alunas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aluna_id INTEGER NOT NULL,
                nome TEXT NOT NULL,
                motivo TEXT,
                data_saida DATE NOT NULL,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (aluna_id) REFERENCES alunas(id)
            )
        ");

        // Tabela de configurações
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS configuracoes (
                chave TEXT PRIMARY KEY,
                valor TEXT NOT NULL
            )
        ");

        // Tabela de Anamnese
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS anamnese (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aluna_id INTEGER NOT NULL,
                nome TEXT, nascimento TEXT, idade TEXT, estado_civil TEXT, profissao TEXT,
                telefone TEXT, email TEXT,
                altura TEXT, peso TEXT, imc TEXT, gordura_corporal TEXT,
                problema_saude TEXT, problema_saude_qual TEXT, liberacao_medica TEXT,
                usa_medicamentos TEXT, medicamentos_qual TEXT,
                possui_alergias TEXT, alergias_qual TEXT,
                problemas_cardiacos TEXT, cardiacos_qual TEXT,
                problemas_respiratorios TEXT, respiratorios_qual TEXT,
                historico_familiar TEXT,
                pratica_atividade TEXT, atividade_qual TEXT,
                frequentou_academia TEXT, academia_tempo TEXT,
                nivel_atividade TEXT,
                objetivos TEXT, tempo_objetivo TEXT,
                habitos TEXT,
                sofreu_lesoes TEXT, lesoes_qual TEXT,
                passou_cirurgias TEXT, cirurgias_qual TEXT,
                ultimo_ciclo TEXT, menopausa TEXT, menopausa_desde TEXT,
                info_adicionais TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (aluna_id) REFERENCES alunas(id)
            )
        ");
        
        // Inserir admin padrão se não existir
        $stmt = $this->pdo->query("SELECT COUNT(*) FROM usuarios WHERE perfil = 'admin'");
        if ($stmt->fetchColumn() == 0) {
            $senha = password_hash('admin123', PASSWORD_DEFAULT);
            $this->pdo->exec("
                INSERT INTO usuarios (nome, email, senha, perfil) 
                VALUES ('Daiane', 'admin@magli.com.br', '$senha', 'admin')
            ");
        }

        // Inserir preços padrão se não existir
        $stmt = $this->pdo->query("SELECT COUNT(*) FROM configuracoes WHERE chave = 'preco_1x'");
        if ($stmt->fetchColumn() == 0) {
            $this->pdo->exec("INSERT INTO configuracoes (chave, valor) VALUES ('preco_1x', '100')");
            $this->pdo->exec("INSERT INTO configuracoes (chave, valor) VALUES ('preco_2x', '150')");
            $this->pdo->exec("INSERT INTO configuracoes (chave, valor) VALUES ('preco_3x', '180')");
            $this->pdo->exec("INSERT INTO configuracoes (chave, valor) VALUES ('preco_4x', '220')");
            $this->pdo->exec("INSERT INTO configuracoes (chave, valor) VALUES ('preco_5x', '260')");
        }
    }

    private function runMigrations() {
        // Adicionar colunas novas à tabela treinos se não existirem
        try {
            $this->pdo->query("SELECT duracao_semanas FROM treinos LIMIT 1");
        } catch (PDOException $e) {
            $this->pdo->exec("ALTER TABLE treinos ADD COLUMN duracao_semanas INTEGER DEFAULT 8");
            $this->pdo->exec("ALTER TABLE treinos ADD COLUMN descricao_treino TEXT DEFAULT ''");
        }

        // Adicionar imagem_treino na tabela treinos
        try {
            $this->pdo->query("SELECT imagem_treino FROM treinos LIMIT 1");
        } catch (PDOException $e) {
            $this->pdo->exec("ALTER TABLE treinos ADD COLUMN imagem_treino TEXT DEFAULT NULL");
        }

        // Adicionar colunas novas à tabela alunas se não existirem
        try {
            $this->pdo->query("SELECT data_vencimento FROM alunas LIMIT 1");
        } catch (PDOException $e) {
            $this->pdo->exec("ALTER TABLE alunas ADD COLUMN data_vencimento DATE");
            $this->pdo->exec("ALTER TABLE alunas ADD COLUMN desconto REAL DEFAULT 0");
        }

        // Adicionar meio_pagamento na tabela receitas
        try {
            $this->pdo->query("SELECT meio_pagamento FROM receitas LIMIT 1");
        } catch (PDOException $e) {
            $this->pdo->exec("ALTER TABLE receitas ADD COLUMN meio_pagamento TEXT DEFAULT NULL");
        }

        // Adicionar tipo_conta na tabela receitas
        try {
            $this->pdo->query("SELECT tipo_conta FROM receitas LIMIT 1");
        } catch (PDOException $e) {
            $this->pdo->exec("ALTER TABLE receitas ADD COLUMN tipo_conta TEXT DEFAULT 'cnpj'");
        }

        // Migração Agressiva para Anamnese (Resolve 500 Errors no HostGator)
        // Se a tabela já existir mas estiver com formato desatualizado (faltando novas colunas), 
        // ela precisa ser dropada e recriada, já que versões anteriores nem funcionavam direito.
        try {
            $stmt = $this->pdo->query("PRAGMA table_info(anamnese)");
            $columns = $stmt->fetchAll();
            if (!empty($columns)) {
                $colNames = array_column($columns, 'name');
                $expectedCols = ['nome', 'nascimento', 'idade', 'email', 'telefone', 'peso', 'imc', 'info_adicionais', 'ultimo_ciclo'];
                $missingCols = false;
                
                foreach ($expectedCols as $ec) {
                    if (!in_array($ec, $colNames)) {
                        $missingCols = true;
                        break;
                    }
                }
                
                if ($missingCols) {
                    $this->pdo->exec("DROP TABLE IF EXISTS anamnese");
                }
            }
        } catch (PDOException $e) {}

        // Migração para bioimpedancia_json
        try {
            $this->pdo->query("SELECT bioimpedancia_json FROM anamnese LIMIT 1");
        } catch (PDOException $e) {
            $this->pdo->exec("ALTER TABLE anamnese ADD COLUMN bioimpedancia_json TEXT DEFAULT NULL");
        }

        // Criar tabela anamnese se não existir (migração para BDs existentes)
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS anamnese (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aluna_id INTEGER NOT NULL,
                nome TEXT, nascimento TEXT, idade TEXT, estado_civil TEXT, profissao TEXT,
                telefone TEXT, email TEXT,
                altura TEXT, peso TEXT, imc TEXT, gordura_corporal TEXT,
                problema_saude TEXT, problema_saude_qual TEXT, liberacao_medica TEXT,
                usa_medicamentos TEXT, medicamentos_qual TEXT,
                possui_alergias TEXT, alergias_qual TEXT,
                problemas_cardiacos TEXT, cardiacos_qual TEXT,
                problemas_respiratorios TEXT, respiratorios_qual TEXT,
                historico_familiar TEXT,
                pratica_atividade TEXT, atividade_qual TEXT,
                frequentou_academia TEXT, academia_tempo TEXT,
                nivel_atividade TEXT,
                objetivos TEXT, tempo_objetivo TEXT,
                habitos TEXT,
                sofreu_lesoes TEXT, lesoes_qual TEXT,
                passou_cirurgias TEXT, cirurgias_qual TEXT,
                ultimo_ciclo TEXT, menopausa TEXT, menopausa_desde TEXT,
                info_adicionais TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (aluna_id) REFERENCES alunas(id)
            )
        ");
    }
}

// Helper para responder JSON
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Helper para pegar corpo da requisição (usa cache global)
function getInput() {
    return $GLOBALS['_PARSED_INPUT'] ?? [];
}
?>