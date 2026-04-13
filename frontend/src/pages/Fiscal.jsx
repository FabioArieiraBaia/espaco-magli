import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function Controle() {
  const { api } = useAuth();
  const [dados, setDados] = useState([]);
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Novos filtros expandidos
  const [meiosSelecionados, setMeiosSelecionados] = useState(['Todos']);
  const [tipoConta, setTipoConta] = useState('todos'); // todos, cnpj, cpf
  
  const [selecionadas, setSelecionadas] = useState([]);

  const meiosDePagamento = [
    'Todos', 
    'Dinheiro', 
    'Pix', 
    'Cartão de Crédito', 
    'Cartão de Débito', 
    'Transferência'
  ];

  useEffect(() => {
    if (!api) return;
    loadData();
  }, [mes, api]);

  const loadData = async () => {
    try {
      const res = await api.get(`/fiscal?mes=${mes}`);
      // O backend já filtra r.pago = 1, garantindo que apenas recebidos apareçam
      setDados(res.data);
      setSelecionadas([]);
    } catch (error) {
      console.error('Erro ao carregar dados fiscais:', error);
    }
  };

  const toggleMeio = (meio) => {
    if (meio === 'Todos') {
      setMeiosSelecionados(['Todos']);
      return;
    }

    setMeiosSelecionados(prev => {
      const semTodos = prev.filter(m => m !== 'Todos');
      if (semTodos.includes(meio)) {
        const novo = semTodos.filter(m => m !== meio);
        return novo.length === 0 ? ['Todos'] : novo;
      } else {
        return [...semTodos, meio];
      }
    });
  };

  const dadosFiltrados = dados.filter(item => {
    // Filtro de Meio de Pagamento
    const matchesMeio = meiosSelecionados.includes('Todos') || meiosSelecionados.includes(item.meio_pagamento);
    
    // Filtro de Tipo de Conta
    const matchesConta = tipoConta === 'todos' || 
                        (tipoConta === 'cnpj' && item.tipo_conta === 'cnpj') ||
                        (tipoConta === 'cpf' && item.tipo_conta === 'personal');
    
    return matchesMeio && matchesConta;
  });

  const formatValor = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const formatData = (d) => {
    if (!d) return '-';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const handleImprimir = () => {
    const itensParaImprimir = dadosFiltrados.filter(d => selecionadas.includes(d.id));
    if (itensParaImprimir.length === 0) return;

    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Relatório de Controle - Magli</title>
          <style>
            body { font-family: 'Poppins', sans-serif; padding: 40px; color: #1a1a1a; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #E2007A; padding-bottom: 20px; }
            .header h1 { color: #E2007A; margin: 0; font-size: 24px; }
            .header p { color: #666; margin: 5px 0 0 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #eee; padding: 12px 15px; text-align: left; font-size: 13px; }
            th { background-color: #fcfcfc; color: #E2007A; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-size: 11px; }
            tr:nth-child(even) { background-color: #fafafa; }
            .total-row { margin-top: 30px; border-top: 2px solid #eee; padding-top: 15px; text-align: right; }
            .total-value { font-size: 18px; font-weight: 700; color: #E2007A; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logo.png" style="width: 60px; margin-bottom: 10px;" />
            <h1>Relatório de Pagamentos Recebidos</h1>
            <p>Referência: ${mes} • Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Aluna</th>
                <th>Email</th>
                <th>CPF</th>
                <th>Meio de Pagamento</th>
                <th>Conta</th>
                <th>Data</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${itensParaImprimir.map(d => `
                <tr>
                  <td><strong>${d.aluna_nome}</strong></td>
                  <td>${d.aluna_email || '-'}</td>
                  <td>${d.aluna_cpf || '-'}</td>
                  <td>${d.meio_pagamento}</td>
                  <td>${d.tipo_conta === 'cnpj' ? 'Academia (CNPJ)' : 'Personal (CPF)'}</td>
                  <td>${formatData(d.data_pagamento)}</td>
                  <td>${formatValor(d.valor - (d.aluna_desconto || 0))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-row">
            <span>Total Selecionado: </span>
            <span class="total-value">${formatValor(itensParaImprimir.reduce((acc, current) => acc + (current.valor - (current.aluna_desconto || 0)), 0))}</span>
          </div>
          <div class="footer">
            Espaço Magli - Treinamento Feminino Premium
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>📄 Módulo de Controle</h1>
        <div className="flex gap-1 ai-center">
          <input 
            type="month" 
            className="form-control" 
            value={mes} 
            onChange={(e) => setMes(e.target.value)}
            style={{ width: 'auto', background: 'var(--glass)' }}
          />
        </div>
      </div>

      <div className="card mb-3">
        <div className="filter-container">
          {/* Filtro de Meios de Pagamento */}
          <div className="filter-group">
            <label>Meios de Pagamento</label>
            <div className="filter-chips">
              {meiosDePagamento.map(m => (
                <div 
                  key={m}
                  className={`filter-chip ${meiosSelecionados.includes(m) ? 'active' : ''}`}
                  onClick={() => toggleMeio(m)}
                >
                  {m === 'Pix' && <span>⚡</span>}
                  {m === 'Dinheiro' && <span>💵</span>}
                  {m === 'Cartão de Crédito' && <span>💳</span>}
                  {m === 'Cartão de Débito' && <span>🏧</span>}
                  {m === 'Transferência' && <span>🏦</span>}
                  {m}
                </div>
              ))}
            </div>
          </div>

          {/* Filtro de Conta */}
          <div className="filter-group">
            <label>Tipo de Conta (Destino)</label>
            <div className="account-selector">
              <button 
                className={`account-btn ${tipoConta === 'todos' ? 'active' : ''}`}
                onClick={() => setTipoConta('todos')}
              >
                Todas
              </button>
              <button 
                className={`account-btn ${tipoConta === 'cnpj' ? 'active' : ''}`}
                onClick={() => setTipoConta('cnpj')}
              >
                🏢 Academia (CNPJ)
              </button>
              <button 
                className={`account-btn ${tipoConta === 'cpf' ? 'active' : ''}`}
                onClick={() => setTipoConta('cpf')}
              >
                👤 Personal (CPF)
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex jc-between ai-center mb-3">
          <div>
            <h3 style={{ margin: 0 }}>Pagamentos Confirmados</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>{dadosFiltrados.length} registros encontrados</p>
          </div>
          <button 
            className="btn btn-primary btn-glow"
            onClick={handleImprimir}
            disabled={selecionadas.length === 0}
            title={selecionadas.length === 0 ? "Selecione ao menos uma linha abaixo para imprimir" : ""}
          >
            🖨️ Gerar Relatório ({formatValor(dadosFiltrados
              .filter(d => selecionadas.includes(d.id))
              .reduce((acc, curr) => acc + (curr.valor - (curr.aluna_desconto || 0)), 0)
            )})
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    checked={selecionadas.length === dadosFiltrados.length && dadosFiltrados.length > 0}
                    onChange={() => {
                      if (selecionadas.length === dadosFiltrados.length) setSelecionadas([]);
                      else setSelecionadas(dadosFiltrados.map(d => d.id));
                    }}
                  />
                </th>
                <th>Aluna</th>
                <th>Email</th>
                <th className="hide-mobile">Meio</th>
                <th>Conta</th>
                <th>Valor Líquido</th>
                <th>Data Recebto</th>
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.map((d) => (
                <tr 
                  key={d.id} 
                  className={selecionadas.includes(d.id) ? 'selected-row' : ''}
                  onClick={() => {
                    setSelecionadas(prev => 
                      prev.includes(d.id) ? prev.filter(i => i !== d.id) : [...prev, d.id]
                    );
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selecionadas.includes(d.id)}
                      readOnly
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{d.aluna_nome}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      CPF: {d.aluna_cpf || 'Não informado'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{d.aluna_email || '-'}</div>
                  </td>
                  <td className="hide-mobile">
                    <span className="treino-badge" style={{ fontSize: '0.7rem' }}>
                      {d.meio_pagamento}
                    </span>
                  </td>
                  <td>
                    {d.tipo_conta === 'cnpj' ? '🏢 Academia' : '👤 Personal'}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>
                    {formatValor(d.valor - (d.aluna_desconto || 0))}
                  </td>
                  <td>{formatData(d.data_pagamento)}</td>
                </tr>
              ))}
              {dadosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-muted" style={{ padding: '3rem' }}>
                    Nenhum pagamento recebido encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Controle;
