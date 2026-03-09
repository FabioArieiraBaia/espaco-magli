import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function TrocaTreinos({ geral, professora }) {
  const { api, user, isAdmin } = useAuth();
  const [treinos, setTreinos] = useState([]);
  const [alunas, setAlunas] = useState([]); // state for all active students
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(null); // treino being edited
  const [selectedAluna, setSelectedAluna] = useState(null);
  const [expandedTreino, setExpandedTreino] = useState(null);
  const [search, setSearch] = useState('');

  // Novo treino form
  const [novoTreino, setNovoTreino] = useState({
    data_treino: '',
    duracao_semanas: 8,
    descricao_treino: ''
  });

  // Edit treino form
  const [editForm, setEditForm] = useState({
    data_treino: '',
    data_proxima: '',
    duracao_semanas: 8,
    descricao_treino: '',
    status: 'pendente'
  });

  useEffect(() => {
    if (!api) return;
    loadTreinos();
  }, [api, geral, professora]);

  const loadTreinos = async () => {
    if (!api) return;
    try {
      const [resTreinos, resAlunas] = await Promise.all([
        geral ? api.get('/treinos') : api.get(`/treinos/professora/${user?.id}`),
        api.get('/alunas')
      ]);
      setTreinos(resTreinos.data);
      setAlunas(resAlunas.data);
    } catch (error) {
      console.error('Erro ao carregar treinos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar treinos por aluna, garantindo que todas as alunas ativas apareçam
  const treinosPorAluna = alunas.reduce((acc, a) => {
    acc[a.id] = {
      nome: a.nome,
      professora_nome: a.professora_nome,
      treinos: [],
    };
    return acc;
  }, {});

  treinos.forEach(t => {
    if (treinosPorAluna[t.aluna_id]) {
      treinosPorAluna[t.aluna_id].treinos.push(t);
    }
  });

  // Verificar treinos próximos (alarme)
  const hoje = new Date();
  const treinosProximos = treinos.filter(t => {
    const dataProxima = new Date(t.data_proxima);
    const diff = Math.ceil((dataProxima - hoje) / (1000 * 60 * 60 * 24));
    return diff <= 3 && diff >= 0 && t.status === 'pendente';
  });

  const adicionarTreino = async (alunaId) => {
    if (!novoTreino.data_treino) return;

    try {
      await api.post('/treinos', {
        aluna_id: alunaId,
        professor_id: user?.id,
        data_treino: novoTreino.data_treino,
        duracao_semanas: novoTreino.duracao_semanas,
        descricao_treino: novoTreino.descricao_treino,
      });
      loadTreinos();
      setShowModal(false);
      setNovoTreino({ data_treino: '', duracao_semanas: 8, descricao_treino: '' });
    } catch (error) {
      console.error('Erro ao adicionar treino:', error);
    }
  };

  const salvarEdicao = async () => {
    if (!editModal) return;
    try {
      await api.put(`/treinos/${editModal}`, editForm);
      loadTreinos();
      setEditModal(null);
    } catch (error) {
      console.error('Erro ao editar treino:', error);
    }
  };

  const marcarConcluido = async (treinoId) => {
    try {
      await api.put(`/treinos/${treinoId}`, { status: 'concluido' });
      loadTreinos();
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const excluirTreino = async (id) => {
    if (!window.confirm('Deseja realmente deletar este registro de treino?')) return;
    try {
      await api.delete(`/treinos/${id}`);
      loadTreinos();
    } catch (error) {
      console.error('Erro ao deletar treino:', error);
    }
  };

  const calcularProxima = (data, semanas) => {
    const d = new Date(data);
    d.setDate(d.getDate() + (semanas * 7));
    return d.toLocaleDateString('pt-BR');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const abrirEdicao = (treino) => {
    setEditForm({
      data_treino: treino.data_treino,
      data_proxima: treino.data_proxima,
      duracao_semanas: treino.duracao_semanas || 8,
      descricao_treino: treino.descricao_treino || '',
      status: treino.status
    });
    setEditModal(treino.id);
  };

  if (loading) {
    return <div className="page"><p className="text-center">Carregando...</p></div>;
  }

  return (
    <div className="page fade-in">
      <div className="page-header flex jc-between ai-center">
        <h1>
          {geral ? '📊 Troca de Treinos Geral' :
            professora ? `🔄 Troca de Treinos - ${professora}` :
              '🔄 Troca de Treinos'}
        </h1>
        <input
          type="text"
          className="form-control"
          placeholder="🔍 Buscar por aluna..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
      </div>

      {/* Alarmes de troca próxima */}
      {treinosProximos.length > 0 && (
        <div className="treino-alert">
          <span className="treino-alert-icon">⚠️</span>
          <div>
            <strong>Atenção!</strong> Treinos próximos da troca:
            <ul style={{ margin: '0.5rem 0 0 1rem' }}>
              {treinosProximos.slice(0, 5).map(t => (
                <li key={t.id}>
                  {t.aluna_nome} - {formatDate(t.data_proxima)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tabela por aluna */}
      {Object.entries(treinosPorAluna)
        .filter(([, data]) => data.nome.toLowerCase().includes(search.toLowerCase()))
        .map(([alunaId, data]) => (
          <div key={alunaId} className="card mb-3">
            <div className="flex ai-center jc-between mb-2">
              <h3 style={{ marginBottom: 0 }}>
                {data.nome}
                <div className="treino-badge" style={{ marginLeft: '1rem', background: 'rgba(226,0,122,0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', fontSize: '0.8rem' }}>
                  👩‍🏫 {data.professora_nome || 'Sem Professora'}
                </div>
              </h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setSelectedAluna(alunaId);
                  setShowModal(true);
                  setNovoTreino({ data_treino: '', duracao_semanas: 8, descricao_treino: '' });
                }}
              >
                + Novo Treino
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Treino</th>
                    <th>Data</th>
                    <th>Duração</th>
                    <th>Próxima Troca</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.treinos.map(t => (
                    <React.Fragment key={t.id}>
                      <tr>
                        <td style={{ fontWeight: 600 }}>{t.treino_num}º</td>
                        <td>{formatDate(t.data_treino)}</td>
                        <td>{t.duracao_semanas || 8} sem.</td>
                        <td>
                          <span className={t.status === 'pendente' && new Date(t.data_proxima) <= hoje ? 'text-primary' : ''}>
                            {formatDate(t.data_proxima)}
                          </span>
                        </td>
                        <td>
                          <span className={`treino-badge ${t.status}`}>
                            {t.status === 'concluido' ? '✓ Concluído' : '⏳ Em andamento'}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => abrirEdicao(t)}
                              title="Editar treino"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => setExpandedTreino(expandedTreino === t.id ? null : t.id)}
                              title="Ver exercícios"
                            >
                              {expandedTreino === t.id ? '▲' : '▼'}
                            </button>
                            {t.status === 'pendente' && (
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => marcarConcluido(t.id)}
                                title="Marcar concluído"
                              >
                                ✓
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                className="btn btn-sm btn-outline"
                                style={{ color: '#f44336', borderColor: '#f44336' }}
                                onClick={() => excluirTreino(t.id)}
                                title="Deletar treino"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Área expandida com descrição do treino */}
                      {expandedTreino === t.id && (
                        <tr>
                          <td colSpan="6" style={{
                            background: 'var(--gray)',
                            padding: '1rem',
                            borderTop: '2px solid var(--primary)'
                          }}>
                            <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>
                              📝 Treino {t.treino_num}º - Exercícios
                            </h4>
                            {t.descricao_treino ? (
                              <pre style={{
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'inherit',
                                fontSize: '0.9rem',
                                lineHeight: '1.6',
                                margin: 0,
                                color: 'var(--text)'
                              }}>
                                {t.descricao_treino}
                              </pre>
                            ) : (
                              <p className="text-muted" style={{ margin: 0 }}>
                                Nenhum exercício cadastrado. Clique em ✏️ para adicionar.
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {Object.keys(treinosPorAluna).length === 0 && (
        <div className="card text-center">
          <p className="text-muted">Nenhuma aluna cadastrada ainda.</p>
        </div>
      )}

      {/* Modal para adicionar treino */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Adicionar Novo Treino</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="form-group mb-3">
              <label className="required">Data do Treino</label>
              <input
                type="date"
                className="form-control"
                value={novoTreino.data_treino}
                onChange={e => setNovoTreino({ ...novoTreino, data_treino: e.target.value })}
              />
            </div>

            <div className="form-group mb-3">
              <label className="required">Duração (semanas)</label>
              <input
                type="number"
                min="1"
                max="52"
                className="form-control"
                value={novoTreino.duracao_semanas}
                onChange={e => setNovoTreino({ ...novoTreino, duracao_semanas: parseInt(e.target.value) || 8 })}
              />
              <small className="text-muted">Padrão: 8 semanas (~2 meses)</small>
            </div>

            {novoTreino.data_treino && (
              <p className="text-muted mb-3">
                Próxima troca: <strong className="text-primary">
                  {calcularProxima(novoTreino.data_treino, novoTreino.duracao_semanas)}
                </strong>
              </p>
            )}

            <div className="form-group mb-3">
              <label>Descrição do Treino (Séries / Exercícios)</label>
              <textarea
                className="form-control"
                rows={10}
                placeholder={`Ex:\nTreino A - Superior\n1. Supino reto 3x12\n2. Desenvolvimento 3x10\n3. Puxada frontal 3x12\n4. Remada curvada 3x10\n5. Rosca direta 3x12\n6. Tríceps corda 3x12`}
                value={novoTreino.descricao_treino}
                onChange={e => setNovoTreino({ ...novoTreino, descricao_treino: e.target.value })}
                style={{ fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.5' }}
              />
            </div>

            <div className="flex gap-2 mt-3">
              <button
                className="btn btn-primary"
                onClick={() => adicionarTreino(selectedAluna)}
                disabled={!novoTreino.data_treino}
              >
                Salvar Treino
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar treino */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Editar Treino</h3>
              <button className="modal-close" onClick={() => setEditModal(null)}>×</button>
            </div>

            <div className="form-group mb-3">
              <label className="required">Data do Treino</label>
              <input
                type="date"
                className="form-control"
                value={editForm.data_treino}
                onChange={e => setEditForm({ ...editForm, data_treino: e.target.value })}
              />
            </div>

            <div className="form-group mb-3">
              <label className="required">Duração (semanas)</label>
              <input
                type="number"
                min="1"
                max="52"
                className="form-control"
                value={editForm.duracao_semanas}
                onChange={e => setEditForm({ ...editForm, duracao_semanas: parseInt(e.target.value) || 8 })}
              />
            </div>

            <div className="form-group mb-3">
              <label>Data da Próxima Troca (Opcional)</label>
              <input
                type="date"
                className="form-control"
                value={editForm.data_proxima}
                onChange={e => setEditForm({ ...editForm, data_proxima: e.target.value })}
              />
              <small className="text-muted">Deixe vazio para calcular automaticamente com base na data e duração.</small>
            </div>

            {editForm.data_treino && !editForm.data_proxima && (
              <p className="text-muted mb-3">
                Próxima troca (calculada): <strong className="text-primary">
                  {calcularProxima(editForm.data_treino, editForm.duracao_semanas)}
                </strong>
              </p>
            )}

            <div className="form-group mb-3">
              <label>Status</label>
              <select
                className="form-control"
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="pendente">⏳ Em andamento</option>
                <option value="concluido">✓ Concluído</option>
              </select>
            </div>

            <div className="form-group mb-3">
              <label>Descrição do Treino (Séries / Exercícios)</label>
              <textarea
                className="form-control"
                rows={10}
                placeholder={`Ex:\nTreino A - Superior\n1. Supino reto 3x12\n2. Desenvolvimento 3x10\n...`}
                value={editForm.descricao_treino}
                onChange={e => setEditForm({ ...editForm, descricao_treino: e.target.value })}
                style={{ fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.5' }}
              />
            </div>

            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary" onClick={salvarEdicao}>
                Salvar Alterações
              </button>
              <button className="btn btn-outline" onClick={() => setEditModal(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrocaTreinos;