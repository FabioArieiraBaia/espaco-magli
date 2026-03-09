import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function Configuracoes() {
    const { api } = useAuth();
    const [precos, setPrecos] = useState({ preco_1x: '', preco_2x: '', preco_3x: '', preco_4x: '', preco_5x: '', preco_promocional: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [restoreFile, setRestoreFile] = useState(null);
    const [restoring, setRestoring] = useState(false);

    useEffect(() => {
        if (!api) return;
        loadConfig();
    }, [api]);

    const loadConfig = async () => {
        try {
            const res = await api.get('/configuracoes');
            setPrecos({
                preco_1x: res.data.preco_1x || '',
                preco_2x: res.data.preco_2x || '',
                preco_3x: res.data.preco_3x || '',
                preco_4x: res.data.preco_4x || '',
                preco_5x: res.data.preco_5x || '',
                preco_promocional: res.data.preco_promocional || '',
            });
        } catch (err) {
            console.error('Erro ao carregar configurações:', err);
        } finally {
            setLoading(false);
        }
    };

    const salvarPrecos = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSuccess('');
        try {
            await api.put('/configuracoes', precos);
            setSuccess('Preços atualizados com sucesso!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Erro ao salvar:', err);
        } finally {
            setSaving(false);
        }
    };

    const fazerBackup = async () => {
        try {
            const res = await api.get('/backup', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `magli_backup_${new Date().toISOString().slice(0, 10)}.db`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Erro no backup:', err);
            alert('Erro ao fazer backup.');
        }
    };

    const restaurarBanco = async () => {
        if (!restoreFile) return;
        if (!window.confirm('⚠️ ATENÇÃO: Isso substituirá TODOS os dados atuais pelo arquivo selecionado. Tem certeza?')) return;

        setRestoring(true);
        try {
            const formData = new FormData();
            formData.append('database', restoreFile);

            await api.post('/restore', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert('✅ Banco restaurado com sucesso! A página será recarregada.');
            window.location.reload();
        } catch (err) {
            alert('Erro ao restaurar: ' + (err.response?.data?.error || 'Arquivo inválido'));
        } finally {
            setRestoring(false);
        }
    };

    const formatValor = (v) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    if (loading) return <div className="page fade-in">Carregando configurações...</div>;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <h1>⚙️ Configurações</h1>
            </div>

            {/* Preços dos Planos */}
            <div className="card mb-4">
                <h2 className="mb-3" style={{ color: 'var(--primary)' }}>💲 Preços dos Planos</h2>

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

                <form onSubmit={salvarPrecos}>
                    <div className="form-row">
                        {[1, 2, 3, 4, 5].map(n => (
                            <div key={n} className="form-group">
                                <label style={{ fontWeight: 600 }}>{n}x por semana</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{
                                        position: 'absolute', left: '12px', top: '50%',
                                        transform: 'translateY(-50%)', color: 'var(--text-muted)'
                                    }}>R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-control"
                                        style={{ paddingLeft: '40px' }}
                                        value={precos[`preco_${n}x`]}
                                        onChange={e => setPrecos({ ...precos, [`preco_${n}x`]: e.target.value })}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="form-group mt-3" style={{ maxWidth: '300px' }}>
                        <label style={{ fontWeight: 600 }}>Horário Promocional (14h-15h)</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute', left: '12px', top: '50%',
                                transform: 'translateY(-50%)', color: 'var(--text-muted)'
                            }}>R$</span>
                            <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                style={{ paddingLeft: '40px' }}
                                value={precos.preco_promocional}
                                onChange={e => setPrecos({ ...precos, preco_promocional: e.target.value })}
                                placeholder="Valor do desconto/promocional"
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary mt-3" disabled={saving}>
                        {saving ? 'Salvando...' : 'Salvar Preços'}
                    </button>
                </form>
            </div>

            {/* Backup e Restauração */}
            <div className="card">
                <h2 className="mb-3" style={{ color: 'var(--primary)' }}>💾 Backup e Restauração</h2>

                <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>📥 Fazer Backup</h3>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                            Baixe uma cópia completa do banco de dados.
                        </p>
                        <button className="btn btn-outline" onClick={fazerBackup}>
                            ⬇️ Download do Backup
                        </button>
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>📤 Restaurar Banco</h3>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                            Substitua o banco de dados atual por um arquivo de backup.
                        </p>
                        <input
                            type="file"
                            accept=".db"
                            className="form-control mb-2"
                            onChange={e => setRestoreFile(e.target.files[0])}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={restaurarBanco}
                            disabled={!restoreFile || restoring}
                            style={{ background: '#f44336' }}
                        >
                            {restoring ? 'Restaurando...' : '⬆️ Restaurar Banco'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Configuracoes;
