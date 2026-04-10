# Especificações Técnicas - Agente Magli AI 🤖

Este documento detalha o funcionamento técnico do agente de inteligência artificial do sistema Magli, validado conforme a implementação atual e as configurações do sistema (10/04/2026).

---

## 🛠 1. Especificações Técnicas (Validadas)

O Agente Magli é um assistente autônomo de alta performance, configurado para tomada de decisão em tempo real.

### Arquitetura do Sistema
- **Motor de IA:** Google Gemini AI (Versão `v1beta`).
- **Modelo Ativo:** `gemini-2.5-flash-lite` (Confirmado via Painel Administrativo).
- **Vantagem do Modelo:** Versão otimizada para maior velocidade de resposta e limites de uso flexíveis.
- **Ambiente Backend:** PHP 8.2.12 (XAMPP/Windows).
- **Banco de Dados:** SQLite 3 (Cursos e dados das alunas).
- **Lógica de Raciocínio:** *Function Calling* (Chamada de Ferramentas) recursiva com profundidade de até **5 níveis**.
- **Memória de Curto Prazo:** Janela deslizante (*Sliding Window*) das **últimas 8 mensagens** da conversa.
- **Segurança de Histórico:** Normalização automática para garantir que cada interação comece com um comando do usuário (*User-First Protocol*).

### Ferramentas Integradas (Capabilities - 7 Ferramentas)
1.  **`obter_ficha_completa_aluna`**: Consolida Perfil, Anamnese e Histórico de Treinos.
2.  **`salvar_novo_treino`**: Automatiza a gravação de treinos com cálculo de datas (8 semanas).
3.  **`analisar_saude_treinos`**: Varredura proativa de treinos expirados ou próximos do vencimento.
4.  **`listar_alunas_pendentes`**: Auditoria de inadimplência no módulo financeiro.
5.  **`gerar_relatorio_equipe`**: Detalha a distribuição de alunas por professora e a lista nominal de cada uma.
6.  **`buscar_aluna`**: Localização inteligente por nome ou fragmento.
7.  **`atualizar_treino`**: Ajustes dinâmicos em fichas de treino existentes.

---

## 📖 2. Manual do Usuário (Guia Rápido)

Olá! Eu sou a Magli. Agora estou operando na versão **2.5 Flash-Lite**, o que me torna ainda mais rápida para cuidar do seu estúdio.

### O que eu faço por você:

#### 📊 Monitoramento e Relatórios
- **Ficha Completa:** Basta dizer *"Relatório da Alessandra"* ou *"Ficha da Shirley"*.
- **Onde paramos?**: *"Quais foram os últimos exercícios da Joyce?"*

#### 🏋️ Inteligência em Treinos
- **Análise Contextual:** *"Com base nas dores relatadas na anamnese dela, sugira um treino de mobilidade"*.
- **Automação de Gravação:** Se você gostar da minha sugestão, diga *"Salve esse treino agora"*. Eu cuido de toda a burocracia de IDs e datas para você.

#### ⚖️ Gestão Administrativa
- **Saúde do Estúdio:** *"Quem está com o treino vencido?"*
- **Financeiro Lite:** *"Liste quem está pendente este mês"*.
- **Gestão de Equipe:** *"Qual a distribuição de alunas por professora?"*.

### Dicas de Uso:
1.  **Linguagem Natural:** Não precisa usar comandos técnicos. Fale comigo como falaria com um assistente humano.
2.  **Perguntas Compostas (NOVO):** Você pode fazer várias perguntas de uma vez (ex: "Quantas alunas temos e quem está com o treino vencendo?"). Eu processarei todas as ações em paralelo para te dar uma resposta única e completa.
3.  **Confiança nos Nomes:** Eu resolvo ambiguidade de nomes internamente. Se houver erro, eu te aviso!
4.  **Sugestão de Treinos:** Minhas sugestões são baseadas no que a aluna já fez e no que ela relatou na anamnese.

---
**Documentação Técnica Final:** Reflete as configurações ativas no arquivo `api/ia/GeminiService.php` e no banco de dados `magli.db`. Conforme auditoria técnica de 10/04/2026.
