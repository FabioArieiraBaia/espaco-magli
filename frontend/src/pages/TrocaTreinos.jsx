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
    data_proxima: '',
    duracao_semanas: 8,
    foto: null,
    descricao_treino: ''
  });

  // Edit treino form
  const [editForm, setEditForm] = useState({
    data_treino: '',
    data_proxima: '',
    duracao_semanas: 8,
    status: 'pendente',
    foto: null,
    descricao_treino: ''
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

  // Verificar aniversariantes (hoje e próximos 3 dias)
  const aniversariantes = alunas.filter(a => {
    if (!a.nascimento) return false;
    
    // Parsing robusto (suporta YYYY-MM-DD e DD/MM/YYYY)
    let diaNiver, mesNiver;
    if (a.nascimento.includes('-')) {
      const parts = a.nascimento.split('-');
      if (parts[0].length === 4) { // YYYY-MM-DD
        mesNiver = parseInt(parts[1]);
        diaNiver = parseInt(parts[2]);
      } else { // DD-MM-YYYY
        diaNiver = parseInt(parts[0]);
        mesNiver = parseInt(parts[1]);
      }
    } else if (a.nascimento.includes('/')) {
      const parts = a.nascimento.split('/');
      if (parts[2] && parts[2].length === 4) { // DD/MM/YYYY
        diaNiver = parseInt(parts[0]);
        mesNiver = parseInt(parts[1]);
      } else { // YYYY/MM/DD
        mesNiver = parseInt(parts[1]);
        diaNiver = parseInt(parts[2]);
      }
    } else {
      return false;
    }

    const hojeD = hoje.getDate();
    const hojeM = hoje.getMonth() + 1;
    
    // Mesma data
    if (diaNiver === hojeD && mesNiver === hojeM) return true;
    
    // Próximos 3 dias
    const dataNiver = new Date(hoje.getFullYear(), mesNiver - 1, diaNiver);
    const diff = Math.ceil((dataNiver - hoje) / (1000 * 60 * 60 * 24));
    
    return diff > 0 && diff <= 3;
  });

  const adicionarTreino = async (alunaId) => {
    if (!novoTreino.data_treino) return;
    try {
      const res = await api.post('/treinos', {
        aluna_id: alunaId,
        professor_id: user?.id,
        data_treino: novoTreino.data_treino,
        data_proxima: novoTreino.data_proxima,
        duracao_semanas: novoTreino.duracao_semanas,
      });
      
      const treinoId = res.data.id || (await api.get(`/treinos/professora/${user?.id}`)).data.sort((a,b) => b.id - a.id)[0].id;
      
      loadTreinos();
      setShowModal(false);
      setNovoTreino({ data_treino: '', data_proxima: '', duracao_semanas: 8, descricao_treino: '' });
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
    if (!data) return '-';
    // Usar split para evitar problemas de fuso horário do JS ao interpretar string
    const parts = data.split('-');
    if (parts.length !== 3) return '-';
    
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    
    const date = new Date(y, m, d);
    date.setDate(date.getDate() + (parseInt(semanas) * 7));
    
    const rd = String(date.getDate()).padStart(2, '0');
    const rm = String(date.getMonth() + 1).padStart(2, '0');
    const ry = date.getFullYear();
    return `${rd}/${rm}/${ry}`;
  };

  const calcularSemanas = (inicio, fim) => {
    if (!inicio || !fim) return 8;
    const d1 = new Date(inicio);
    const d2 = new Date(fim);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
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
      status: treino.status,
      imagem_treino: treino.imagem_treino,
      descricao_treino: treino.descricao_treino || ''
    });
    setEditModal(treino.id);
  };

  // Passo 1: Converter para array e adicionar lógica de prioridade (troca próxima)
  const alunasLista = Object.entries(treinosPorAluna)
    .map(([id, data]) => {
      const temTrocaProxima = data.treinos.some(t => {
        const dataProxima = new Date(t.data_proxima);
        const diff = Math.ceil((dataProxima - hoje) / (1000 * 60 * 60 * 24));
        return diff <= 3 && diff >= 0 && t.status === 'pendente';
      });
      return { id, ...data, temTrocaProxima };
    })
    .sort((a, b) => {
      // Prioridade 1: Troca próxima (ordem decrescente de 'temTrocaProxima')
      if (a.temTrocaProxima && !b.temTrocaProxima) return -1;
      if (!a.temTrocaProxima && b.temTrocaProxima) return 1;
      // Prioridade 2: Nome (ordem alfabética)
      return a.nome.localeCompare(b.nome);
    });

  if (loading) {
    return <div className="page"><p className="text-center">Carregando...</p></div>;
  }

  return (
    <div className="page fade-in">
      <div className="page-header flex jc-between ai-center">
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>
            {geral ? '📊 Troca de Treinos Geral' :
              professora ? `🔄 Troca de Treinos - ${professora}` :
                '🔄 Troca de Treinos'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {alunasLista.filter(a => a.nome.toLowerCase().includes(search.toLowerCase())).length} alunas na lista
          </p>
        </div>

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
                  {t.aluna_nome} ({t.professora_nome || 'Sem Prof.'}) - {formatDate(t.data_proxima)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Alertas de Aniversário */}
      {aniversariantes.length > 0 && (
        <div className="treino-alert" style={{ background: 'linear-gradient(135deg, #673ab7, #9c27b0)', marginBottom: '1.5rem' }}>
          <span className="treino-alert-icon">🎂</span>
          <div>
            <strong>Parabéns!</strong> Aniversariantes do dia e próximos dias:
            <ul style={{ margin: '0.5rem 0 0 1rem' }}>
              {aniversariantes.map(a => {
                const [y, m, d] = a.nascimento.split('-');
                const isHoje = hoje.getDate() === parseInt(d) && (hoje.getMonth() + 1) === parseInt(m);
                return (
                  <li key={a.id}>
                    {a.nome} - {d}/{m} {isHoje ? <strong>(É HOJE! 🎉)</strong> : '(Em breve)'}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Tabela por aluna (Lista Numerada e Ordenada) */}
      {alunasLista
        .filter((a) => a.nome.toLowerCase().includes(search.toLowerCase()))
        .map((a, index) => (
          <div 
            key={a.id} 
            className="card mb-3" 
            style={a.temTrocaProxima ? { 
              border: '2px solid var(--primary)', 
              boxShadow: '0 0 15px rgba(226, 0, 122, 0.2)',
              position: 'relative'
            } : {}}
          >
            {a.temTrocaProxima && (
              <div style={{ 
                position: 'absolute', 
                top: '-12px', 
                right: '20px', 
                background: 'var(--primary)', 
                color: 'white', 
                padding: '2px 10px', 
                borderRadius: '20px', 
                fontSize: '0.7rem', 
                fontWeight: 'bold',
                zIndex: 10
              }}>
                ⚠️ TROCA PENDENTE
              </div>
            )}
            <div className="flex ai-center jc-between mb-2">
              <h3 style={{ marginBottom: 0 }}>
                <span style={{ color: 'var(--primary)', marginRight: '8px' }}>{index + 1}.</span>
                {a.nome}
                <div className="treino-badge" style={{ marginLeft: '1rem', background: 'rgba(226,0,122,0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', fontSize: '0.8rem' }}>
                  👩‍🏫 {a.professora_nome || 'Sem Professora'}
                </div>
              </h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setSelectedAluna(a.id);
                  setShowModal(true);
                  setNovoTreino({ data_treino: '', data_proxima: '', duracao_semanas: 8, foto: null });
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
                  {a.treinos.map(t => (
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
                          <div className={`treino-badge ${t.status}`}>
                            {t.status === 'concluido' ? '✓ Concluído' : '⏳ Em andamento'}
                          </div>
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
                      {expandedTreino === t.id && (
                        <tr>
                          <td colSpan="6" style={{
                            background: 'rgba(0,0,0,0.2)',
                            padding: '20px',
                            borderTop: '2px solid var(--primary)'
                          }}>
                            <div className="flex jc-between ai-center mb-3">
                              <h4 style={{ color: 'var(--primary)', margin: 0 }}>
                                📋 Treino {t.treino_num}º - Exercícios Digitados
                              </h4>
                            </div>
                            
                            {t.descricao_treino ? (
                              <div className="mb-3" style={{ 
                                padding: '15px', 
                                background: 'rgba(226, 0, 122, 0.05)', 
                                borderRadius: '8px', 
                                border: '1px solid rgba(226, 0, 122, 0.2)',
                                borderLeft: '4px solid var(--primary)',
                                whiteSpace: 'pre-wrap',
                                fontSize: '1rem',
                                color: 'white'
                              }}>
                                {t.descricao_treino}
                              </div>
                            ) : (
                               <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                 Nenhuma descrição ou exercícios cadastrados para este treino.
                               </div>
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

      {alunasLista.length === 0 && (
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
              <small className="text-muted">Padrão: 8 semanas (~56 dias)</small>
            </div>

            {novoTreino.data_treino && (
              <p className="text-muted mb-3">
                Próxima troca (calculada): <strong className="text-primary">
                  {calcularProxima(novoTreino.data_treino, novoTreino.duracao_semanas)}
                </strong>
              </p>
            )}

            <div className="form-group mb-3">
              <label>Data da Próxima Troca (Manual)</label>
              <input
                type="date"
                className="form-control"
                value={novoTreino.data_proxima || ''}
                onChange={e => {
                  const novaData = e.target.value;
                  const semanas = calcularSemanas(novoTreino.data_treino, novaData);
                  setNovoTreino({ 
                    ...novoTreino, 
                    data_proxima: novaData,
                    duracao_semanas: semanas
                  });
                }}
              />
              <small className="text-muted">Opcional. Se digitado, as semanas serão recalculadas.</small>
            </div>





            <div className="form-group mb-3">
              <label>Descrição do Treino (Opcional)</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Ex: Supino 3x12, Agachamento 4x10..."
                value={novoTreino.descricao_treino}
                onChange={e => setNovoTreino({ ...novoTreino, descricao_treino: e.target.value })}
                style={{ resize: 'vertical' }}
              ></textarea>
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
                onChange={e => setEditForm({ ...editForm, data_treino: e.target.value, data_proxima: '' })}
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
                onChange={e => setEditForm({ ...editForm, duracao_semanas: parseInt(e.target.value) || 8, data_proxima: '' })}
              />
            </div>

            <div className="form-group mb-3">
              <label>Data da Próxima Troca (Manual)</label>
              <input
                type="date"
                className="form-control"
                value={editForm.data_proxima}
                onChange={e => {
                  const novaData = e.target.value;
                  const semanas = calcularSemanas(editForm.data_treino, novaData);
                  setEditForm({ 
                    ...editForm, 
                    data_proxima: novaData,
                    duracao_semanas: semanas
                  });
                }}
              />
              <small className="text-muted">Se você digitar uma data manualmente, o número de semanas será recalculado.</small>
            </div>



            {editForm.data_treino && !editForm.data_proxima && (
              <p className="text-muted mb-3">
                Próxima troca (calculada): <strong className="text-primary">
                  {calcularProxima(editForm.data_treino, editForm.duracao_semanas)}
                </strong>
              </p>
            )}



            <div className="form-group mb-3">
              <label>Descrição do Treino</label>
              <textarea
                className="form-control"
                rows="4"
                value={editForm.descricao_treino}
                onChange={e => setEditForm({ ...editForm, descricao_treino: e.target.value })}
                style={{ resize: 'vertical' }}
              ></textarea>
            </div>

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