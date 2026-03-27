import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function BirthdayAlerts() {
  const { api } = useAuth();
  const [aniversariantes, setAniversariantes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api) return;
    loadAniversariantes();
  }, [api]);

  const loadAniversariantes = async () => {
    try {
      const res = await api.get('/alunas');
      const alunas = res.data;
      const hoje = new Date();
      const hojeD = hoje.getDate();
      const hojeM = hoje.getMonth() + 1;

      const results = alunas.filter(a => {
        if (!a.nascimento) return false;
        
        // Parsing robusto (suporta YYYY-MM-DD e DD/MM/YYYY)
        let diaNiver, mesNiver;
        if (a.nascimento.includes('-')) {
          const parts = a.nascimento.split('-');
          if (parts[0].length === 4) { // YYYY-MM-DD
            mesNiver = parseInt(parts[1]);
            diaNiver = parseInt(parts[2]);
          } else { // DD-MM-YYYY
            diaNiver = parseInt(parts[0]);
            mesNiver = parseInt(parts[1]);
          }
        } else if (a.nascimento.includes('/')) {
          const parts = a.nascimento.split('/');
          if (parts[2] && parts[2].length === 4) { // DD/MM/YYYY
            diaNiver = parseInt(parts[0]);
            mesNiver = parseInt(parts[1]);
          } else { // YYYY/MM/DD
            mesNiver = parseInt(parts[1]);
            diaNiver = parseInt(parts[2]);
          }
        } else {
          return false;
        }

        if (diaNiver === hojeD && mesNiver === hojeM) return true;
        
        const dataNiver = new Date(hoje.getFullYear(), mesNiver - 1, diaNiver);
        const diff = Math.ceil((dataNiver - hoje) / (1000 * 60 * 60 * 24));
        return diff > 0 && diff <= 3;
      });

      setAniversariantes(results);
    } catch (error) {
      console.error('Erro ao buscar aniversariantes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || aniversariantes.length === 0) return null;

  const hoje = new Date();
  const hojeD = hoje.getDate();
  const hojeM = hoje.getMonth() + 1;

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #673ab7, #9c27b0)', 
      color: 'white',
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 15px rgba(103, 58, 183, 0.4)',
      animation: 'slideDown 0.5s ease-out'
    }}>
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.5rem' }}>🎂</span>
        <h3 style={{ margin: 0, color: 'white' }}>Parabéns às Aniversariantes!</h3>
      </div>
      <ul style={{ margin: '0 0 0 1.5rem', padding: 0 }}>
        {aniversariantes.map(a => {
           let dia, mes;
           if (a.nascimento.includes('-')) {
               const parts = a.nascimento.split('-');
               if (parts[0].length === 4) { mes = parts[1]; dia = parts[2]; }
               else { dia = parts[0]; mes = parts[1]; }
           } else {
               const parts = a.nascimento.split('/');
               if (parts[2] && parts[2].length === 4) { dia = parts[0]; mes = parts[1]; }
               else { mes = parts[1]; dia = parts[2]; }
           }
           const isHoje = hojeD === parseInt(dia) && hojeM === parseInt(mes);
           return (
             <li key={a.id} style={{ marginBottom: '0.25rem' }}>
               <strong>{a.nome}</strong> - {dia}/{mes} {isHoje ? <span style={{ background: '#ffeb3b', color: '#000', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px', fontSize: '0.75rem', fontWeight: 900 }}>É HOJE! 🎉</span> : <span style={{ opacity: 0.9, fontSize: '0.8rem' }}>(Em breve)</span>}
             </li>
           );
        })}
      </ul>
    </div>
  );
}

export default BirthdayAlerts;
