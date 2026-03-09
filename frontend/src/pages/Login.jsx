import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Se já está logado, redirecionar
  React.useEffect(() => {
    if (user) {
      if (user.perfil === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/equipe');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !senha) {
      setError('Preencha todos os campos');
      setLoading(false);
      return;
    }

    const result = await login(email, senha);
    
    if (result.success) {
      // O redirecionamento será feito pelo useEffect
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Espaço <span>Magli</span></h1>
          <p>Acesse sua área</p>
        </div>

        {error && (
          <div className="login-error">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="required">E-mail</label>
            <input
              type="email"
              className="form-control"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="required">Senha</label>
            <input
              type="password"
              className="form-control"
              placeholder="Sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-muted mt-3" style={{ fontSize: '0.85rem' }}>
          Esqueceu a senha? Entre em contato com a administração.
        </p>
      </div>
    </div>
  );
}

export default Login;