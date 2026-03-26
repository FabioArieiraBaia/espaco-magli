import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BioimpedanciaReport from '../components/BioimpedanciaReport';

const initialAnamnese = {
    idade: '', estado_civil: '', profissao: '',
    altura: '', peso: '', imc: '', gordura_corporal: '',
    problema_saude: 'nao', problema_saude_qual: '',
    liberacao_medica: 'nao',
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
    fuma: 'nao',
    consome_alcool: 'nao', alcool_frequencia: '',
    alimentacao: '', horas_sono: '',
    sofreu_lesoes: 'nao', lesoes_qual: '',
    passou_cirurgias: 'nao', cirurgias_qual: '',
    ultimo_ciclo: '', menopausa: 'nao', menopausa_desde: '',
    info_adicionais: '',
    bioimpedancia_json: []
};

const sn = (val) => val === 'sim' ? '✓ Sim' : '✗ Não';
const formatDate = (d) => {
    if (!d) return '-';
    try { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; } catch (e) { return d; }
};

// ==================== HELPER COMPONENTS ====================
const SimNao = ({ field, label, form, h }) => (
    <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>{label}</label>
        <div className="radio-group">
            <label className={`radio-item ${form[field] === 'sim' ? 'active' : ''}`}>
                <input type="radio" checked={form[field] === 'sim'} onChange={() => h(field, 'sim')} /> SIM
            </label>
            <label className={`radio-item ${form[field] === 'nao' ? 'active' : ''}`}>
                <input type="radio" checked={form[field] === 'nao'} onChange={() => h(field, 'nao')} /> NÃO
            </label>
        </div>
    </div>
);

const SimNaoTexto = ({ field, textField, label, textLabel, form, h }) => (
    <div style={{ marginBottom: '1rem' }}>
        <SimNao field={field} label={label} form={form} h={h} />
        {form[field] === 'sim' && (
            <input type="text" className="form-control" placeholder={textLabel || 'Especifique...'}
                value={form[textField] || ''} onChange={e => h(textField, e.target.value)} style={{ marginTop: '0.25rem' }} />
        )}
    </div>
);

