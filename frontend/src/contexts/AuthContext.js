import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { queueRequest, cacheResponse, getCachedResponse, preloadAllData, syncOfflineRequests } from '../utils/offlineSync';

const AuthContext = createContext(null);

// Instância do axios configurada
const isDev = window.location.port === '3000';
const apiBaseURL = isDev
  ? 'http://localhost:3001'
  : `${window.location.origin}/api`;

const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token e fazer method override (HostGator bloqueia PUT/DELETE)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const method = config.method?.toLowerCase();

  // Anti-cache global para GET: força o navegador a baixar dados novos se estiver online
  if (method === 'get') {
    config.params = { ...config.params, _t: new Date().getTime() };
  }

  // Tunelamento de método: PUT e DELETE viram POST com _method
  if (method === 'put' || method === 'delete') {
    config.data = config.data || {};
    if (typeof config.data === 'string') {
      try { config.data = JSON.parse(config.data); } catch (e) { }
    }
    config.data._method = method.toUpperCase();
    config.method = 'post';
  }

  return config;
});

// Função para limpar URL de parâmetros de cache e normalizar para o banco local
const cleanCacheUrl = (url) => {
  if (!url) return '';
  let clean = url;
  if (clean.startsWith(apiBaseURL)) clean = clean.substring(apiBaseURL.length);
  if (!clean.startsWith('/')) clean = '/' + clean;

  // Remover parâmetro _t (timestamp anti-cache)
  clean = clean.replace(/([\?&])_t=[^&]*(&|$)/, '$1');
  // Limpar ? ou & sobrando no final
  clean = clean.replace(/[\?&]$/, '');
  return clean;
};

// Interceptor para tratar requests offline E cachear respostas
api.interceptors.response.use(
  async (response) => {
    // Quando online: cachear todas as respostas GET no IndexedDB
    const method = response.config.method?.toLowerCase();
    if (method === 'get' && response.data) {
      const url = cleanCacheUrl(response.config.url);
      await cacheResponse(url, response.data);
    }
    return response;
  },
  async (error) => {
    // Se for erro de rede (offline)
    if (!error.response && error.code === 'ERR_NETWORK') {
      const { config } = error;
      const method = config.method?.toLowerCase();

      // Para GETs: servir do cache local
      if (method === 'get') {
        const url = cleanCacheUrl(config.url);
        const cached = await getCachedResponse(url);
        if (cached) {
          console.log('[Offline] Servindo do cache:', url);
          return Promise.resolve({ data: cached, _fromCache: true });
        }
        // Sem cache disponível, rejeita normalmente
        return Promise.reject(error);
      }

      // Para POST/PUT/DELETE: enfileirar para sincronizar depois
      if (['post', 'put', 'delete'].includes(method) && !config.url.includes('/login')) {
        await queueRequest(config);

        return Promise.resolve({
          data: {
            success: true,
            _offline: true,
            message: 'Ação salva offline. Sincronização pendente.'
          }
        });
      }
    }

    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há token salvo
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Pré-carregar todos os dados quando o usuário está logado e online
  useEffect(() => {
    if (user && navigator.onLine) {
      preloadAllData(api, user.id);
    }
  }, [user]);

  const login = async (email, senha) => {
    try {
      const response = await api.post('/login', { email, senha });

      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        // Pré-carregar dados após login
        setTimeout(() => preloadAllData(api, user.id), 500);
        return { success: true };
      }

      return { success: false, error: response.data.error || 'Erro ao fazer login' };
    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Erro de conexão'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    api,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.perfil === 'admin',
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#000',
        color: '#FF1493'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✨</div>
          <div>Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export default AuthContext;