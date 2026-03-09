import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ==================== Helper Components ====================
const SimNao = ({ field, label, data, onChange }) => (
  <div style={{ marginBottom: '0.75rem' }}>
    <label style={{ fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>{label}</label>
    <div className="radio-group">
      <label className={`radio-item ${data[field] === 'sim' ? 'active' : ''}`}>
        <input type="radio" checked={data[field] === 'sim'} onChange={() => onChange(field, 'sim')} /> SIM
      </label>
      <label className={`radio-item ${data[field] === 'nao' ? 'active' : ''}`}>
        <input type="radio" checked={data[field] === 'nao'} onChange={() => onChange(field, 'nao')} /> NÃO
      </label>
    </div>
  </div>
);

const SimNaoTexto = ({ field, textField, label, textLabel, data, onChange }) => (
  <div style={{ marginBottom: '1rem' }}>
    <SimNao field={field} label={label} data={data} onChange={onChange} />
    {data[field] === 'sim' && (
      <input type="text" className="form-control" placeholder={textLabel || 'Especifique...'}
        value={data[textField] || ''} onChange={e => onChange(textField, e.target.value)} style={{ marginTop: '0.25rem' }} />
    )}
  </div>
);

const FamiliarRow = ({ field, textField, label, data, onChange }) => (
  <div className="form-row" style={{ alignItems: 'center', marginBottom: '0.5rem' }}>
    <div style={{ minWidth: '180px', fontWeight: 500 }}>{label}:</div>
    <div className="radio-group" style={{ marginRight: '0.5rem' }}>
      <label className={`radio-item ${data[field] === 'sim' ? 'active' : ''}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>
        <input type="radio" checked={data[field] === 'sim'} onChange={() => onChange(field, 'sim')} /> SIM
      </label>
      <label className={`radio-item ${data[field] === 'nao' ? 'active' : ''}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>
        <input type="radio" checked={data[field] === 'nao'} onChange={() => onChange(field, 'nao')} /> NÃO
      </label>
    </div>
    {data[field] === 'sim' && (
      <input type="text" className="form-control" placeholder="Quem?"
        value={data[textField] || ''} onChange={e => onChange(textField, e.target.value)}
        style={{ flex: 1, maxWidth: '200px' }} />
    )}
  </div>
);

function FichaCadastral() {
  const { id } = useParams();
  const { api, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [professoras, setProfessoras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    nome: '', nascimento: '', email: '', cpf: '', telefone: '',
    professora_id: '', vezes_semana: '', data_inicio: '',
    dias_semana: [], horarios: {}, data_vencimento: ''
  });

  const [anamnese, setAnamnese] = useState({
    idade: '', estado_civil: '', profissao: '',
    altura: '', peso: '', imc: '', gordura_corporal: '',
    problema_saude: 'nao', problema_saude_qual: '', liberacao_medica: 'nao',
    usa_medicamentos: 'nao', medicamentos_qual: '',
    possui_alergias: 'nao', alergias_qual: '',
    problemas_cardiacos: 'nao', cardiacos_qual: '',
    problemas_respiratorios: 'nao', respiratorios_qual: '',
    fam_hipertensao: 'nao', fam_hipertensao_quem: '',
    fam_diabetes: 'nao', fam_diabetes_quem: '',
    fam_doencas_cardiacas: 'nao', fam_cardiacas_quem: '',
    fam_cancer: 'nao', fam_cancer_quem: '',
    fam_outras: 'nao', fam_outras_quem: '',
    pratica_atividade: 'nao', atividade_qual: '',
    frequentou_academia: 'nao', academia_tempo: '',
    nivel_atividade: '',
    obj_emagrecimento: false, obj_flexibilidade: false, obj_condicionamento: false,
    obj_massa_muscular: false, obj_reducao_medidas: false, obj_outros: '',
    tempo_objetivo: '',
    fuma: 'nao', consome_alcool: 'nao', alcool_frequencia: '',
    alimentacao: '', horas_sono: '',
    sofreu_lesoes: 'nao', lesoes_qual: '',
    passou_cirurgias: 'nao', cirurgias_qual: '',
    ultimo_ciclo: '', menopausa: 'nao', menopausa_desde: '',
    info_adicionais: '',
  });

  const diasOpcoes = ['segunda', 'terça', 'quarta', 'quinta', 'sexta'];

  useEffect(() => { if (api) api.get('/professoras').then(r => setProfessoras(r.data)).catch(() => { }); }, [api]);

  useEffect(() => {
    if (!api || !id) return;
    api.get(`/alunas/${id}`).then(res => {
      const data = res.data;
      let horarios = data.horarios || {};
      if (Array.isArray(horarios)) {
        const h = {}; (data.dias_semana || []).forEach(d => { h[d] = [...horarios]; }); horarios = h;
      }
      setForm({ ...data, dias_semana: data.dias_semana || [], horarios });
    }).catch(() => { });

    api.get(`/anamnese/${id}`).then(res => {
      if (res.data && res.data.id) {
        const d = res.data, parsed = { ...anamnese };
        ['idade', 'estado_civil', 'profissao', 'altura', 'peso', 'imc', 'gordura_corporal',
          'problema_saude', 'problema_saude_qual', 'liberacao_medica', 'usa_medicamentos', 'medicamentos_qual',
          'possui_alergias', 'alergias_qual', 'problemas_cardiacos', 'cardiacos_qual',
          'problemas_respiratorios', 'respiratorios_qual', 'pratica_atividade', 'atividade_qual',
          'frequentou_academia', 'academia_tempo', 'nivel_atividade', 'tempo_objetivo',
          'sofreu_lesoes', 'lesoes_qual', 'passou_cirurgias', 'cirurgias_qual',
          'ultimo_ciclo', 'menopausa', 'menopausa_desde', 'info_adicionais']
          .forEach(f => { if (d[f] != null) parsed[f] = d[f]; });
        try { if (d.historico_familiar) Object.assign(parsed, JSON.parse(d.historico_familiar)); } catch (e) { }
        try { if (d.objetivos) Object.assign(parsed, JSON.parse(d.objetivos)); } catch (e) { }
        try { if (d.habitos) Object.assign(parsed, JSON.parse(d.habitos)); } catch (e) { }
        setAnamnese(parsed);
      }
    }).catch(() => { });
  }, [id, api]);

  const validate = () => {
    const e = {};
    if (!form.nome) e.nome = 'Nome é obrigatório';
    if (!form.professora_id) e.professora_id = 'Professora é obrigatória';
    if (!form.vezes_semana) e.vezes_semana = 'Frequência é obrigatória';
    if (!form.data_inicio) e.data_inicio = 'Data de início é obrigatória';
    if (!form.dias_semana.length) e.dias_semana = 'Selecione pelo menos um dia';
    if (!Object.values(form.horarios).some(arr => Array.isArray(arr) && arr.length > 0)) e.horarios = 'Selecione pelo menos um horário';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleChange = (field, value) => { setForm(p => ({ ...p, [field]: value })); if (errors[field]) setErrors(p => ({ ...p, [field]: null })); };
  const handleAnamnese = (field, value) => {
    setAnamnese(prev => {
      const u = { ...prev, [field]: value };
      if (field === 'peso' || field === 'altura') {
        const peso = field === 'peso' ? parseFloat(value) : parseFloat(prev.peso);
        const alt = field === 'altura' ? parseFloat(value) : parseFloat(prev.altura);
        if (peso && alt) { const m = alt > 3 ? alt / 100 : alt; u.imc = (peso / (m * m)).toFixed(1); }
      }
      return u;
    });
  };

  const toggleDia = (dia) => {
    const arr = form.dias_semana; let nd, nh = { ...form.horarios };
    if (arr.includes(dia)) { nd = arr.filter(v => v !== dia); delete nh[dia]; }
    else { nd = [...arr, dia]; nh[dia] = []; }
    setForm(p => ({ ...p, dias_semana: nd, horarios: nh }));
    if (errors.dias_semana) setErrors(p => ({ ...p, dias_semana: null }));
  };

  const toggleHorarioDia = (dia, hora) => {
    const h = { ...form.horarios }, arr = h[dia] || [];
    h[dia] = arr.includes(hora) ? arr.filter(x => x !== hora) : [...arr, hora];
    setForm(p => ({ ...p, horarios: h }));
    if (errors.horarios) setErrors(p => ({ ...p, horarios: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      let alunaId = id;
      if (id) { await api.put(`/alunas/${id}`, form); }
      else { const r = await api.post('/alunas', form); alunaId = r.data?.id; }

      // Salvar anamnese
      if (alunaId) {
        const payload = {
          aluna_id: alunaId, nome: form.nome, nascimento: form.nascimento,
          telefone: form.telefone, email: form.email,
          ...Object.fromEntries(
            ['idade', 'estado_civil', 'profissao', 'altura', 'peso', 'imc', 'gordura_corporal',
              'problema_saude', 'problema_saude_qual', 'liberacao_medica',
              'usa_medicamentos', 'medicamentos_qual', 'possui_alergias', 'alergias_qual',
              'problemas_cardiacos', 'cardiacos_qual', 'problemas_respiratorios', 'respiratorios_qual',
              'pratica_atividade', 'atividade_qual', 'frequentou_academia', 'academia_tempo',
              'nivel_atividade', 'tempo_objetivo',
              'sofreu_lesoes', 'lesoes_qual', 'passou_cirurgias', 'cirurgias_qual',
              'ultimo_ciclo', 'menopausa', 'menopausa_desde', 'info_adicionais']
              .map(f => [f, anamnese[f]])
          ),
          historico_familiar: JSON.stringify({
            fam_hipertensao: anamnese.fam_hipertensao, fam_hipertensao_quem: anamnese.fam_hipertensao_quem,
            fam_diabetes: anamnese.fam_diabetes, fam_diabetes_quem: anamnese.fam_diabetes_quem,
            fam_doencas_cardiacas: anamnese.fam_doencas_cardiacas, fam_cardiacas_quem: anamnese.fam_cardiacas_quem,
            fam_cancer: anamnese.fam_cancer, fam_cancer_quem: anamnese.fam_cancer_quem,
            fam_outras: anamnese.fam_outras, fam_outras_quem: anamnese.fam_outras_quem,
          }),
          objetivos: JSON.stringify({
            obj_emagrecimento: anamnese.obj_emagrecimento, obj_flexibilidade: anamnese.obj_flexibilidade,
            obj_condicionamento: anamnese.obj_condicionamento, obj_massa_muscular: anamnese.obj_massa_muscular,
            obj_reducao_medidas: anamnese.obj_reducao_medidas, obj_outros: anamnese.obj_outros,
          }),
          habitos: JSON.stringify({
            fuma: anamnese.fuma, consome_alcool: anamnese.consome_alcool,
            alcool_frequencia: anamnese.alcool_frequencia, alimentacao: anamnese.alimentacao,
            horas_sono: anamnese.horas_sono,
          }),
        };
        try {
          const ex = await api.get(`/anamnese/${alunaId}`);
          if (ex.data?.id) {
            await api.put(`/anamnese/${ex.data.id}`, payload);
          } else {
            await api.post('/anamnese', payload);
          }
        } catch (e) {
          try { await api.post('/anamnese', payload); } catch (e2) {
            console.error(e2);
            alert('Falha ao salvar anamnese: ' + (e2.response?.data?.message || e2.message));
          }
        }
      }
      navigate(-1);
    } catch (error) {
      console.error('Erro geral:', error.response?.data || error);
      alert('Falha no formulário: ' + (error.response?.data?.message || error.message));
    }
    finally { setLoading(false); }
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>{id ? 'Editar Ficha' : 'Nova Ficha Cadastral'}</h1>
        <button className="btn btn-outline" onClick={() => navigate(-1)}>← Voltar</button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* =============================== DADOS CADASTRAIS =============================== */}
        <div className="card mb-3">
          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>📋 DADOS CADASTRAIS</h2>
          <div className="form-row">
            <div className="form-group">
              <label className="required">Professora Responsável</label>
              <select className="form-control" value={form.professora_id} onChange={e => handleChange('professora_id', e.target.value)}
                style={{ borderColor: errors.professora_id ? 'var(--primary)' : undefined }}>
                <option value="">Selecione...</option>
                {professoras.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                {isAdmin && <option value={user?.id}>{user?.nome} (Admin)</option>}
              </select>
              {errors.professora_id && <span className="text-primary" style={{ fontSize: '0.85rem' }}>{errors.professora_id}</span>}
            </div>
            <div className="form-group">
              <label className="required">Nome da Aluna</label>
              <input type="text" className="form-control" placeholder="Nome completo" value={form.nome}
                onChange={e => handleChange('nome', e.target.value)}
                style={{ borderColor: errors.nome ? 'var(--primary)' : undefined }} />
              {errors.nome && <span className="text-primary" style={{ fontSize: '0.85rem' }}>{errors.nome}</span>}
            </div>
            <div className="form-group">
              <label>Data de Nascimento</label>
              <input type="date" className="form-control" value={form.nascimento} onChange={e => handleChange('nascimento', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>E-mail</label>
              <input type="email" className="form-control" placeholder="email@exemplo.com" value={form.email} onChange={e => handleChange('email', e.target.value)} /></div>
            <div className="form-group"><label>CPF</label>
              <input type="text" className="form-control" placeholder="000.000.000-00" value={form.cpf} onChange={e => handleChange('cpf', e.target.value)} /></div>
            <div className="form-group"><label>Telefone</label>
              <input type="tel" className="form-control" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => handleChange('telefone', e.target.value)} /></div>
          </div>
        </div>

        {/* =============================== DIA E HORA DOS TREINOS =============================== */}
        <div className="card mb-3">
          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>📅 DIA E HORA DOS TREINOS</h2>
          <div className="form-row">
            <div className="form-group">
              <label className="required">Vezes por semana</label>
              <div className="radio-group">
                {[1, 2, 3, 4, 5].map(n => (
                  <label key={n} className={`radio-item ${form.vezes_semana === n ? 'active' : ''}`}>
                    <input type="radio" name="vezes" checked={form.vezes_semana === n} onChange={() => handleChange('vezes_semana', n)} /> {n}x
                  </label>
                ))}
              </div>
              {errors.vezes_semana && <span className="text-primary" style={{ fontSize: '0.85rem' }}>{errors.vezes_semana}</span>}
            </div>
            <div className="form-group">
              <label className="required">Data de Início</label>
              <input type="date" className="form-control" value={form.data_inicio} onChange={e => handleChange('data_inicio', e.target.value)}
                style={{ borderColor: errors.data_inicio ? 'var(--primary)' : undefined }} />
              {errors.data_inicio && <span className="text-primary" style={{ fontSize: '0.85rem' }}>{errors.data_inicio}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="required">Dias e Horários</label>
            {errors.dias_semana && <span className="text-primary" style={{ fontSize: '0.85rem', marginLeft: '0.5rem' }}>{errors.dias_semana}</span>}
            {errors.horarios && <span className="text-primary" style={{ fontSize: '0.85rem', marginLeft: '0.5rem' }}>{errors.horarios}</span>}
            {diasOpcoes.map(dia => {
              const ativo = form.dias_semana.includes(dia), hrs = form.horarios[dia] || [];
              return (
                <div key={dia} className="card mb-2" style={{ background: 'var(--gray)', padding: '1rem', opacity: ativo ? 1 : 0.6, borderColor: ativo ? 'var(--primary)' : undefined }}>
                  <label className={`checkbox-item ${ativo ? 'active' : ''}`} style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
                    <input type="checkbox" checked={ativo} onChange={() => toggleDia(dia)} />
                    {dia.charAt(0).toUpperCase() + dia.slice(1)}
                  </label>
                  {ativo && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ width: '100%', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Manhã:</div>
                      {['7:00', '8:00', '9:00', '10:00', '11:00'].map(h => (
                        <label key={h} className={`checkbox-item ${hrs.includes(h) ? 'active' : ''}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                          <input type="checkbox" checked={hrs.includes(h)} onChange={() => toggleHorarioDia(dia, h)} /> {h}
                        </label>
                      ))}
                      <div style={{ width: '100%', fontSize: '0.85rem', color: 'var(--primary)', marginTop: '0.5rem', marginBottom: '0.5rem' }}>Promocional:</div>
                      {['14:00', '15:00'].map(h => (
                        <label key={h} className={`checkbox-item ${hrs.includes(h) ? 'active' : ''}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', borderColor: 'var(--primary)' }}>
                          <input type="checkbox" checked={hrs.includes(h)} onChange={() => toggleHorarioDia(dia, h)} /> {h}
                        </label>
                      ))}
                      <div style={{ width: '100%', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '0.5rem' }}>Tarde:</div>
                      {['16:00', '17:00', '18:00'].map(h => (
                        <label key={h} className={`checkbox-item ${hrs.includes(h) ? 'active' : ''}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                          <input type="checkbox" checked={hrs.includes(h)} onChange={() => toggleHorarioDia(dia, h)} /> {h}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* =======================================================================
            FICHA DE ANAMNESE
            ======================================================================= */}
        <div style={{ borderTop: '3px solid var(--primary)', marginTop: '2rem', paddingTop: '1.5rem' }}>
          <h1 style={{ color: 'var(--primary)', marginBottom: '1.5rem', textAlign: 'center' }}>🩺 FICHA DE ANAMNESE</h1>

          {/* Dados Pessoais Complementares */}
          <div className="card mb-3">
            <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>📋 Dados Pessoais</h2>
            <div className="form-row">
              <div className="form-group"><label>Idade</label>
                <input type="number" className="form-control" value={anamnese.idade} onChange={e => handleAnamnese('idade', e.target.value)} /></div>
              <div className="form-group"><label>Estado Civil</label>
                <input type="text" className="form-control" value={anamnese.estado_civil} onChange={e => handleAnamnese('estado_civil', e.target.value)} /></div>
              <div className="form-group"><label>Profissão</label>
                <input type="text" className="form-control" value={anamnese.profissao} onChange={e => handleAnamnese('profissao', e.target.value)} /></div>
            </div>
          </div>

          {/* Dados Físicos */}
          <div className="card mb-3">
            <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>📏 Dados Físicos</h2>
            <div className="form-row">
              <div className="form-group"><label>Altura (cm)</label>
                <input type="number" step="0.01" className="form-control" value={anamnese.altura} onChange={e => handleAnamnese('altura', e.target.value)} /></div>
              <div className="form-group"><label>Peso (kg)</label>
                <input type="number" step="0.1" className="form-control" value={anamnese.peso} onChange={e => handleAnamnese('peso', e.target.value)} /></div>
              <div className="form-group"><label>IMC</label>
                <input type="text" className="form-control" value={anamnese.imc} readOnly style={{ background: 'var(--gray)' }} /></div>
              <div className="form-group"><label>% Gordura</label>
                <input type="number" step="0.1" className="form-control" value={anamnese.gordura_corporal} onChange={e => handleAnamnese('gordura_corporal', e.target.value)} /></div>
            </div>
          </div>

          {/* Histórico de Saúde */}
          <div className="card mb-3">
            <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>❤️ Histórico de Saúde</h2>
            <SimNaoTexto field="problema_saude" textField="problema_saude_qual" label="1. Possui algum problema de saúde?" textLabel="Se sim, quais?" data={anamnese} onChange={handleAnamnese} />
            <SimNao field="liberacao_medica" label="Possui liberação médica para atividades físicas?" data={anamnese} onChange={handleAnamnese} />
            <SimNaoTexto field="usa_medicamentos" textField="medicamentos_qual" label="2. Faz uso de medicamentos?" textLabel="Se sim, quais?" data={anamnese} onChange={handleAnamnese} />
            <SimNaoTexto field="possui_alergias" textField="alergias_qual" label="3. Possui alergias?" textLabel="Se sim, quais?" data={anamnese} onChange={handleAnamnese} />
            <SimNaoTexto field="problemas_cardiacos" textField="cardiacos_qual" label="4. Problemas cardíacos?" textLabel="Se sim, quais?" data={anamnese} onChange={handleAnamnese} />
            <SimNaoTexto field="problemas_respiratorios" textField="respiratorios_qual" label="5. Problemas respiratórios?" textLabel="Se sim, quais?" data={anamnese} onChange={handleAnamnese} />
          </div>

          {/* Histórico Familiar */}
          <div className="card mb-3">
            <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>👨‍👩‍👧 Histórico Familiar</h2>
            <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>Familiar direto possui ou já possuiu:</p>
            <FamiliarRow field="fam_hipertensao" textField="fam_hipertensao_quem" label="Hipertensão" data={anamnese} onChange={handleAnamnese} />
            <FamiliarRow field="fam_diabetes" textField="fam_diabetes_quem" label="Diabetes" data={anamnese} onChange={handleAnamnese} />
            <FamiliarRow field="fam_doencas_cardiacas" textField="fam_cardiacas_quem" label="Doenças Cardíacas" data={anamnese} onChange={handleAnamnese} />
            <FamiliarRow field="fam_cancer" textField="fam_cancer_quem" label="Câncer" data={anamnese} onChange={handleAnamnese} />
            <FamiliarRow field="fam_outras" textField="fam_outras_quem" label="Outras Doenças" data={anamnese} onChange={handleAnamnese} />
          </div>

          {/* Atividade Física */}
          <div className="card mb-3">
            <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🏋️ Histórico de Atividade Física</h2>
            <SimNaoTexto field="pratica_atividade" textField="atividade_qual" label="1. Pratica atividades físicas?" textLabel="Se sim, quais?" data={anamnese} onChange={handleAnamnese} />
            <SimNaoTexto field="frequentou_academia" textField="academia_tempo" label="2. Já frequentou academias?" textLabel="Por quanto tempo?" data={anamnese} onChange={handleAnamnese} />
            <div className="form-group">
              <label style={{ fontWeight: 600 }}>3. Nível de atividade atual:</label>
              <div className="radio-group">
                {['Sedentária', 'Ativa', 'Muito Ativa'].map(n => (
                  <label key={n} className={`radio-item ${anamnese.nivel_atividade === n ? 'active' : ''}`}>
                    <input type="radio" checked={anamnese.nivel_atividade === n} onChange={() => handleAnamnese('nivel_atividade', n)} /> {n}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Objetivos */}
          <div className="card mb-3">
            <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🎯 Objetivos</h2>
            <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Principal objetivo ao ingressar:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
              {[
                { field: 'obj_emagrecimento', label: 'Emagrecimento' },
                { field: 'obj_flexibilidade', label: 'Melhora da Flexibilidade' },
                { field: 'obj_condicionamento', label: 'Condicionamento Físico' },
                { field: 'obj_massa_muscular', label: 'Ganho de Massa Muscular' },
                { field: 'obj_reducao_medidas', label: 'Redução de Medidas' },
              ].map(item => (
                <label key={item.field} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                  padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)',
                  background: anamnese[item.field] ? 'rgba(226,0,122,0.1)' : 'transparent'
                }}>
                  <input type="checkbox" checked={!!anamnese[item.field]} onChange={e => handleAnamnese(item.field, e.target.checked)} />
                  {item.label}
                </label>
              ))}
            </div>
            <div className="form-group"><label>Outros:</label>
              <input type="text" className="form-control" value={anamnese.obj_outros} onChange={e => handleAnamnese('obj_outros', e.target.value)} /></div>
            <div className="form-group"><label style={{ fontWeight: 600 }}>Tempo para alcançar:</label>
              <input type="text" className="form-control" value={anamnese.tempo_objetivo} onChange={e => handleAnamnese('tempo_objetivo', e.target.value)} /></div>
          </div>

          {/* Hábitos de Vida */}
          <div className="card mb-3">
            <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🍎 Hábitos de Vida</h2>
            <SimNao field="fuma" label="1. Fuma?" data={anamnese} onChange={handleAnamnese} />
            <SimNaoTexto field="consome_alcool" textField="alcool_frequencia" label="2. Bebidas alcoólicas?" textLabel="Com que frequência?" data={anamnese} onChange={handleAnamnese} />
            <div className="form-group">
              <label style={{ fontWeight: 600 }}>3. Alimentação:</label>
              <div className="radio-group">
                {['Saudável', 'Moderada', 'Pouco Saudável'].map(n => (
                  <label key={n} className={`radio-item ${anamnese.alimentacao === n ? 'active' : ''}`}>
                    <input type="radio" checked={anamnese.alimentacao === n} onChange={() => handleAnamnese('alimentacao', n)} /> {n}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group"><label style={{ fontWeight: 600 }}>4. Horas de sono:</label>
              <input type="text" className="form-control" value={anamnese.horas_sono} onChange={e => handleAnamnese('horas_sono', e.target.value)} placeholder="Ex: 7 horas" /></div>
          </div>

          {/* Lesões e Cirurgias */}
          <div className="card mb-3">
            <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🏥 Lesões e Cirurgias</h2>
            <SimNaoTexto field="sofreu_lesoes" textField="lesoes_qual" label="1. Já sofreu lesões?" textLabel="Se sim, quais?" data={anamnese} onChange={handleAnamnese} />
            <SimNaoTexto field="passou_cirurgias" textField="cirurgias_qual" label="2. Já passou por cirurgias?" textLabel="Se sim, quais?" data={anamnese} onChange={handleAnamnese} />
          </div>

          {/* Histórico Reprodutivo */}
          <div className="card mb-3">
            <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🌸 Histórico Reprodutivo</h2>
            <div className="form-group"><label style={{ fontWeight: 600 }}>Último ciclo menstrual:</label>
              <input type="date" className="form-control" value={anamnese.ultimo_ciclo} onChange={e => handleAnamnese('ultimo_ciclo', e.target.value)} /></div>
            <SimNaoTexto field="menopausa" textField="menopausa_desde" label="Está na menopausa?" textLabel="Desde quando?" data={anamnese} onChange={handleAnamnese} />
          </div>

          {/* Informações Adicionais */}
          <div className="card mb-3">
            <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>📝 Informações Adicionais</h2>
            <textarea className="form-control" rows="3" value={anamnese.info_adicionais}
              onChange={e => handleAnamnese('info_adicionais', e.target.value)} placeholder="Informações adicionais..." style={{ resize: 'vertical' }} />
            <div className="mt-3" style={{ padding: '1rem', background: 'var(--gray)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <p>Declaro que as informações fornecidas são verdadeiras e completas, e estou ciente da necessidade de liberação médica para a prática de atividades físicas em caso de problemas de saúde.</p>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2 mt-3">
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Salvando...' : (id ? 'Atualizar Ficha' : 'Cadastrar Aluna')}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)} style={{ flex: 1 }}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

export default FichaCadastral;