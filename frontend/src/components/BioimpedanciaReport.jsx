import React from 'react';

const BioimpedanciaReport = ({ data }) => {
  if (!data || !data.avaliacoes || !data.avaliacoes[0]) return null;
  
  const report = data.avaliacoes[0];
  const dadosCorpo = report.dadosCorpo || {};
  const dadosMembros = report.dadosMembros || [];
  const dadosFrequencia = report.dadosFrequencia || [];
  const paciente = data.paciente || {};

  // Formatação de números
  const f = (val, decimals = 1) => {
    if (val === null || val === undefined || isNaN(val)) return '--';
    return Number(val).toFixed(decimals).replace('.', ',');
  };

  const MetricBar = ({ label, value, min, max, unit, idealMin, idealMax, hideRange = false }) => {
    const range = max - min;
    const percentage = Math.min(Math.max(((value - min) / range) * 100, 0), 100);
    
    const normalStart = ((idealMin - min) / range) * 100;
    const normalEnd = ((idealMax - min) / range) * 100;

    return (
      <div className="metric-row" style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#eee' }}>{label}</span>
          <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1rem' }}>{f(value)} {unit}</span>
        </div>
        <div style={{ position: 'relative', height: '14px', background: 'rgba(255,255,255,0.08)', borderRadius: '7px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Zonas Coloridas com Opacidade Maior para Contraste */}
          <div style={{ position: 'absolute', left: 0, width: `${normalStart}%`, height: '100%', background: 'rgba(52, 152, 219, 0.4)' }}></div>
          <div style={{ position: 'absolute', left: `${normalStart}%`, width: `${normalEnd - normalStart}%`, height: '100%', background: 'rgba(46, 204, 113, 0.4)' }}></div>
          <div style={{ position: 'absolute', left: `${normalEnd}%`, width: `${100 - normalEnd}%`, height: '100%', background: 'rgba(231, 76, 60, 0.4)' }}></div>
          
          {/* Marcadores de Escala Fina */}
          {!hideRange && [0, 25, 50, 75, 100].map(p => (
            <div key={p} style={{ position: 'absolute', left: `${p}%`, top: 0, width: '1px', height: '100%', background: 'rgba(255,255,255,0.2)' }}></div>
          ))}

          {/* Cursor do Valor Principal */}
          <div style={{ 
            position: 'absolute', 
            left: `${percentage}%`, 
            width: '6px', 
            height: '100%', 
            background: '#fff', 
            boxShadow: '0 0 8px rgba(255,255,255,0.8)',
            zIndex: 10,
            transform: 'translateX(-3px)'
          }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#aaa', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <span style={{ flex: 1, textAlign: 'left' }}>Abaixo</span>
          <span style={{ flex: 1, textAlign: 'center' }}>Normal</span>
          <span style={{ flex: 1, textAlign: 'right' }}>Acima</span>
        </div>
      </div>
    );
  };

  // Helper para buscar dados de membros
  const getMembro = (idx) => {
    const m = dadosMembros.find(item => item.membro === idx);
    return m ? m.composicaoCorporal : {};
  };

  const SegmentalBox = ({ label, idx }) => {
    const memData = getMembro(idx);
    return (
      <div style={{ background: 'rgba(20,20,20,0.6)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid rgba(226, 0, 122, 0.2)', minWidth: '110px' }}>
        <div style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '6px', textAlign: 'center', color: '#fff', fontSize: '0.75rem' }}>{label}</div>
        <div style={{ marginBottom: '4px' }}>
          <div style={{ color: '#aaa', fontSize: '0.65rem' }}>MUSCULAR</div>
          <div style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '0.9rem' }}>{f(memData.ffm)} kg</div>
        </div>
        <div>
          <div style={{ color: '#aaa', fontSize: '0.65rem' }}>GORDURA</div>
          <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>{f(memData.fm)} kg</div>
        </div>
      </div>
    );
  };

  return (
    <div className="bioimpedancia-report print-section" style={{ color: '#fff', background: '#0a0a0a', padding: '30px', borderRadius: '15px' }}>
      {/* Cabeçalho Profissional */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid var(--primary)', paddingBottom: '20px', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.8rem' }}>Avaliação de Composição Corporal</h2>
          <div style={{ marginTop: '5px' }}>
            <span style={{ background: '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', marginRight: '10px' }}>MAGLI CTF</span>
            <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Rua Conde de Valença, 71 - Valença, RJ</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{paciente.nome || 'Paciente'}</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>Data: {new Date(report.data).toLocaleString('pt-BR')}</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>Estatura: {f(paciente.estaturaCm/100, 2)}m | Idade: {paciente.idade || report.idade} anos</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '40px' }}>
        {/* Coluna Esquerda: Visão Geral (Gráficos) */}
        <div>
          <h3 style={{ borderLeft: '5px solid var(--primary)', paddingLeft: '15px', marginBottom: '25px', fontSize: '1.2rem', textTransform: 'uppercase' }}>Análise Global Resumida</h3>
          
          <MetricBar label="Peso Corporal" value={report.peso} min={31.1} max={110.7} unit="kg" idealMin={47} idealMax={63} />
          <MetricBar label="Percentual de Gordura" value={dadosCorpo.fmPercentual} min={4} max={69} unit="%" idealMin={17} idealMax={30} />
          <MetricBar label="Massa Muscular Esquelética" value={dadosCorpo.ssm} min={10} max={50} unit="kg" idealMin={23} idealMax={32} />
          <MetricBar label="Massa de Gordura" value={dadosCorpo.fm} min={2.2} max={37.5} unit="kg" idealMin={9.2} idealMax={16.3} />
          <MetricBar label="Massa Livre de Gordura" value={dadosCorpo.ffm} min={31} max={66.3} unit="kg" idealMin={41.6} idealMax={52.2} />
          <MetricBar label="Água Corporal Total" value={dadosCorpo.tbw} min={20} max={100} unit="L" idealMin={36} idealMax={52} />
          <MetricBar label="IMC" value={dadosCorpo.bmi} min={12.3} max={43.8} unit="" idealMin={18.6} idealMax={24.9} />

          {/* Dados Adicionais em Tiles */}
          <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '5px' }}>T. METABÓLICA BASAL</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{f(report.taxaMetabolicaBasal, 0)} <small style={{ fontSize: '0.6rem' }}>kcal</small></div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '5px' }}>GORDURA VISCERAL</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f1c40f' }}>Nível {dadosCorpo.vfl}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '5px' }}>IDADE METABÓLICA</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#3498db' }}>{report.idadeMetabolica} anos</div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Análise Segmentada/Mapa Corporall */}
        <div>
          <h3 style={{ borderLeft: '5px solid var(--primary)', paddingLeft: '15px', marginBottom: '25px', fontSize: '1.2rem', textTransform: 'uppercase' }}>Análise de Massa</h3>
          
          <div style={{ position: 'relative', height: '450px', display: 'flex', justifyContent: 'center' }}>
            {/* Silhueta Central */}
            <div style={{ width: '160px', height: '100%', opacity: 0.15, background: 'linear-gradient(to bottom, var(--primary), #000)', borderRadius: '80px 80px 20px 20px' }}></div>
            
            {/* BRAÇO DIREITO (membro: 0) */}
            <div style={{ position: 'absolute', top: '20px', right: '-20px' }}>
              <SegmentalBox label="Braço Dir." idx={0} />
            </div>
            {/* BRAÇO ESQUERDO (membro: 1) */}
            <div style={{ position: 'absolute', top: '20px', left: '-20px' }}>
              <SegmentalBox label="Braço Esq." idx={1} />
            </div>
            {/* TRONCO (membro: 2) */}
            <div style={{ position: 'absolute', top: '150px', left: '50%', transform: 'translateX(-50%)' }}>
              <SegmentalBox label="Tronco" idx={2} />
            </div>
            {/* PERNA DIREITA (membro: 3) */}
            <div style={{ position: 'absolute', bottom: '20px', right: '-20px' }}>
              <SegmentalBox label="Perna Dir." idx={3} />
            </div>
            {/* PERNA ESQUERDA (membro: 4) */}
            <div style={{ position: 'absolute', bottom: '20px', left: '-20px' }}>
              <SegmentalBox label="Perna Esq." idx={4} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Impedâncias Z (Ω) */}
      <div style={{ marginTop: '50px' }}>
        <h3 style={{ borderLeft: '5px solid var(--primary)', paddingLeft: '15px', marginBottom: '20px', fontSize: '1.1rem', textTransform: 'uppercase' }}>Tabela de Impedâncias Z (Ω)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: '#ddd' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(226,0,122,0.5)', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>Freq/Membro</th>
              <th style={{ padding: '10px' }}>BD (Braço Dir)</th>
              <th style={{ padding: '10px' }}>BE (Braço Esq)</th>
              <th style={{ padding: '10px' }}>TR (Tronco)</th>
              <th style={{ padding: '10px' }}>PD (Perna Dir)</th>
              <th style={{ padding: '10px' }}>PE (Perna Esq)</th>
            </tr>
          </thead>
          <tbody>
            {dadosFrequencia.map((freq, fIdx) => (
              <tr key={fIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>
                  {freq.frequency === 0 ? '5 kHz' : freq.frequency === 1 ? '50 kHz' : '250 kHz'}
                </td>
                <td style={{ padding: '10px' }}>{freq.impedanceRightArm}</td>
                <td style={{ padding: '10px' }}>{freq.impedanceLeftArm}</td>
                <td style={{ padding: '10px' }}>{freq.impedanceTrunk}</td>
                <td style={{ padding: '10px' }}>{freq.impedanceRightLeg}</td>
                <td style={{ padding: '10px' }}>{freq.impedanceLeftLeg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)', textAlign: 'center', fontSize: '0.8rem', color: '#777' }}>
        Relatório técnico processado via Tecnologia Avanutri. Exclusivo para Centros de Treinamento Magli.
      </div>
    </div>
  );
};

export default BioimpedanciaReport;
