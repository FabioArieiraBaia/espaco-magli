import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function AlunasList() {
    const { api, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [alunas, setAlunas] = useState([]);
    const [professoras, setProfessoras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editModal, setEditModal] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!api) return;
        loadData();
    }, [api]);

    const loadData = async () => {
        try {
            const [alunasRes, profsRes] = await Promise.all([
                api.get('/alunas'),
                api.get('/professoras')
            ]);
            setAlunas(Array.isArray(alunasRes.data) ? alunasRes.data : []);
            setProfessoras(Array.isArray(profsRes.data) ? profsRes.data : []);
        } catch (err) {
            console.error('Erro:', err);
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (aluna) => {
        setEditForm({
            nome: aluna.nome || '',
            nascimento: aluna.nascimento || '',
            email: aluna.email || '',
            cpf: aluna.cpf || '',
            telefone: aluna.telefone || '',
            professora_id: aluna.professora_id || '',
            vezes_semana: aluna.vezes_semana || '',
            data_inicio: aluna.data_inicio || '',
            dias_semana: aluna.dias_semana || [],
            horarios: aluna.horarios || {},
            data_vencimento: aluna.data_vencimento || ''
        });
        if (isAdmin) {
            setEditForm(prev => ({ ...prev, desconto: aluna.desconto || '' }));
        }
        setEditModal(aluna.id);
    };

    const salvarEdicao = async () => {
        setSaving(true);
        try {
            await api.put(`/alunas/${editModal}`, editForm);
            setEditModal(null);
            setSuccess('Aluna atualizada com sucesso!');
            loadData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Erro ao salvar:', err);
        } finally {
            setSaving(false);
        }
    };

    const desativarAluna = async (id, nome) => {
        if (!window.confirm(`Deseja mover "${nome}" para ex-alunas?`)) return;
        try {
            await api.delete(`/alunas/${id}`);
            loadData();
        } catch (err) {
            console.error('Erro:', err);
        }
    };

    const formatDate = (d) => {
        if (!d) return '-';
        const [y, m, day] = d.split('-');
        return `${day}/${m}/${y}`;
    };

    const getBadgeVencimento = (d, pago) => {
        if (pago || !d) return null;
        
        const [origY, origM, day] = d.split('-').map(Number);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Criar data de vencimento baseada no dia cadastrado, mas no MÊS E ANO ATUAIS
        const vencimentoDate = new Date(today.getFullYear(), today.getMonth(), day);

        if (today > vencimentoDate) {
            return <span style={{ display: 'inline-block', padding: '2px 6px', background: '#f44336', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }}>Atrasado</span>;
        } else {
            const diffTime = vencimentoDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 3 && diffDays >= 0) {
                return <span style={{ display: 'inline-block', padding: '2px 6px', background: '#ff9800', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }}>Vence em {diffDays} d</span>;
            }
        }
        return null;
    };


    const filteredAlunas = alunas.filter(a =>
        a.nome.toLowerCase().includes(search.toLowerCase()) ||
        (a.professora_nome || '').toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="page fade-in">Carregando alunas...</div>;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <div>
                    <h1>👥 Alunas</h1>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                        {alunas.length} aluna{alunas.length !== 1 ? 's' : ''} ativa{alunas.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="🔍 Buscar aluna..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ maxWidth: '250px' }}
                    />
                    <button className="btn btn-primary" onClick={() => navigate('/admin/dashboard/ficha')}>
                        + Nova Aluna
                    </button>
                </div>
            </div>

            {success && (
                <div style={{
                    background: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50',
                    padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem'
                }}>
                    ✅ {success}
                </div>
            )}

            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Nome</th>
                                <th>Professora</th>
                                <th>Freq.</th>
                                <th>Início</th>
                                <th>Vencimento</th>
                                {isAdmin && <th>Desconto</th>}
                                <th>Telefone</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAlunas.map((a, i) => (
                                <tr key={a.id}>
                                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                    <td><strong>{a.nome}</strong></td>
                                    <td>
                                        <span style={{
                                            background: 'rgba(226, 0, 122, 0.1)', color: 'var(--primary)',
                                            padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem'
                                        }}>
                                            {a.professora_nome || '-'}
                                        </span>
                                    </td>
                                    <td>{a.vezes_semana}x/sem</td>
                                    <td>{formatDate(a.data_inicio)}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {(() => {
                                                const today = new Date();
                                                const day = a.data_vencimento ? a.data_vencimento.split('-')[2] : '--';
                                                return `${day}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
                                            })()}
                                            {getBadgeVencimento(a.data_vencimento, a.pago_mes_atual)}
                                        </div>
                                    </td>
                                    {isAdmin && <td>{a.desconto ? `R$ ${parseFloat(a.desconto).toFixed(2).replace('.', ',')}` : '-'}</td>}
                                    <td>{a.telefone || '-'}</td>
                                    <td>
                                        <div className="flex gap-1">
                                            <button className="btn btn-sm btn-outline" onClick={() => openEdit(a)} title="Editar ficha">
                                                ✏️
                                            </button>
                                            <button className="btn btn-sm btn-outline" onClick={() => navigate(`/admin/dashboard/ficha/${a.id}`)} title="Abrir ficha completa">
                                                📋
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => desativarAluna(a.id, a.nome)}
                                                title="Mover para ex-alunas"
                                                style={{ borderColor: '#f44336', color: '#f44336' }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredAlunas.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="text-center text-muted" style={{ padding: '2rem' }}>
                                        {search ? 'Nenhuma aluna encontrada.' : 'Nenhuma aluna cadastrada.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Edição Rápida */}
            {editModal && (
                <div className="modal-overlay" onClick={() => setEditModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3>Editar Aluna</h3>
                            <button className="modal-close" onClick={() => setEditModal(null)}>×</button>
                        </div>

                        <div className="form-row mb-3">
                            <div className="form-group">
                                <label className="required">Nome</label>
                                <input type="text" className="form-control" value={editForm.nome}
                                    onChange={e => setEditForm({ ...editForm, nome: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="required">Professora</label>
                                <select className="form-control" value={editForm.professora_id}
                                    onChange={e => setEditForm({ ...editForm, professora_id: e.target.value })}>
                                    <option value="">Selecione...</option>
                                    {professoras.map(p => (
                                        <option key={p.id} value={p.id}>{p.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row mb-3">
                            <div className="form-group">
                                <label>Telefone</label>
                                <input type="tel" className="form-control" value={editForm.telefone}
                                    onChange={e => setEditForm({ ...editForm, telefone: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>E-mail</label>
                                <input type="email" className="form-control" value={editForm.email}
                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-row mb-3">
                            <div className="form-group">
                                <label>CPF</label>
                                <input type="text" className="form-control" value={editForm.cpf}
                                    onChange={e => setEditForm({ ...editForm, cpf: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Nascimento</label>
                                <input type="date" className="form-control" value={editForm.nascimento}
                                    onChange={e => setEditForm({ ...editForm, nascimento: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-row mb-3">
                            <div className="form-group">
                                <label>Frequência</label>
                                <select className="form-control" value={editForm.vezes_semana}
                                    onChange={e => setEditForm({ ...editForm, vezes_semana: parseInt(e.target.value) })}>
                                    <option value="1">1x/semana</option>
                                    <option value="2">2x/semana</option>
                                    <option value="3">3x/semana</option>
                                    <option value="4">4x/semana</option>
                                    <option value="5">5x/semana</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Data Início</label>
                                <input type="date" className="form-control" value={editForm.data_inicio || ''}
                                    onChange={e => setEditForm({ ...editForm, data_inicio: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-row mb-3">
                            <div className="form-group">
                                <label>Vencimento Mensal</label>
                                <input type="date" className="form-control" value={editForm.data_vencimento || ''}
                                    onChange={e => setEditForm({ ...editForm, data_vencimento: e.target.value })} />
                            </div>
                            {isAdmin && (
                                <div className="form-group">
                                    <label>Desconto Extra (R$)</label>
                                    <input type="number" step="0.01" className="form-control" value={editForm.desconto || ''}
                                        onChange={e => setEditForm({ ...editForm, desconto: e.target.value })} />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 mt-3">
                            <button className="btn btn-primary" onClick={salvarEdicao} disabled={saving} style={{ flex: 1 }}>
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                            <button className="btn btn-outline" onClick={() => setEditModal(null)} style={{ flex: 1 }}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AlunasList;
