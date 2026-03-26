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
  const [viewingImage, setViewingImage] = useState(null); // URL da imagem para o lightbox

  // Novo treino form
  const [novoTreino, setNovoTreino] = useState({
    data_treino: '',
    data_proxima: '',
    duracao_semanas: 8,
    foto: null
  });

  // Edit treino form
  const [editForm, setEditForm] = useState({
    data_treino: '',
    data_proxima: '',
    duracao_semanas: 8,
    status: 'pendente',
    foto: null
  });

  const uploadFoto = async (treinoId, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('foto', file);
    try {
      await api.post(`/treinos/${treinoId}/foto`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (error) {
      console.error('Erro ao subir foto:', error);
    }
  };

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
      const res = await api.post('/treinos', {
        aluna_id: alunaId,
        professor_id: user?.id,
        data_treino: novoTreino.data_treino,
        data_proxima: novoTreino.data_proxima,
        duracao_semanas: novoTreino.duracao_semanas,
      });
      
      const treinoId = res.data.id || (await api.get(`/treinos/professora/${user?.id}`)).data.sort((a,b) => b.id - a.id)[0].id;
      
      if (novoTreino.foto) {
        await uploadFoto(treinoId, novoTreino.foto);
      }
      
      loadTreinos();
      setShowModal(false);
      setNovoTreino({ data_treino: '', data_proxima: '', duracao_semanas: 8, foto: null });
    } catch (error) {
      console.error('Erro ao adicionar treino:', error);
    }
  };

  const salvarEdicao = async () => {
    if (!editModal) return;
    try {
      await api.put(`/treinos/${editModal}`, editForm);
      if (editForm.foto) {
        await uploadFoto(editModal, editForm.foto);
      }
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
      imagem_treino: treino.imagem_treino
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
                          <div className={`treino-badge ${t.status}`}>
                            {t.status === 'concluido' ? '✓ Concluído' : '⏳ Em andamento'}
                          </div>
                          {t.imagem_treino && (
                            <button 
                              className="btn btn-sm btn-outline" 
                              style={{ display: 'block', marginTop: '5px', fontSize: '0.7rem' }}
                              onClick={() => setViewingImage(`http://localhost:3001/uploads/treinos/${t.imagem_treino}`)}
                            >
                              📸 Ver Treino
                            </button>
                          )}
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
                                📋 Treino {t.treino_num}º - Ficha Digitalizada
                              </h4>
                              {t.imagem_treino && (
                                <button
                                  className="btn btn-sm btn-outline"
                                  onClick={() => setViewingImage(`http://localhost:3001/uploads/treinos/${t.imagem_treino}`)}
                                >
                                  🔍 Ampliar Imagem
                                </button>
                              )}
                            </div>
                            
                            {t.imagem_treino ? (
                              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                <img
                                  src={`http://localhost:3001/uploads/treinos/${t.imagem_treino}`}
                                  alt="Ficha de Treino"
                                  style={{ 
                                    maxWidth: '100%', 
                                    borderRadius: '8px', 
                                    cursor: 'zoom-in', 
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(226, 0, 122, 0.2)' 
                                  }}
                                  onClick={() => setViewingImage(`http://localhost:3001/uploads/treinos/${t.imagem_treino}`)}
                                />
                              </div>
                            ) : (
                              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <p>Nenhuma imagem da ficha foi enviada para este treino.</p>
                                <button 
                                  className="btn btn-sm btn-outline" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    abrirEdicao(t);
                                  }}
                                >
                                  ✏️ Adicionar Foto da Ficha
                                </button>
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
              <label className="required" style={{ display: 'block', marginBottom: '10px' }}>Foto da Ficha de Treino</label>
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  id="foto-novo"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => setNovoTreino({ ...novoTreino, foto: e.target.files[0] })}
                />
                <label 
                  htmlFor="foto-novo" 
                  className="btn btn-outline w-100" 
                  style={{ 
                    borderStyle: 'dashed', 
                    height: '100px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '10px',
                    borderColor: novoTreino.foto ? 'var(--primary)' : 'rgba(255,255,255,0.2)'
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{novoTreino.foto ? '✅' : '📷'}</span>
                  <span>{novoTreino.foto ? 'Foto Selecionada' : 'Clique para subir a foto da ficha'}</span>
                </label>
              </div>
              {novoTreino.foto && (
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  <img 
                    src={URL.createObjectURL(novoTreino.foto)} 
                    alt="Preview" 
                    style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid var(--primary)' }} 
                  />
                  <button 
                    className="btn btn-sm btn-link" 
                    style={{ display: 'block', margin: '5px auto', color: '#f44336' }}
                    onClick={() => setNovoTreino({...novoTreino, foto: null})}
                  >
                    Remover Foto
                  </button>
                </div>
              )}
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
              <label style={{ display: 'block', marginBottom: '10px' }}>Foto da Ficha de Treino</label>
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  id="foto-edit"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => setEditForm({ ...editForm, foto: e.target.files[0] })}
                />
                <label 
                  htmlFor="foto-edit" 
                  className="btn btn-outline w-100" 
                  style={{ 
                    borderStyle: 'dashed', 
                    height: '100px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '10px',
                    borderColor: (editForm.foto || editForm.imagem_treino) ? 'var(--primary)' : 'rgba(255,255,255,0.2)'
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{(editForm.foto || editForm.imagem_treino) ? '✅' : '📷'}</span>
                  <span>{(editForm.foto || editForm.imagem_treino) ? 'Trocar foto da ficha' : 'Clique para subir a foto da ficha'}</span>
                </label>
              </div>
              {(editForm.foto || editForm.imagem_treino) && (
                <div style={{ marginTop: '10px', position: 'relative', textAlign: 'center' }}>
                  <img 
                    src={editForm.foto ? URL.createObjectURL(editForm.foto) : `http://localhost:3001/uploads/treinos/${editForm.imagem_treino}`} 
                    alt="Treino" 
                    style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid var(--primary)', cursor: 'pointer' }}
                    onClick={() => setViewingImage(editForm.foto ? URL.createObjectURL(editForm.foto) : `http://localhost:3001/uploads/treinos/${editForm.imagem_treino}`)}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px' }}>Clique na imagem para ampliar</p>
                </div>
              )}
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
      {/* Lightbox para ver imagem */}
      {viewingImage && (
        <div className="modal-overlay" onClick={() => setViewingImage(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '90%', background: 'transparent', border: 'none', padding: 0 }}>
            <button 
              onClick={() => setViewingImage(null)} 
              style={{ position: 'fixed', right: '20px', top: '20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer', zIndex: 1001 }}
            >
              ×
            </button>
            <img 
              src={viewingImage} 
              alt="Treino Digitalizado" 
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TrocaTreinos;