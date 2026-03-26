# Espaço Magli - Sistema de Gestão

Sistema de gerenciamento para estúdio de pilates com funcionalidade **offline-first** (PWA).

## 🚀 Funcionalidades

### Landing Page
- Divulgação do estúdio
- Informações de planos e horários
- Contato

### Área da Equipe (Professoras)
- **Ficha Cadastral/Anamnese** - Cadastro completo de alunas
- **Troca de Treinos** - Por professora, com cálculo automático de 60 dias
- **Quadro de Horários** - Visualização por dia/hora

### Área Administrativa
- **Ficha Cadastral** - Gerenciamento completo
- **Número de Alunas** - Lista automática por ordem alfabética
- **Financeiro** - Receitas e Despesas com totais automáticos
- **Troca de Treinos Daiane** - Treinos específicos da admin
- **Troca de Treinos Geral** - Todas as alunas ordenadas por data
- **Ex-Alunas** - Histórico de alunas desabilitadas
- **Quadro de Horários** - Visão geral com contagem

### Funcionalidades Offline (PWA)
- ✅ Aplicação funciona 100% offline
- ✅ Dados salvos localmente (IndexedDB)
- ✅ Sincronização automática quando online
- ✅ Instalável como app no celular/desktop
- ✅ Notificações push para troca de treinos

## 🎨 Design
- **Cores**: Rosa Choque (#E91E63) + Preto
- **Estilo**: Glassmorphism, animações sutis
- **Responsivo**: Mobile-first, adaptado para todos os dispositivos
- **Tendência 2026**: Design moderno e minimalista

## 📁 Estrutura

```
Magli/
├── frontend/                    # React App
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json        # PWA manifest
│   │   ├── service-worker.js    # Service Worker
│   │   └── .htaccess           # Apache config
│   ├── src/
│   │   ├── components/          # Componentes reutilizáveis
│   │   ├── contexts/           # Context API (Auth)
│   │   ├── pages/              # Páginas
│   │   ├── services/           # IndexedDB service
│   │   ├── App.js
│   │   └── App.css
│   └── package.json
│
└── api/                         # Backend PHP
    ├── config/
    │   └── database.php        # SQLite + tabelas
    ├── index.php               # API REST
    └── .htaccess               # CORS + Rewrite
```

## 🛠️ Tecnologias

- **Frontend**: React 18, React Router 6
- **Backend**: PHP 8+ (sem frameworks)
- **Banco de dados**: SQLite
- **PWA**: Service Worker, IndexedDB
- **Hospedagem**: Apache + cPanel

## 📋 Instalação

### 1. Backend (API)

1. Copie a pasta `api/` para `public_html/api/` no servidor
2. O banco SQLite será criado automaticamente em `api/database/magli.db`
3. Verifique as permissões de escrita na pasta `database/`

### 2. Frontend

```bash
# Instalar dependências
cd frontend
npm install

# Build para produção
npm run build

# Copie a pasta build/ para public_html/ no servidor
```

### 3. Configuração

O frontend espera que a API esteja em `/api`. Se necessário, ajuste a URL em:
- `src/contexts/AuthContext.js` - variável `API_URL`

## 🔐 Credenciais Padrão

**Admin:**
- Email: `admin@magli.com.br`
- Senha: `admin123`

⚠️ **Importante**: Altere a senha após primeiro acesso!

## 📱 PWA (Progressive Web App)

O sistema funciona como um app instalável:

1. Acesse o site pelo navegador
2. Aguarde o prompt de instalação ou use "Adicionar à tela inicial"
3. O app será instalado e funcionará offline

### Funcionalidades Offline

- Dados são salvos no IndexedDB
- Service Worker faz cache de todas as páginas
- Ao voltar online, sincronização automática
- Indicador visual de status (online/offline)

## 🔔 Notificações

O sistema suporta notificações para:
- Lembretes de troca de treino
- Alertas de pagamentos pendentes

Para ativar, o usuário deve permitir notificações no navegador.

## 🌐 URLs

- **Landing Page**: `espacomagli.com.br/`
- **Admin Login**: `espacomagli.com.br/admin`
- **Área da Equipe**: `espacomagli.com.br/equipe` (professoras)
- **Área Admin**: `espacomagli.com.br/admin/dashboard` (admin)
- **API**: `espacomagli.com.br/api/`

## 📊 Valores dos Planos

| Frequência | Valor |
|------------|-------|
| 1x semana  | R$ 100 |
| 2x semana  | R$ 150 |
| 3x semana  | R$ 180 |
| 4x semana  | R$ 220 |

## 🔧 Manutenção

### Backup do Banco

```bash
# Download do arquivo SQLite
scp usuario@servidor:~/public_html/api/database/magli.db ./
```

### Limpar Cache PWA

```javascript
// Console do navegador
navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
location.reload();
```

## 📝 Licença

Propriedade de Espaço Magli - Todos os direitos reservados.