import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function Usuarios() {
    const { api, user: currentUser } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [alunas, setAlunas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'professora' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadUsuarios = async () => {
        try {
            const [resUsu, resAlu] = await Promise.all([
                api.get('/usuarios'),
                api.get('/alunas')
            ]);
            setUsuarios(resUsu.data);
            setAlunas(Array.isArray(resAlu.data) ? resAlu.data : []);
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (api) loadUsuarios();
    }, [api]);

    const openAdd = () => {
        setEditId(null);
        setForm({ nome: '', email: '', senha: '', perfil: 'professora' });
        setError('');
        setShowModal(true);
    };

    const openEdit = (u) => {
        setEditId(u.id);
        setForm({ nome: u.nome, email: u.email, senha: '', perfil: u.perfil });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.nome || !form.email) {
            setError('Nome e E-mail são obrigatórios.');
            return;
        }

        if (!editId && !form.senha) {
            setError('A senha é obrigatória para novos membros.');
            return;
        }

        try {
            if (editId) {
                await api.put(`/usuarios/${editId}`, form);
                setSuccess('Membro atualizado com sucesso!');
            } else {
                await api.post('/usuarios', form);
                setSuccess('Membro adicionado com sucesso!');
            }
            setShowModal(false);
            setForm({ nome: '', email: '', senha: '', perfil: 'professora' });
            loadUsuarios();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao salvar.');
        }
    };

    const deleteUser = async (u) => {
        const confirmMsg = u.ativo
            ? 'Deseja desativar este membro da equipe?'
            : 'Deseja EXCLUIR PERMANENTEMENTE este membro? Esta ação não pode ser desfeita.';

        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await api.delete(`/usuarios/${u.id}`);
            setSuccess(res.data.message || 'Operação realizada com sucesso!');
            loadUsuarios();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao processar exclusão.');
            setTimeout(() => setError(''), 5000);
        }
    };

    if (loading) return <div className="page fade-in">Carregando equipe...</div>;

    return (
        <div className="page fade-in">
            <div className="page-header flex jc-between ai-center">
                <h1>👩‍🏫 Equipe</h1>
                <button className="btn btn-primary" onClick={openAdd}>
                    + Adicionar Membro
                </button>
            </div>

            {success && (
                <div style={{
                    background: 'rgba(76, 175, 80, 0.15)',
                    color: '#4CAF50',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.9rem'
                }}>
                    ✅ {success}
                </div>
            )}

            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>E-mail</th>
                                <th>Perfil</th>
                                <th>Alunas</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map(u => (
                                <tr key={u.id}>
                                    <td><strong>{u.nome}</strong></td>
                                    <td>{u.email}</td>
                                    <td>
                                        <span style={{
                                            background: u.perfil === 'admin' ? 'rgba(255, 20, 147, 0.2)' : 'rgba(54, 162, 235, 0.2)',
                                            color: u.perfil === 'admin' ? 'var(--primary)' : '#36A2EB',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.85rem'
                                        }}>
                                            {u.perfil === 'professora' ? 'Professora' : 'Administrador'}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                            {alunas.filter(a => a.professora_id === u.id).length}
                                        </span>
                                    </td>

                                    <td>
                                        <span style={{ color: u.ativo ? '#4CAF50' : '#f44336' }}>
                                            {u.ativo ? '● Ativo' : '● Inativo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-1">
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => openEdit(u)}
                                                title="Editar"
                                            >
                                                ✏️
                                            </button>
                                            {u.id !== currentUser?.id ? (
                                                <button
                                                    className="btn btn-sm btn-outline"
                                                    onClick={() => deleteUser(u)}
                                                    title={u.ativo ? "Desativar" : "Excluir Permanentemente"}
                                                    style={{ borderColor: '#f44336', color: '#f44336' }}
                                                >
                                                    🗑️
                                                </button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {usuarios.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="text-center text-muted" style={{ padding: '2rem' }}>
                                        Nenhum membro da equipe encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Adicionar/Editar */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editId ? 'Editar Membro' : 'Adicionar Membro'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        {error && (
                            <div style={{
                                background: 'rgba(244, 67, 54, 0.1)',
                                color: '#f44336',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                fontSize: '0.9rem'
                            }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group mb-3">
                                <label className="required">Nome Completo</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Nome do membro"
                                    value={form.nome}
                                    onChange={e => setForm({ ...form, nome: e.target.value })}
                                />
                            </div>

                            <div className="form-group mb-3">
                                <label className="required">E-mail</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    placeholder="email@espacomagli.com.br"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                />
                            </div>

                            <div className="form-group mb-3">
                                <label className={editId ? '' : 'required'}>
                                    Senha {editId && <span className="text-muted" style={{ fontSize: '0.8rem' }}>(deixe em branco para manter)</span>}
                                </label>
                                <input
                                    type="password"
                                    className="form-control"
                                    placeholder={editId ? 'Nova senha (opcional)' : 'Defina a senha'}
                                    value={form.senha}
                                    onChange={e => setForm({ ...form, senha: e.target.value })}
                                />
                            </div>

                            <div className="form-group mb-4">
                                <label>Perfil</label>
                                <select
                                    className="form-control"
                                    value={form.perfil}
                                    onChange={e => setForm({ ...form, perfil: e.target.value })}
                                >
                                    <option value="professora">Professora</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>

                            <div className="flex gap-2">
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    {editId ? 'Salvar Alterações' : 'Adicionar'}
                                </button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Usuarios;
