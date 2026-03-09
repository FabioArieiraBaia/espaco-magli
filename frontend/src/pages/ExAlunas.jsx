import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function ExAlunas() {
  const { api } = useAuth();
  const [exAlunas, setExAlunas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api) return;
    loadExAlunas();
  }, [api]);

  const loadExAlunas = async () => {
    if (!api) return;
    try {
      const res = await api.get('/ex-alunas');
      setExAlunas(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Erro ao carregar ex-alunas:', error);
    } finally {
      setLoading(false);
    }
  };

  const reintegrar = async (id, nome) => {
    if (!window.confirm(`Deseja reintegrar "${nome}" como aluna ativa?`)) return;
    try {
      await api.put(`/ex-alunas/${id}`);
      loadExAlunas();
    } catch (error) {
      console.error('Erro ao reintegrar:', error);
    }
  };

  const excluirPermanente = async (id, nome) => {
    if (!window.confirm(`Deseja EXCLUIR PERMANENTEMENTE "${nome}" do histórico? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/ex-alunas/${id}`);
      loadExAlunas();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  if (loading) {
    return <div className="page"><p className="text-center">Carregando...</p></div>;
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>📋 Ex-Alunas</h1>
        <p className="text-muted">{exAlunas.length} ex-aluna{exAlunas.length !== 1 ? 's' : ''} registrada{exAlunas.length !== 1 ? 's' : ''}</p>
      </div>

      {exAlunas.length > 0 ? (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome</th>
                  <th>Data de Saída</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {exAlunas.map((ex, i) => (
                  <tr key={ex.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td><strong>{ex.nome}</strong></td>
                    <td>
                      <span style={{ color: 'var(--primary)' }}>{formatDate(ex.data_saida)}</span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => reintegrar(ex.id, ex.nome)}
                          title="Reintegrar como aluna ativa"
                        >
                          🔁 Reintegrar
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => excluirPermanente(ex.id, ex.nome)}
                          title="Excluir permanentemente"
                          style={{ borderColor: '#f44336', color: '#f44336' }}
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center">
          <p className="text-muted">Nenhuma ex-aluna registrada.</p>
        </div>
      )}

      <div className="card mt-4" style={{ background: 'var(--gray)' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>ℹ️ Como funciona</h3>
        <p className="text-muted" style={{ fontSize: '0.9rem' }}>
          Quando uma aluna é desabilitada na lista de alunas ativas,
          ela automaticamente aparece aqui. Use <strong>"Reintegrar"</strong> para
          devolvê-la à lista de alunas ativas mantendo todo o histórico, ou
          <strong> "Excluir"</strong> para remover permanentemente do sistema.
        </p>
      </div>
    </div>
  );
}

export default ExAlunas;