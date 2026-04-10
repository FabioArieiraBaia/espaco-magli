import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend
} from 'recharts';

function Financeiro() {
  const { api, isAdmin } = useAuth();
  const [tab, setTab] = useState('receitas');
  const [receitas, setReceitas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [totalReceitas, setTotalReceitas] = useState(0);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showModal, setShowModal] = useState(false);
  const [novaDespesa, setNovaDespesa] = useState({ descricao: '', valor: '' });
  const [pagamentoModal, setPagamentoModal] = useState({ show: false, receitaId: null, meio: 'Dinheiro', tipo: 'cnpj' });

  useEffect(() => {
    if (!api) return;
    loadData();
  }, [mes, api]);

  const loadData = async () => {
    if (!api) return;
    try {
      const [resReceitas, resDespesas] = await Promise.all([
        api.get(`/receitas?mes=${mes}`),
        api.get(`/despesas?mes=${mes}`)
      ]);

      setReceitas(resReceitas.data.receitas);
      setTotalReceitas(resReceitas.data.total);
      setDespesas(resDespesas.data.despesas);
      setTotalDespesas(resDespesas.data.total);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const confirmarPagamento = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/receitas/${pagamentoModal.receitaId}/pago`, { 
        meio_pagamento: pagamentoModal.meio,
        tipo_conta: pagamentoModal.tipo
      });
      setPagamentoModal({ show: false, receitaId: null, meio: 'Dinheiro', tipo: 'cnpj' });
      loadData();
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const estornarPagamento = async (id) => {
    if (!window.confirm('Deseja realmente desfazer este pagamento?')) return;
    try {
      await api.post(`/receitas/${id}/estornar`);
      loadData();
    } catch (error) {
      console.error('Erro ao estornar:', error);
    }
  };

  const excluirReceita = async (id) => {
    if (!window.confirm('Deseja realmente deletar este registro de pagamento? Esta ação não pode ser desfeita.')) return;
    try {
      await api.delete(`/receitas/${id}`);
      loadData();
    } catch (error) {
      console.error('Erro ao deletar receita:', error);
    }
  };

  const adicionarDespesa = async (e) => {
    e.preventDefault();
    if (!novaDespesa.descricao || !novaDespesa.valor) return;

    try {
      await api.post('/despesas', {
        descricao: novaDespesa.descricao,
        valor: parseFloat(novaDespesa.valor) || 0,
        mes
      });
      setShowModal(false);
      setNovaDespesa({ descricao: '', valor: '' });
      loadData();
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const excluirDespesa = async (id) => {
    if (!confirm('Deseja excluir esta despesa?')) return;

    try {
      await api.delete('/despesas', { data: { id } });
      loadData();
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const formatValor = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const mesesNomes = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const formatMes = (mesStr) => {
    const [y, m] = mesStr.split('-');
    return `${mesesNomes[parseInt(m)]} ${y}`;
  };

  const getBadgeVencimento = (d, pago, mesReceita) => {
    if (pago || !d) return null;
    
    // Extrair apenas o DIA do vencimento original
    const [origY, origM, day] = d.split('-').map(Number);
    
    // Usar o mês da RECEITA (mesReceita é "YYYY-MM")
    const [y, m] = mesReceita.split('-').map(Number);
    
    const vencimentoDate = new Date(y, m - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today > vencimentoDate) {
      return <div style={{ display: 'inline-block', padding: '2px 6px', background: '#f44336', color: 'white', borderRadius: '4px', fontSize: '0.75rem', marginTop: '4px' }}>Atrasado</div>;
    } else {
      const diffTime = vencimentoDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 3 && diffDays >= 0) {
        return <div style={{ display: 'inline-block', padding: '2px 6px', background: '#ff9800', color: 'white', borderRadius: '4px', fontSize: '0.75rem', marginTop: '4px' }}>Vence em {diffDays} d</div>;
      }
    }
    return null;
  };



  // KPI Calculations
  const receitasPagas = receitas.filter(r => r.pago).reduce((acc, r) => acc + Math.max(0, r.valor - (r.aluna_desconto || 0)), 0);
  const receitasCNPJ = receitas.filter(r => r.pago && r.tipo_conta === 'cnpj').reduce((acc, r) => acc + Math.max(0, r.valor - (r.aluna_desconto || 0)), 0);
  const receitasPersonal = receitas.filter(r => r.pago && r.tipo_conta === 'personal').reduce((acc, r) => acc + Math.max(0, r.valor - (r.aluna_desconto || 0)), 0);
  
  const receitasPendentes = totalReceitas - receitasPagas;
  const saldoLiquido = receitasPagas - totalDespesas;

  // Chart Data
  const chartData = [
    { name: 'Receitas (Pagas)', value: receitasPagas, color: '#4CAF50' },
    { name: 'Despesas', value: totalDespesas, color: '#F44336' }
  ];

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>💰 Financeiro</h1>
        <div className="flex gap-1 ai-center">
          <button
            onClick={() => setMes(m => {
              const [y, mo] = m.split('-').map(Number);
              const prev = new Date(y, mo - 2);
              return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
            })}
            className="btn btn-outline btn-sm"
          >
            ←
          </button>
          <span style={{ fontWeight: 600, minWidth: '150px', textAlign: 'center' }}>
            {formatMes(mes)}
          </span>
          <button
            onClick={() => setMes(m => {
              const [y, mo] = m.split('-').map(Number);
              const next = new Date(y, mo);
              return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
            })}
            className="btn btn-outline btn-sm"
          >
            →
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-grid mb-3">
        <div className="stat-card fade-in" style={{ animationDelay: '0.1s' }}>
          <h3>Saldo Líquido Atual</h3>
          <p className="stat-value" style={{ color: saldoLiquido >= 0 ? '#4CAF50' : '#F44336' }}>
            {formatValor(saldoLiquido)}
          </p>
          <div className="stat-detail text-muted">Recebido - Despesas</div>
        </div>
        <div className="stat-card fade-in" style={{ animationDelay: '0.2s', background: 'rgba(76, 175, 80, 0.05)' }}>
          <h3>Receitas Pagas</h3>
          <p className="stat-value" style={{ color: '#4CAF50' }}>{formatValor(receitasPagas)}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.85rem', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>🏢 Academia (CNPJ):</span>
              <span style={{ fontWeight: 600 }}>{formatValor(receitasCNPJ)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>👩‍🏫 Personal (CPF):</span>
              <span style={{ fontWeight: 600 }}>{formatValor(receitasPersonal)}</span>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '5px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#e2007a' }}>Pendente:</span>
              <span>{formatValor(receitasPendentes)}</span>
            </div>
          </div>
        </div>
        <div className="stat-card fade-in" style={{ animationDelay: '0.3s', background: 'rgba(244, 67, 54, 0.05)' }}>
          <h3>Despesas</h3>
          <p className="stat-value" style={{ color: '#F44336' }}>{formatValor(totalDespesas)}</p>
        </div>
      </div>

      <div className="financeiro-layout">
        {/* Sidebar Graphics moved to Top */}
        <div className="financeiro-sidebar mb-4">
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>📊 Balanço Geral</h3>
            {totalReceitas > 0 || totalDespesas > 0 ? (
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => formatValor(value)} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted">Sem dados suficientes para gerar o gráfico.</p>
            )}
          </div>
        </div>

        <div className="financeiro-main">
          {/* Tabs */}
          <div className="financeiro-tabs mb-2">
            <button
              className={`tab-btn ${tab === 'receitas' ? 'active' : ''}`}
              onClick={() => setTab('receitas')}
            >
              📈 Receitas Listadas
            </button>
            <button
              className={`tab-btn ${tab === 'despesas' ? 'active' : ''}`}
              onClick={() => setTab('despesas')}
            >
              📉 Despesas Listadas
            </button>
          </div>

          {/* Tab Receitas */}
          {tab === 'receitas' && (
            <div className="card fade-in">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Aluna</th>
                      <th>Plano</th>
                      {isAdmin && <th>Desconto</th>}
                      {isAdmin && <th>Valor Final</th>}
                      <th>Status</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receitas.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td>{r.aluna_nome}</td>
                        <td>{r.vezes_semana}x/semana</td>
                        {isAdmin && (
                          <td style={{ color: r.aluna_desconto ? '#e2007a' : 'var(--text-muted)' }}>
                            {r.aluna_desconto && parseFloat(r.aluna_desconto) > 0 ?
                              `- ${formatValor(r.aluna_desconto)}` : '-'}
                          </td>
                        )}
                        {isAdmin && (
                          <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                            {formatValor(Math.max(0, r.valor - (r.aluna_desconto || 0)))}
                          </td>
                        )}
                        <td>
                          <div className={`treino-badge ${r.pago ? '' : 'pendente'}`} style={{ display: 'inline-block' }}>
                            {r.pago ? '✓ Pago' : '⏳ Pendente'}
                          </div>
                          {getBadgeVencimento(r.aluna_vencimento, r.pago, r.mes)}
                          {r.pago && (
                            <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-muted)' }}>
                              Via {r.meio_pagamento || 'Dinheiro'} • {r.tipo_conta === 'personal' ? '👤 Personal' : '🏢 Academia'}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-1 ai-center">
                            {!r.pago ? (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => setPagamentoModal({ show: true, receitaId: r.id, meio: 'Dinheiro' })}
                              >
                                Pagar
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm"
                                style={{ background: 'transparent', color: '#f44336', border: '1px solid #f44336', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => estornarPagamento(r.id)}
                                title="Desfazer pagamento"
                              >
                                Estornar
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                className="btn btn-sm btn-outline"
                                style={{ color: '#f44336', borderColor: '#f44336', padding: '0.2rem 0.5rem', fontSize: '0.9rem', lineHeight: 1 }}
                                onClick={() => excluirReceita(r.id)}
                                title="Deletar registro"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Despesas */}
          {tab === 'despesas' && (
            <>
              <div className="flex jc-between ai-center mb-3">
                <h2>Despesas do Mês</h2>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowModal(true)}
                >
                  + Nova Despesa
                </button>
              </div>

              <div className="list">
                {despesas.map((d, i) => (
                  <div key={d.id} className="list-item">
                    <span>
                      {i + 1} - {d.descricao}
                    </span>
                    <div className="flex gap-2 ai-center">
                      <span style={{ color: '#f44336', fontWeight: 600 }}>
                        -{formatValor(d.valor)}
                      </span>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => excluirDespesa(d.id)}
                        style={{ padding: '0.35rem 0.75rem' }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                {despesas.length === 0 && (
                  <div className="list-item text-center">
                    <span className="text-muted">Nenhuma despesa cadastrada</span>
                  </div>
                )}
              </div>

              <div className="financeiro-total" style={{ marginTop: '1.5rem' }}>
                <h3>Total Despesas</h3>
                <p style={{ color: '#f44336' }}>-{formatValor(totalDespesas)}</p>
              </div>

              {/* Saldo */}
              <div className="card mt-3 text-center" style={{
                background: totalReceitas - totalDespesas >= 0
                  ? 'rgba(76, 175, 80, 0.1)'
                  : 'rgba(244, 67, 54, 0.1)',
                borderColor: totalReceitas - totalDespesas >= 0 ? '#4CAF50' : '#f44336'
              }}>
                <h3>Saldo do Mês</h3>
                <p style={{
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  color: totalReceitas - totalDespesas >= 0 ? '#4CAF50' : '#f44336'
                }}>
                  {formatValor(totalReceitas - totalDespesas)}
                </p>
              </div>
            </>
          )}

          {/* Modal Nova Despesa */}
          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Nova Despesa</h3>
                  <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                </div>

                <form onSubmit={adicionarDespesa}>
                  <div className="form-group">
                    <label className="required">Descrição</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: Aluguel, Marketing, Salário..."
                      value={novaDespesa.descricao}
                      onChange={e => setNovaDespesa({ ...novaDespesa, descricao: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="required">Valor</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="0.00"
                      value={novaDespesa.valor}
                      onChange={e => setNovaDespesa({ ...novaDespesa, valor: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button type="submit" className="btn btn-primary">Salvar</button>
                    <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Receber Pagamento */}
          {pagamentoModal.show && (
            <div className="modal-overlay" onClick={() => setPagamentoModal({ show: false, receitaId: null, meio: 'Dinheiro', tipo: 'cnpj' })}>
              <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                  <h3>Confirmar Pagamento</h3>
                  <button className="modal-close" onClick={() => setPagamentoModal({ show: false, receitaId: null, meio: 'Dinheiro', tipo: 'cnpj' })}>×</button>
                </div>
                <form onSubmit={confirmarPagamento}>
                  <div className="form-group mb-3">
                    <label className="required">Meio de Pagamento</label>
                    <select
                      className="form-control"
                      value={pagamentoModal.meio}
                      onChange={e => setPagamentoModal({ ...pagamentoModal, meio: e.target.value })}
                    >
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Pix">Pix</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Cartão de Débito">Cartão de Débito</option>
                      <option value="Transferência">Transferência Bancária</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="required">Conta de Destino</label>
                    <div className="flex gap-2 mt-2">
                       <label className="flex ai-center gap-1" style={{ cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name="tipo_conta" 
                            checked={pagamentoModal.tipo === 'cnpj'} 
                            onChange={() => setPagamentoModal({...pagamentoModal, tipo: 'cnpj'})}
                          />
                          🏢 Academia (CNPJ)
                       </label>
                       <label className="flex ai-center gap-1" style={{ cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name="tipo_conta" 
                            checked={pagamentoModal.tipo === 'personal'} 
                            onChange={() => setPagamentoModal({...pagamentoModal, tipo: 'personal'})}
                          />
                          👤 Personal (CPF)
                       </label>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button type="submit" className="btn btn-primary">Confirmar Recebimento</button>
                    <button type="button" className="btn btn-outline" onClick={() => setPagamentoModal({ show: false, receitaId: null, meio: 'Dinheiro', tipo: 'cnpj' })}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Financeiro;