const FamiliarRow = ({ field, textField, label, form, h }) => (
    <div className="form-row" style={{ alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ minWidth: '180px', fontWeight: 500 }}>{label}:</div>
        <div className="radio-group" style={{ marginRight: '0.5rem' }}>
            <label className={`radio-item ${form[field] === 'sim' ? 'active' : ''}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>
                <input type="radio" checked={form[field] === 'sim'} onChange={() => h(field, 'sim')} /> SIM
            </label>
            <label className={`radio-item ${form[field] === 'nao' ? 'active' : ''}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>
                <input type="radio" checked={form[field] === 'nao'} onChange={() => h(field, 'nao')} /> NÃO
            </label>
        </div>
        {form[field] === 'sim' && (
            <input type="text" className="form-control" placeholder="Quem?"
                value={form[textField] || ''} onChange={e => h(textField, e.target.value)}
                style={{ flex: 1, maxWidth: '200px' }} />
        )}
    </div>
);

const AnamneseForm = ({ form, onChange, onSave, onCancel, title, saving, bioLink, setBioLink, onImportBio, isBioOpen, setIsBioOpen }) => {
    const h = (field, value) => onChange(field, value);

    return (
        <div className="page fade-in">
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.8rem', color: '#fff' }}>🩺 {title}</h1>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={onSave} disabled={saving} style={{ padding: '0.6rem 1.2rem' }}>
                        {saving ? 'Salvando...' : '💾 Salvar'}
                    </button>
                    <button className="btn btn-outline" onClick={onCancel} style={{ padding: '0.6rem 1.2rem' }}>← Voltar</button>
                </div>
            </div>

            {/* =============================== BIOIMPEDÂNCIA (HISTÓRICO) =============================== */}
            <div className="card mb-3" style={{ border: '1px solid var(--primary)', position: 'relative', background: 'rgba(226, 0, 122, 0.03)' }}>
                <div style={{ padding: '5px 0' }}>
                  <h2 style={{ color: 'var(--primary)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>📊</span> Bioimpedância Técnica (Histórico)
                  </h2>
                </div>
                
                <div style={{ padding: '15px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                  <div className="form-group mb-0">
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Sincronizar Novo Link da InBody/Avanutri</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Cole o novo link do relatório aqui..." 
                        value={bioLink || ''}
                        onChange={e => setBioLink(e.target.value)}
                        style={{ background: 'rgba(0,0,0,0.2)' }}
                      />
                      <button type="button" className="btn btn-primary" onClick={onImportBio} style={{ whiteSpace: 'nowrap' }}>Sincronizar</button>
                    </div>
                  </div>
                </div>

                <div className="bio-history-list">
                  {!form.bioimpedancia_json || form.bioimpedancia_json.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📥</div>
                      Nenhum relatório sincronizado. Cole o link acima para começar o histórico.
                    </div>
                  ) : (
                    form.bioimpedancia_json.map((item, index) => (
                      <div key={item.id || index} className="card mb-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', padding: '0px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', 
                            padding: '12px 15px', background: isBioOpen(item.id || index) ? 'rgba(226, 0, 122, 0.1)' : 'transparent',
                            borderBottom: isBioOpen(item.id || index) ? '1px solid rgba(255,255,255,0.1)' : 'none'
                          }}
                          onClick={() => setIsBioOpen(item.id || index)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                              📅 {new Date(item.date).toLocaleDateString('pt-BR')} {new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {index === 0 && <span style={{ fontSize: '0.7rem', background: 'var(--primary)', color: '#fff', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>MAIS RECENTE</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline" 
                              style={{ padding: '2px 8px', fontSize: '0.75rem', borderColor: '#f44336', color: '#f44336' }}
                              onClick={(e) => { e.stopPropagation(); if(window.confirm('Excluir este registro do histórico?')) onChange('bioimpedancia_json', form.bioimpedancia_json.filter((_, i) => i !== index)); }}
                            >
                              🗑️
                            </button>
                            <span style={{ fontSize: '1rem', transition: 'transform 0.3s', transform: isBioOpen(item.id || index) ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                          </div>
                        </div>
                        
                        {isBioOpen(item.id || index) && (
                          <div className="fade-in" style={{ padding: '20px' }}>
                            <BioimpedanciaReport data={item.data} />
                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                              <button 
                                type="button" 
                                className="btn btn-outline btn-sm"
                                onClick={(e) => { e.stopPropagation(); window.print(); }}
                              >
                                🖨️ Imprimir Este Relatório
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
            </div>

            {/* Dados Físicos */}
            <div className="card mb-3">
                <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>📏 Dados Físicos</h2>
                <div className="form-row">
                    <div className="form-group"><label>Altura (cm)</label>
                        <input type="number" step="0.01" className="form-control" value={form.altura || ''} onChange={e => h('altura', e.target.value)} /></div>
                    <div className="form-group"><label>Peso (kg)</label>
                        <input type="number" step="0.1" className="form-control" value={form.peso || ''} onChange={e => h('peso', e.target.value)} /></div>
                    <div className="form-group"><label>IMC</label>
                        <input type="text" className="form-control" value={form.imc || ''} readOnly style={{ background: 'var(--gray)' }} /></div>
                    <div className="form-group"><label>% Gordura</label>
                        <input type="number" step="0.1" className="form-control" value={form.gordura_corporal || ''} onChange={e => h('gordura_corporal', e.target.value)} /></div>
                </div>
            </div>

            {/* Histórico de Saúde */}
            <div className="card mb-3">
                <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>❤️ Histórico de Saúde</h2>
                <SimNaoTexto field="problema_saude" textField="problema_saude_qual" label="1. Possui algum problema de saúde?" textLabel="Se sim, quais?" form={form} h={h} />
                <SimNao field="liberacao_medica" label="Possui liberação médica para atividades físicas?" form={form} h={h} />
                <SimNaoTexto field="usa_medicamentos" textField="medicamentos_qual" label="2. Faz uso de medicamentos?" textLabel="Se sim, quais?" form={form} h={h} />
                <SimNaoTexto field="possui_alergias" textField="alergias_qual" label="3. Possui alergias?" textLabel="Se sim, quais?" form={form} h={h} />
                <SimNaoTexto field="problemas_cardiacos" textField="cardiacos_qual" label="4. Problemas cardíacos?" textLabel="Se sim, quais?" form={form} h={h} />
                <SimNaoTexto field="problemas_respiratorios" textField="respiratorios_qual" label="5. Problemas respiratórios?" textLabel="Se sim, quais?" form={form} h={h} />
            </div>

            {/* Histórico Familiar */}
            <div className="card mb-3">
                <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>👨‍👩‍👧 Histórico Familiar</h2>
                <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>Familiar direto possui ou já possuiu:</p>
                <FamiliarRow field="fam_hipertensao" textField="fam_hipertensao_quem" label="Hipertensão" form={form} h={h} />
                <FamiliarRow field="fam_diabetes" textField="fam_diabetes_quem" label="Diabetes" form={form} h={h} />
                <FamiliarRow field="fam_doencas_cardiacas" textField="fam_cardiacas_quem" label="Doenças Cardíacas" form={form} h={h} />
                <FamiliarRow field="fam_cancer" textField="fam_cancer_quem" label="Câncer" form={form} h={h} />
                <FamiliarRow field="fam_outras" textField="fam_outras_quem" label="Outras Doenças" form={form} h={h} />
            </div>

            {/* Atividade Física */}
            <div className="card mb-3">
                <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🏋️ Atividade Física</h2>
                <SimNaoTexto field="pratica_atividade" textField="atividade_qual" label="1. Pratica atividades físicas?" textLabel="Se sim, quais?" form={form} h={h} />
                <SimNaoTexto field="frequentou_academia" textField="academia_tempo" label="2. Já frequentou academias?" textLabel="Se sim, por quanto tempo?" form={form} h={h} />
                <div className="form-group">
                    <label style={{ fontWeight: 600 }}>3. Nível de atividade física atual?</label>
                    <div className="radio-group">
                        {['Sedentária', 'Ativa', 'Muito Ativa'].map(n => (
                            <label key={n} className={`radio-item ${form.nivel_atividade === n ? 'active' : ''}`}>
                                <input type="radio" checked={form.nivel_atividade === n} onChange={() => h('nivel_atividade', n)} /> {n}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Objetivos */}
            <div className="card mb-3">
                <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🎯 Objetivos</h2>
                <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Principal objetivo:</label>
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
                            background: form[item.field] ? 'rgba(226,0,122,0.1)' : 'transparent'
                        }}>
                            <input type="checkbox" checked={!!form[item.field]} onChange={e => h(item.field, e.target.checked)} />
                            {item.label}
                        </label>
                    ))}
                </div>
                <div className="form-group"><label>Outros:</label>
                    <input type="text" className="form-control" value={form.obj_outros || ''} onChange={e => h('obj_outros', e.target.value)} /></div>
                <div className="form-group"><label style={{ fontWeight: 600 }}>Tempo para alcançar:</label>
                    <input type="text" className="form-control" value={form.tempo_objetivo || ''} onChange={e => h('tempo_objetivo', e.target.value)} /></div>
            </div>

            {/* Hábitos de Vida */}
            <div className="card mb-3">
                <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🍎 Hábitos de Vida</h2>
                <SimNao field="fuma" label="1. Fuma?" form={form} h={h} />
                <SimNaoTexto field="consome_alcool" textField="alcool_frequencia" label="2. Bebidas alcoólicas?" textLabel="Com que frequência?" form={form} h={h} />
                <div className="form-group">
                    <label style={{ fontWeight: 600 }}>3. Alimentação:</label>
                    <div className="radio-group">
                        {['Saudável', 'Moderada', 'Pouco Saudável'].map(n => (
                            <label key={n} className={`radio-item ${form.alimentacao === n ? 'active' : ''}`}>
                                <input type="radio" checked={form.alimentacao === n} onChange={() => h('alimentacao', n)} /> {n}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="form-group"><label style={{ fontWeight: 600 }}>4. Horas de sono:</label>
                    <input type="text" className="form-control" value={form.horas_sono || ''} onChange={e => h('horas_sono', e.target.value)} placeholder="Ex: 7 horas" /></div>
            </div>

            {/* Lesões */}
            <div className="card mb-3">
                <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🏥 Lesões e Cirurgias</h2>
                <SimNaoTexto field="sofreu_lesoes" textField="lesoes_qual" label="1. Já sofreu lesões?" textLabel="Se sim, quais?" form={form} h={h} />
                <SimNaoTexto field="passou_cirurgias" textField="cirurgias_qual" label="2. Já passou por cirurgias?" textLabel="Se sim, quais?" form={form} h={h} />
            </div>

            {/* Reprodutivo */}
            <div className="card mb-3">
                <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🌸 Histórico Reprodutivo</h2>
                <div className="form-group"><label style={{ fontWeight: 600 }}>Último ciclo menstrual:</label>
                    <input type="date" className="form-control" value={form.ultimo_ciclo || ''} onChange={e => h('ultimo_ciclo', e.target.value)} /></div>
                <SimNaoTexto field="menopausa" textField="menopausa_desde" label="Está na menopausa?" textLabel="Desde quando?" form={form} h={h} />
            </div>

            {/* Info Adicionais */}
            <div className="card mb-3">
                <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>📝 Informações Adicionais</h2>
                <textarea className="form-control" rows="3" value={form.info_adicionais || ''}
                    onChange={e => h('info_adicionais', e.target.value)} placeholder="Informações adicionais..." style={{ resize: 'vertical' }} />
            </div>

            <div className="flex gap-2">
                <button className="btn btn-primary" onClick={onSave} disabled={saving} style={{ flex: 1 }}>
                    {saving ? 'Salvando...' : '💾 Salvar Anamnese'}
                </button>
                <button className="btn btn-outline" onClick={onCancel} style={{ flex: 1 }}>Cancelar</button>
            </div>
        </div>
    );
};

const Field = ({ label, value }) => (
    <div style={{ flex: 1, minWidth: '150px' }}>
        <label style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>{label}</label>
        <span style={{ fontSize: '0.95rem', display: 'block', padding: '0.25rem 0', borderBottom: '1px solid var(--glass-border)', minHeight: '1.5rem' }}>{value || '-'}</span>
    </div>
);

const SNLine = ({ label, field, textField, d }) => (
    <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
        <strong>{label}:</strong>{' '}
        <span style={{ color: d[field] === 'sim' ? 'var(--primary)' : 'var(--text-muted)' }}>{sn(d[field])}</span>
        {d[field] === 'sim' && d[textField] && <span> — {d[textField]}</span>}
    </div>
);

function Anamnese() {
    const { api } = useAuth();
    const [alunas, setAlunas] = useState([]);
    const [anamneses, setAnamneses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [viewItem, setViewItem] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [createMode, setCreateMode] = useState(null);
    const [expandedBios, setExpandedBios] = useState(new Set());
    const [bioLink, setBioLink] = useState('');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const printRef = useRef();

    useEffect(() => { if (api) loadAll(); }, [api]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [alunasRes, anamneseRes] = await Promise.all([
                api.get('/alunas'),
                api.get('/anamnese').catch(() => ({ data: [] })),
            ]);
            setAlunas(Array.isArray(alunasRes.data) ? alunasRes.data : []);
            setAnamneses(Array.isArray(anamneseRes.data) ? anamneseRes.data : []);
        } catch (e) {
            console.error('Erro na carga:', e.response?.data || e);
            alert('Erro ao carregar dados: ' + (e.response?.data?.message || e.message));
        }
        finally { setLoading(false); }
    };

    const getAnamnese = (alunaId) => anamneses.find(a => String(a.aluna_id) === String(alunaId));

    const viewAnamnese = async (alunaId) => {
        try {
            const res = await api.get(`/anamnese/${alunaId}`);
            if (res.data && res.data.id) {
                const d = { ...res.data };
                try { if (d.historico_familiar) Object.assign(d, JSON.parse(d.historico_familiar)); } catch (e) { }
                try { if (d.objetivos) Object.assign(d, JSON.parse(d.objetivos)); } catch (e) { }
                try { if (d.habitos) Object.assign(d, JSON.parse(d.habitos)); } catch (e) { }
                
                if (d.bioimpedancia_json && typeof d.bioimpedancia_json === 'string') {
                    try { 
                        let parsed = JSON.parse(d.bioimpedancia_json); 
                        // MIGRATION: Convert old single object to array
                        if (parsed && !Array.isArray(parsed)) {
                            parsed = [{ id: 'legacy-' + Date.now(), date: d.created_at || new Date().toISOString(), data: parsed }];
                        }
                        d.bioimpedancia_json = parsed || [];
                    } catch(e) { d.bioimpedancia_json = []; }
                } else if (!d.bioimpedancia_json) {
                    d.bioimpedancia_json = [];
                }
                
                setViewItem(d);
                setEditForm(d);
                setEditMode(false);
                setCreateMode(null);
                setBioLink('');
                // Expand the most recent by default if exists
                if (d.bioimpedancia_json.length > 0) {
                    setExpandedBios(new Set([d.bioimpedancia_json[0].id || 0]));
                } else {
                    setExpandedBios(new Set());
                }
            }
        } catch (e) {
            console.error('Erro visualização:', e.response?.data || e);
            alert('Falha ao abrir ficha: ' + (e.response?.data?.message || e.message));
        }
    };

    const deleteAnamnese = async (id, nome) => {
        if (!window.confirm(`Excluir a ficha de anamnese de "${nome}"?`)) return;
        try {
            await api.delete(`/anamnese/${id}`);
            setSuccess('Ficha excluída!');
            setTimeout(() => setSuccess(''), 3000);
            loadAll();
            if (viewItem?.id === id) setViewItem(null);
        } catch (e) {
            console.error('Erro exclusão:', e.response?.data || e);
            alert('Falha ao excluir: ' + (e.response?.data?.message || e.message));
        }
    };

    const buildPayload = (form, aluna) => ({
        aluna_id: aluna.id, nome: aluna.nome, nascimento: aluna.nascimento,
        telefone: aluna.telefone, email: aluna.email,
        ...Object.fromEntries(
            ['idade', 'estado_civil', 'profissao', 'altura', 'peso', 'imc', 'gordura_corporal',
                'problema_saude', 'problema_saude_qual', 'liberacao_medica',
                'usa_medicamentos', 'medicamentos_qual', 'possui_alergias', 'alergias_qual',
                'problemas_cardiacos', 'cardiacos_qual', 'problemas_respiratorios', 'respiratorios_qual',
                'pratica_atividade', 'atividade_qual', 'frequentou_academia', 'academia_tempo',
                'nivel_atividade', 'tempo_objetivo',
                'sofreu_lesoes', 'lesoes_qual', 'passou_cirurgias', 'cirurgias_qual',
                'ultimo_ciclo', 'menopausa', 'menopausa_desde', 'info_adicionais', 'bioimpedancia_json']
                .map(f => [f, f === 'bioimpedancia_json' ? JSON.stringify(form[f]) : form[f]])
        ),
        historico_familiar: JSON.stringify({
            fam_hipertensao: form.fam_hipertensao, fam_hipertensao_quem: form.fam_hipertensao_quem,
            fam_diabetes: form.fam_diabetes, fam_diabetes_quem: form.fam_diabetes_quem,
            fam_doencas_cardiacas: form.fam_doencas_cardiacas, fam_cardiacas_quem: form.fam_cardiacas_quem,
            fam_cancer: form.fam_cancer, fam_cancer_quem: form.fam_cancer_quem,
            fam_outras: form.fam_outras, fam_outras_quem: form.fam_outras_quem,
        }),
        objetivos: JSON.stringify({
            obj_emagrecimento: form.obj_emagrecimento, obj_flexibilidade: form.obj_flexibilidade,
            obj_condicionamento: form.obj_condicionamento, obj_massa_muscular: form.obj_massa_muscular,
            obj_reducao_medidas: form.obj_reducao_medidas, obj_outros: form.obj_outros,
        }),
        habitos: JSON.stringify({
            fuma: form.fuma, consome_alcool: form.consome_alcool,
            alcool_frequencia: form.alcool_frequencia, alimentacao: form.alimentacao,
            horas_sono: form.horas_sono,
        }),
    });

    const handleImportBio = (setter) => async () => {
        if (!bioLink) {
            alert('Por favor, cole o link da bioimpedância primeiro.');
            return;
        }

        const match = bioLink.match(/[#\/]([a-f0-9-]{36})/i);
        if (!match) {
            alert('Link inválido. Verifique se o link contém o código do relatório.');
            return;
        }

        const uuid = match[1];
        setLoading(true);
        try {
            const res = await api.get(`/importar-bio/${uuid}`);
            const newRecord = {
                id: 'bio-' + Date.now(),
                date: new Date().toISOString(),
                data: res.data
            };
            setter(prev => ({ 
                ...prev, 
                bioimpedancia_json: [newRecord, ...(Array.isArray(prev.bioimpedancia_json) ? prev.bioimpedancia_json : [])] 
            }));
            toggleBio(newRecord.id);
            setBioLink('');
            alert('Dados da bioimpedância sincronizados com sucesso!');
        } catch (error) {
            console.error('Erro detalhado:', error.response?.data || error);
            const msg = error.response?.data?.error || 'Verifique o link e tente novamente.';
            alert(`Erro ao importar bioimpedância: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const isBioOpen = (idOrIndex) => expandedBios.has(idOrIndex);
    const toggleBio = (idOrIndex) => {
        setExpandedBios(prev => {
            const next = new Set(prev);
            if (next.has(idOrIndex)) next.delete(idOrIndex);
            else next.add(idOrIndex);
            return next;
        });
    };

    const saveEdit = async () => {
        setSaving(true);
        try {
            await api.put(`/anamnese/${editForm.id}`, buildPayload(editForm, editForm));
            setSuccess('Ficha atualizada!');
            setTimeout(() => setSuccess(''), 3000);
            setEditMode(false);
            loadAll();
            viewAnamnese(editForm.aluna_id);
        } catch (e) {
            console.error('Erro atualização:', e.response?.data || e);
            alert('Falha ao atualizar anamnese: ' + (e.response?.data?.message || e.message));
        }
        finally { setSaving(false); }
    };

    const createAnamnese = async () => {
        setSaving(true);
        try {
            await api.post('/anamnese', buildPayload(newForm, createMode));
            setSuccess('Ficha criada com sucesso!');
            setTimeout(() => setSuccess(''), 3000);
            setCreateMode(null);
            setNewForm({ ...initialAnamnese });
            loadAll();
        } catch (e) {
            console.error('Erro criação:', e.response?.data || e);
            alert('Falha ao criar anamnese: ' + (e.response?.data?.message || e.message));
        }
        finally { setSaving(false); }
    };

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;
        const win = window.open('', '_blank');
        win.document.write(`
      <html><head><title>Ficha de Anamnese - ${viewItem?.nome || ''}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}
        body{padding:20px;color:#333}
        h1{text-align:center;color:#E2007A;margin-bottom:5px;font-size:22px}
        h2{color:#E2007A;font-size:16px;margin:15px 0 8px;border-bottom:2px solid #E2007A;padding-bottom:4px}
        .subtitle{text-align:center;font-size:12px;color:#666;margin-bottom:15px}
        .row{display:flex;gap:10px;margin-bottom:5px;flex-wrap:wrap}
        .field{flex:1;min-width:150px}
        .field label{font-weight:bold;font-size:11px;color:#666;display:block}
        .field span{font-size:13px;display:block;padding:2px 0;border-bottom:1px solid #ddd;min-height:20px}
        .sim-nao{margin-bottom:5px;font-size:13px}
        .sim-nao strong{color:#E2007A}
        .badge{display:inline-block;background:#E2007A;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;margin:2px}
        .footer{margin-top:30px;text-align:center;font-size:11px;color:#666}
        .sig{display:flex;justify-content:space-around;margin-top:40px}
        .sig div{text-align:center;border-top:1px solid #333;padding-top:5px;width:200px;font-size:12px}
        @media print{body{padding:10px}}
      </style></head><body>
        <h1>Ficha de Anamnese</h1>
        <p class="subtitle">Espaço Magli - Centro de Treinamento Exclusivo para Mulheres</p>
        ${content.innerHTML}
        <div class="footer">
          <p>Declaro que as informações fornecidas são verdadeiras e completas.</p>
          <div class="sig"><div>Assinatura</div><div>Data: ____/____/________</div></div>
        </div>
      </body></html>
    `);
        win.document.close();
        win.print();
    };

    const handleAnamnese = (setter) => (field, value) => {
        setter(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'peso' || field === 'altura') {
                const peso = field === 'peso' ? parseFloat(value) : parseFloat(prev.peso);
                const altura = field === 'altura' ? parseFloat(value) : parseFloat(prev.altura);
                if (peso && altura) {
                    const altM = altura > 3 ? altura / 100 : altura;
                    updated.imc = (peso / (altM * altM)).toFixed(1);
                }
            }
            return updated;
        });
    };

    // ==================== CREATE MODE ====================
    if (createMode) {
        return <AnamneseForm form={newForm} onChange={handleAnamnese(setNewForm)}
            onSave={createAnamnese} onCancel={() => { setCreateMode(null); setNewForm({ ...initialAnamnese }); }}
            onImportBio={handleImportBio(setNewForm)} bioLink={bioLink} setBioLink={setBioLink}
            isBioOpen={isBioOpen} setIsBioOpen={toggleBio}
            title={`Nova Anamnese: ${createMode.nome}`} saving={saving} />;
    }

    // ==================== EDIT MODE ====================
    if (viewItem && editMode) {
        return <AnamneseForm form={editForm} onChange={handleAnamnese(setEditForm)}
            onSave={saveEdit} onCancel={() => { setEditMode(false); }}
            onImportBio={handleImportBio(setEditForm)} bioLink={bioLink} setBioLink={setBioLink}
            isBioOpen={isBioOpen} setIsBioOpen={toggleBio}
            title={`Editar: ${editForm.nome}`} saving={saving} />;
    }

    // ==================== VIEW DETAIL ====================
    if (viewItem) {
        const d = viewItem;
        return (
            <div className="page fade-in">
                <div className="page-header">
                    <h1>🩺 Anamnese: {d.nome}</h1>
                    <div className="flex gap-1">
                        <button className="btn btn-sm btn-primary" onClick={handlePrint}>🖨️ Imprimir</button>
                        <button className="btn btn-sm btn-outline" onClick={() => setEditMode(true)}>✏️ Editar</button>
                        <button className="btn btn-sm btn-outline" onClick={() => setViewItem(null)}>← Voltar</button>
                    </div>
                </div>
                {success && <div style={{ background: 'rgba(76,175,80,0.15)', color: '#4CAF50', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>✅ {success}</div>}

                <div ref={printRef}>
                    <div className="card mb-3">
                        <h2 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>📋 Dados Pessoais</h2>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                            <Field label="Nome" value={d.nome} /><Field label="Nascimento" value={formatDate(d.nascimento)} /><Field label="Idade" value={d.idade} />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <Field label="Estado Civil" value={d.estado_civil} /><Field label="Profissão" value={d.profissao} />
                            <Field label="Telefone" value={d.telefone} /><Field label="E-mail" value={d.email} />
                        </div>
                    </div>

                    <div className="card mb-3">
                        <h2 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>📏 Dados Físicos</h2>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <Field label="Altura" value={d.altura} /><Field label="Peso" value={d.peso} />
                            <Field label="IMC" value={d.imc} /><Field label="% Gordura" value={d.gordura_corporal} />
                        </div>
                    </div>

                    <div className="card mb-3">
                        <h2 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>❤️ Histórico de Saúde</h2>
                        <SNLine label="Problema de saúde" field="problema_saude" textField="problema_saude_qual" d={d} />
                        <SNLine label="Liberação médica" field="liberacao_medica" d={d} />
                        <SNLine label="Medicamentos" field="usa_medicamentos" textField="medicamentos_qual" d={d} />
                        <SNLine label="Alergias" field="possui_alergias" textField="alergias_qual" d={d} />
                        <SNLine label="Cardíacos" field="problemas_cardiacos" textField="cardiacos_qual" d={d} />
                        <SNLine label="Respiratórios" field="problemas_respiratorios" textField="respiratorios_qual" d={d} />
                    </div>

                    <div className="card mb-3">
                        <h2 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>👨‍👩‍👧 Histórico Familiar</h2>
                        <SNLine label="Hipertensão" field="fam_hipertensao" textField="fam_hipertensao_quem" d={d} />
                        <SNLine label="Diabetes" field="fam_diabetes" textField="fam_diabetes_quem" d={d} />
                        <SNLine label="Doenças Cardíacas" field="fam_doencas_cardiacas" textField="fam_cardiacas_quem" d={d} />
                        <SNLine label="Câncer" field="fam_cancer" textField="fam_cancer_quem" d={d} />
                        <SNLine label="Outras" field="fam_outras" textField="fam_outras_quem" d={d} />
                    </div>

                    <div className="card mb-3">
                        <h2 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>🏋️ Atividade Física</h2>
                        <SNLine label="Pratica atividades" field="pratica_atividade" textField="atividade_qual" d={d} />
                        <SNLine label="Frequentou academia" field="frequentou_academia" textField="academia_tempo" d={d} />
                        <div style={{ fontSize: '0.95rem' }}><strong>Nível:</strong> {d.nivel_atividade || '-'}</div>
                    </div>

                    <div className="card mb-3">
                        <h2 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>🎯 Objetivos</h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            {d.obj_emagrecimento && <span className="treino-badge">Emagrecimento</span>}
                            {d.obj_flexibilidade && <span className="treino-badge">Flexibilidade</span>}
                            {d.obj_condicionamento && <span className="treino-badge">Condicionamento</span>}
                            {d.obj_massa_muscular && <span className="treino-badge">Massa Muscular</span>}
                            {d.obj_reducao_medidas && <span className="treino-badge">Redução Medidas</span>}
                            {d.obj_outros && <span className="treino-badge">{d.obj_outros}</span>}
                        </div>
                        <div style={{ fontSize: '0.95rem' }}><strong>Tempo esperado:</strong> {d.tempo_objetivo || '-'}</div>
                    </div>

                    <div className="card mb-3">
                        <h2 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>🍎 Hábitos de Vida</h2>
                        <SNLine label="Fuma" field="fuma" d={d} />
                        <SNLine label="Bebidas alcoólicas" field="consome_alcool" textField="alcool_frequencia" d={d} />
                        <div style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}><strong>Alimentação:</strong> {d.alimentacao || '-'}</div>
                        <div style={{ fontSize: '0.95rem' }}><strong>Horas de sono:</strong> {d.horas_sono || '-'}</div>
                    </div>

                    <div className="card mb-3">
                        <h2 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>🏥 Lesões e Cirurgias</h2>
                        <SNLine label="Lesões" field="sofreu_lesoes" textField="lesoes_qual" d={d} />
                        <SNLine label="Cirurgias" field="passou_cirurgias" textField="cirurgias_qual" d={d} />
                    </div>

                    <div className="card mb-3">
                        <h2 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>🌸 Reprodutivo</h2>
                        <div style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}><strong>Último ciclo:</strong> {formatDate(d.ultimo_ciclo)}</div>
                        <SNLine label="Menopausa" field="menopausa" textField="menopausa_desde" d={d} />
                    </div>

                    {d.info_adicionais && (
                        <div className="card mb-3">
                            <h2 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>📝 Informações Adicionais</h2>
                            <p style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{d.info_adicionais}</p>
                        </div>
                    )}

                    {d.bioimpedancia_json && Array.isArray(d.bioimpedancia_json) && d.bioimpedancia_json.length > 0 && (
                        <div className="card mb-3" style={{ border: '1px solid var(--primary)', background: 'rgba(226, 0, 122, 0.05)' }}>
                            <h2 style={{ color: 'var(--primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.5rem' }}>📊</span> Histórico de Bioimpedâncias
                            </h2>
                            {d.bioimpedancia_json.map((item, idx) => (
                                <div key={item.id || idx} style={{ marginBottom: idx === d.bioimpedancia_json.length - 1 ? 0 : '30px', paddingBottom: idx === d.bioimpedancia_json.length - 1 ? 0 : '30px', borderBottom: idx === d.bioimpedancia_json.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                                    <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '15px' }}>
                                        📅 Avaliação em: {new Date(item.date).toLocaleDateString('pt-BR')} {new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </h3>
                                    <BioimpedanciaReport data={item.data} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ==================== LIST MODE (ALL STUDENTS) ====================
    if (loading) return <div className="page fade-in"><div className="card" style={{ textAlign: 'center', padding: '3rem' }}>Carregando...</div></div>;

    const filtered = alunas.filter(a => a.nome.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="page fade-in">
            <div className="page-header">
                <div>
                    <h1>🩺 Fichas de Anamnese</h1>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                        {anamneses.length} de {alunas.length} fichas preenchidas
                    </p>
                </div>
                <input type="text" className="form-control" placeholder="🔍 Buscar por nome..."
                    value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '280px' }} />
            </div>

            {success && <div style={{ background: 'rgba(76,175,80,0.15)', color: '#4CAF50', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>✅ {success}</div>}

            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Aluna</th>
                                <th>Status</th>
                                <th>IMC</th>
                                <th>Data</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((aluna, i) => {
                                const an = getAnamnese(aluna.id);
                                const preenchida = !!an;
                                return (
                                    <tr key={aluna.id}>
                                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                        <td><strong>{aluna.nome}</strong></td>
                                        <td>
                                            {preenchida ? (
                                                <span style={{ background: 'rgba(76,175,80,0.15)', color: '#4CAF50', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                                                    ✅ Preenchida
                                                </span>
                                            ) : (
                                                <span style={{ background: 'rgba(255,152,0,0.15)', color: '#FF9800', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                                                    ⚠️ Pendente
                                                </span>
                                            )}
                                        </td>
                                        <td>{an?.imc || '-'}</td>
                                        <td>{an?.created_at ? new Date(an.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                                        <td>
                                            <div className="flex gap-1">
                                                {preenchida ? (
                                                    <>
                                                        <button className="btn btn-sm btn-primary" onClick={() => viewAnamnese(aluna.id)} title="Visualizar">👁️</button>
                                                        <button className="btn btn-sm btn-outline" onClick={() => { viewAnamnese(aluna.id); setTimeout(() => setEditMode(true), 300); }} title="Editar">✏️</button>
                                                        <button className="btn btn-sm btn-outline" style={{ borderColor: '#f44336', color: '#f44336' }}
                                                            onClick={() => deleteAnamnese(an.id, aluna.nome)} title="Excluir">🗑️</button>
                                                    </>
                                                ) : (
                                                    <button className="btn btn-sm btn-primary" onClick={() => { setNewForm({ ...initialAnamnese }); setCreateMode(aluna); }}>
                                                        + Preencher
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr><td colSpan="6" className="text-center text-muted" style={{ padding: '2rem' }}>
                                    {search ? 'Nenhuma aluna encontrada.' : 'Nenhuma aluna cadastrada.'}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Anamnese;
