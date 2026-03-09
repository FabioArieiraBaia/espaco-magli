import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function QuadroHorarios() {
  const { api } = useAuth();
  const [horarios, setHorarios] = useState({});
  const [loading, setLoading] = useState(true);

  const dias = ['segunda', 'terça', 'quarta', 'quinta', 'sexta'];
  const diasLabel = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA'];
  const horas = ['7:00', '8:00', '9:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  const horasPromocionais = ['14:00', '15:00'];

  // Detectar dia/hora atual
  const now = new Date();
  const diasMap = { 1: 'segunda', 2: 'terça', 3: 'quarta', 4: 'quinta', 5: 'sexta' };
  const diaAtual = diasMap[now.getDay()] || null;
  const horaAtual = `${now.getHours()}:00`;
  // Considerar a hora atual se estiver entre as horas do quadro
  const horaAtualNoQuadro = horas.includes(horaAtual) ? horaAtual : null;

  useEffect(() => {
    if (!api) return;
    loadHorarios();
  }, [api]);

  const loadHorarios = async () => {
    if (!api) return;
    try {
      const res = await api.get('/horarios');
      setHorarios(res.data);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlunas = (dia, hora) => {
    return horarios[dia]?.[hora] || [];
  };

  const countAlunas = (dia, hora) => {
    return getAlunas(dia, hora).length;
  };

  // Alunas na academia agora
  const alunasAgora = diaAtual && horaAtualNoQuadro ? getAlunas(diaAtual, horaAtualNoQuadro) : [];

  if (loading) {
    return <div className="page"><p className="text-center">Carregando...</p></div>;
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>📅 Quadro de Horários</h1>
        <p className="text-muted">Visualização das alunas por horário</p>
      </div>

      {/* Card de Alunas Agora */}
      {diaAtual && (
        <div className="card mb-4" style={{
          background: alunasAgora.length > 0
            ? 'linear-gradient(135deg, rgba(255, 20, 147, 0.15), rgba(255, 105, 180, 0.1))'
            : 'var(--gray)',
          borderColor: alunasAgora.length > 0 ? 'var(--primary)' : undefined,
          borderWidth: alunasAgora.length > 0 ? '2px' : undefined,
        }}>
          <div className="flex ai-center gap-2 mb-2">
            <span style={{ fontSize: '1.5rem' }}>{alunasAgora.length > 0 ? '🏋️‍♀️' : '🕐'}</span>
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>
              {alunasAgora.length > 0 ? 'Agora na Academia' : 'Nenhuma aluna agora'}
            </h3>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>
              ({diasLabel[dias.indexOf(diaAtual)]}, {horaAtualNoQuadro || now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0')})
            </span>
          </div>
          {alunasAgora.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {alunasAgora.map((aluna, i) => (
                <span key={i} style={{
                  display: 'inline-block',
                  padding: '0.4rem 0.75rem',
                  background: 'var(--primary)',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'white'
                }}>
                  {aluna}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted" style={{ margin: 0 }}>
              {horaAtualNoQuadro ? 'Nenhuma aluna cadastrada neste horário.' : 'Horário atual fora do período de aulas.'}
            </p>
          )}
        </div>
      )}

      {/* Versão Desktop - Grid */}
      <div className="card hidden-mobile" style={{ display: 'block' }}>
        <div className="horarios-grid">
          {/* Header com dias */}
          <div className="horario-row">
            <div></div>
            {dias.map((d, i) => (
              <div key={d} className="horario-header" style={{
                background: d === diaAtual ? 'white' : undefined,
                color: d === diaAtual ? 'var(--primary)' : 'white',
                fontWeight: 700
              }}>
                {diasLabel[i]}
                {d === diaAtual && <span style={{ fontSize: '0.7rem', display: 'block' }}>HOJE</span>}
              </div>
            ))}
          </div>

          {/* Linhas por horário */}
          {horas.map(hora => (
            <div key={hora} className="horario-row">
              <div className={`horario-time ${horasPromocionais.includes(hora) ? 'text-primary' : ''}`}>
                {hora}
              </div>
              {dias.map(dia => {
                const alunas = getAlunas(dia, hora);
                const isPromocional = horasPromocionais.includes(hora);
                const total = countAlunas(dia, hora);
                const isAgora = dia === diaAtual && hora === horaAtualNoQuadro;

                return (
                  <div
                    key={dia}
                    className={`horario-cell ${isPromocional ? 'promocional' : ''}`}
                    style={{
                      ...(isAgora ? {
                        background: 'rgba(255, 20, 147, 0.2)',
                        border: '2px solid var(--primary)',
                        borderRadius: '8px',
                        animation: 'pulse 2s ease-in-out infinite'
                      } : {})
                    }}
                  >
                    {total > 0 && (
                      <div style={{ marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {total} aluna{total > 1 ? 's' : ''}
                      </div>
                    )}
                    {alunas.map((aluna, i) => (
                      <span key={i} className="aluna">{aluna}</span>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legenda */}
        <div className="mt-3 flex gap-2 flex-wrap" style={{ fontSize: '0.85rem' }}>
          <span className="text-muted">Legenda:</span>
          <span style={{
            padding: '0.25rem 0.75rem',
            border: '2px solid var(--primary)',
            borderRadius: '4px',
            fontSize: '0.8rem'
          }}>
            🔴 Horário Promocional
          </span>
          <span style={{
            padding: '0.25rem 0.75rem',
            background: 'rgba(255, 20, 147, 0.2)',
            border: '2px solid var(--primary)',
            borderRadius: '4px',
            fontSize: '0.8rem'
          }}>
            ⏰ Agora
          </span>
        </div>
      </div>

      {/* Versão Mobile - Cards */}
      <div className="grid-cards hidden-desktop" style={{ display: 'none' }}>
        <style>{`
          @media (max-width: 768px) {
            .hidden-mobile { display: none !important; }
            .hidden-desktop { display: grid !important; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>

        {horas.map(hora => {
          const isPromocional = horasPromocionais.includes(hora);
          const temAlunas = dias.some(d => countAlunas(d, hora) > 0);

          if (!temAlunas) return null;

          return (
            <div
              key={hora}
              className={`card ${isPromocional ? 'promocional-card' : ''}`}
              style={isPromocional ? { borderColor: 'var(--primary)' } : {}}
            >
              <h3 style={{
                marginBottom: '1rem',
                color: isPromocional ? 'var(--primary)' : 'var(--text)'
              }}>
                ⏰ {hora}
                {isPromocional && <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>PROMOCIONAL</span>}
              </h3>

              {dias.map(dia => {
                const alunas = getAlunas(dia, hora);
                if (alunas.length === 0) return null;
                const isAgora = dia === diaAtual && hora === horaAtualNoQuadro;

                return (
                  <div key={dia} style={{
                    marginBottom: '0.75rem',
                    ...(isAgora ? {
                      background: 'rgba(255, 20, 147, 0.1)',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid var(--primary)'
                    } : {})
                  }}>
                    <strong style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
                      {dia}: {isAgora && '⏰ AGORA'}
                    </strong>
                    <div style={{ marginTop: '0.25rem' }}>
                      {alunas.map((a, i) => (
                        <span
                          key={i}
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.5rem',
                            background: 'var(--primary)',
                            borderRadius: '4px',
                            margin: '0.125rem',
                            fontSize: '0.8rem'
                          }}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Resumo por dia */}
      <div className="mt-4">
        <h2 className="mb-2" style={{ fontSize: '1.25rem' }}>📊 Resumo por Dia</h2>
        <div className="grid-cards">
          {dias.map((dia, i) => {
            const total = horas.reduce((sum, h) => sum + countAlunas(dia, h), 0);
            return (
              <div key={dia} className="card text-center" style={{
                borderColor: dia === diaAtual ? 'var(--primary)' : undefined,
                borderWidth: dia === diaAtual ? '2px' : undefined
              }}>
                <h3 style={{ color: 'var(--primary)' }}>{diasLabel[i]}</h3>
                <p style={{ fontSize: '2rem', fontWeight: 700 }}>{total}</p>
                <p className="text-muted">alunas</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumo por horário */}
      <div className="mt-4">
        <h2 className="mb-2" style={{ fontSize: '1.25rem' }}>📊 Horários Mais Movimentados</h2>
        <div className="list">
          {horas
            .map(h => ({
              hora: h,
              total: dias.reduce((sum, d) => sum + countAlunas(d, h), 0)
            }))
            .sort((a, b) => b.total - a.total)
            .filter(h => h.total > 0)
            .map((h, i) => (
              <div key={h.hora} className="list-item">
                <span>
                  {i === 0 && '🥇 '}
                  {i === 1 && '🥈 '}
                  {i === 2 && '🥉 '}
                  <strong>{h.hora}</strong>
                  {horasPromocionais.includes(h.hora) && (
                    <span className="text-primary" style={{ marginLeft: '0.5rem' }}>(promocional)</span>
                  )}
                </span>
                <span className="text-primary" style={{ fontWeight: 600 }}>
                  {h.total} aluna{h.total > 1 ? 's' : ''}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default QuadroHorarios;