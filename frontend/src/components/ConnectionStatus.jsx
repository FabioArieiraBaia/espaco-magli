import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { syncOfflineRequests } from '../utils/offlineSync';

const ConnectionStatus = () => {
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const { api, user } = useAuth();

  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true);
      if (api) {
        setSyncing(true);
        const count = await syncOfflineRequests(api, user?.id);
        setSyncing(false);
        if (count > 0) {
          window.location.reload(); 
        }
      }
    };

    const handleOffline = () => setOnline(false);

    // Tentar sincronizar ao montar se já estiver online
    if (navigator.onLine) {
      handleOnline();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [api, user?.id]);


  // Mostrar UI só se estiver offline OU sincronizando
  if (online && !syncing) return null;

  return (
    <div className={`connection-status ${syncing ? 'syncing' : 'offline'}`}>
      <span className="status-dot" style={{ backgroundColor: 'white', display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', marginRight: '8px' }}></span>
      <span>
        {syncing
          ? 'Conexão restaurada! Sincronizando dados pendentes...'
          : 'Você está offline. Alterações serão salvas localmente.'}
      </span>
    </div>
  );
};

export default ConnectionStatus;