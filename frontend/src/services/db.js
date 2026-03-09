// IndexedDB para armazenamento offline
const DB_NAME = 'MagliDB';
const DB_VERSION = 3;

let dbInstance = null;

// Inicializar banco
const openMagliDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => reject(e.target.error || request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onclose = () => { dbInstance = null; };
      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      const stores = [
        'usuarios', 'alunas', 'treinos', 'financeiro_receitas',
        'financeiro_despesas', 'ex_alunas', 'pendentes', 'syncQueue'
      ];

      stores.forEach(storeName => {
        if (!database.objectStoreNames.contains(storeName)) {
          if (storeName === 'syncQueue' || storeName === 'pendentes') {
            database.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
          } else {
            database.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      });
    };
  });
};

export const initDB = async () => {
  try {
    return await openMagliDB();
  } catch (err) {
    if (err && err.name === 'VersionError') {
      console.warn('[MagliDB] VersionError detectado. Recriando banco...');
      dbInstance = null;
      await new Promise((resolve) => {
        const delReq = indexedDB.deleteDatabase(DB_NAME);
        delReq.onsuccess = () => resolve();
        delReq.onerror = () => resolve();
        delReq.onblocked = () => resolve();
      });
      return await openMagliDB();
    }
    throw err;
  }
};

// Obter transação e store
const getStore = (storeName, mode = 'readonly') => {
  return new Promise((resolve, reject) => {
    if (!dbInstance) {
      reject('DB não inicializado');
      return;
    }

    try {
      const transaction = dbInstance.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      resolve(store);
    } catch (error) {
      reject(error);
    }
  });
};

// Cachear dados (salvar ou atualizar)
export const cacheData = async (storeName, data) => {
  try {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao cachear dados:', error);
    throw error;
  }
};

// Obter todos os dados
export const getAll = async (storeName) => {
  try {
    const store = await getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao obter dados:', error);
    return [];
  }
};

// Obter item por ID
export const get = async (storeName, id) => {
  try {
    const store = await getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao obter item:', error);
    return null;
  }
};

// Adicionar novo item
export const add = async (storeName, data) => {
  try {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao adicionar:', error);
    throw error;
  }
};

// Atualizar item (alias para cacheData)
export const put = cacheData;

// Remover item
export const remove = async (storeName, id) => {
  try {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao remover:', error);
    return false;
  }
};

// Adicionar à fila de sincronização
export const addToSyncQueue = async (tabela, acao, dados) => {
  try {
    const store = await getStore('syncQueue', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add({
        tabela,
        acao,
        dados,
        timestamp: Date.now()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao adicionar na fila de sync:', error);
    throw error;
  }
};

// Obter itens pendentes de sincronização
export const getPendingSync = async () => {
  return getAll('syncQueue');
};

// Remover item sincronizado
export const removeSynced = async (id) => {
  return remove('syncQueue', id);
};

// Limpar store
export const clearStore = async (storeName) => {
  try {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao limpar store:', error);
    return false;
  }
};

export default {
  initDB,
  cacheData,
  getAll,
  get,
  add,
  put,
  remove,
  addToSyncQueue,
  getPendingSync,
  removeSynced,
  clearStore
};