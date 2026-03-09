/**
 * Offline-First Data Sync para Magli
 * 
 * 2 stores no IndexedDB:
 *   - "cache"    → armazena respostas GET da API (chave = URL)
 *   - "requests" → fila de POST/PUT/DELETE pendentes para enviar quando online
 */

const DB_NAME = 'MagliOfflineDB';
const DB_VERSION = 3; // Incrementado para forçar recriação dos stores
const CACHE_STORE = 'cache';
const QUEUE_STORE = 'requests';

// ==================== IndexedDB Init ====================

let dbInstance = null;

const openDB = () => {
    return new Promise((resolve, reject) => {
        // Reutilizar conexão existente se válida
        if (dbInstance) {
            try {
                dbInstance.transaction(CACHE_STORE, 'readonly');
                return resolve(dbInstance);
            } catch (e) {
                dbInstance = null;
            }
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(CACHE_STORE)) {
                db.createObjectStore(CACHE_STORE, { keyPath: 'url' });
            }
            if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            dbInstance.onclose = () => { dbInstance = null; };
            dbInstance.onversionchange = () => {
                dbInstance.close();
                dbInstance = null;
            };
            resolve(dbInstance);
        };

        request.onerror = (e) => {
            reject(e.target.error || request.error);
        };
    });
};

const initDB = async () => {
    try {
        return await openDB();
    } catch (err) {
        // Se for VersionError, deletar o banco antigo e recriar
        if (err && err.name === 'VersionError') {
            console.warn('[OfflineSync] VersionError detectado. Recriando banco...');
            dbInstance = null;
            await new Promise((resolve, reject) => {
                const delReq = indexedDB.deleteDatabase(DB_NAME);
                delReq.onsuccess = () => resolve();
                delReq.onerror = () => resolve(); // Continuar mesmo se falhar
                delReq.onblocked = () => resolve();
            });
            return await openDB();
        }
        throw err;
    }
};

// ==================== Cache de Leitura (GET) ====================

/**
 * Cacheia uma resposta GET no IndexedDB.
 * Toda a operação é síncrona dentro da transaction para evitar
 * "transaction has finished" errors.
 */
export const cacheResponse = async (url, data) => {
    try {
        const db = await initDB();
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(CACHE_STORE, 'readwrite');
                const store = tx.objectStore(CACHE_STORE);
                store.put({ url, data, timestamp: Date.now() });
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch (e) {
                // Store não existe ou banco foi fechado
                dbInstance = null;
                resolve();
            }
        });
    } catch (e) {
        // Silently fail — não bloquear a app por causa do cache
    }
};

export const getCachedResponse = async (url) => {
    try {
        const db = await initDB();
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(CACHE_STORE, 'readonly');
                const req = tx.objectStore(CACHE_STORE).get(url);
                req.onsuccess = () => resolve(req.result?.data || null);
                req.onerror = () => resolve(null);
            } catch (e) {
                dbInstance = null;
                resolve(null);
            }
        });
    } catch (e) {
        return null;
    }
};

/**
 * Pré-carrega todos os endpoints principais para uso offline.
 */
export const preloadAllData = async (apiInstance, userId) => {
    if (!navigator.onLine) return;

    const now = new Date();
    const getMesStr = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const mesAtual = getMesStr(now);

    const prev = new Date(); prev.setMonth(now.getMonth() - 1);
    const mesAnterior = getMesStr(prev);

    const next = new Date(); next.setMonth(now.getMonth() + 1);
    const mesProximo = getMesStr(next);

    const endpoints = [
        '/professoras',
        '/configuracoes',
        '/alunas',
        '/treinos',
        '/usuarios',
        '/ex-alunas',
        '/horarios',
        '/anamnese',
        `/receitas?mes=${mesAtual}`,
        `/despesas?mes=${mesAtual}`,
        `/receitas?mes=${mesAnterior}`,
        `/despesas?mes=${mesAnterior}`,
        `/receitas?mes=${mesProximo}`,
        `/despesas?mes=${mesProximo}`,
    ];

    if (userId) {
        endpoints.push('/treinos/professora/' + userId);
    }

    const promises = endpoints.map(async (endpoint) => {
        try {
            const res = await apiInstance.get(endpoint);
            // O interceptor já faz o cacheResponse, mas chamamos aqui por garantia 
            // no caso de já estarmos usando a URL limpa no request
            await cacheResponse(endpoint, res.data);
        } catch (e) {
            // Silently fail
        }
    });

    await Promise.allSettled(promises);
    console.log('[OfflineSync] Dados pré-carregados (' + endpoints.length + ' endpoints)');
};

// ==================== Fila de Escrita (POST/PUT/DELETE) ====================

const cleanUrl = (url, baseURL) => {
    let clean = url || '';
    if (baseURL && clean.startsWith(baseURL)) {
        clean = clean.substring(baseURL.length);
    }
    if (clean && !clean.startsWith('/')) {
        clean = '/' + clean;
    }
    return clean;
};

export const queueRequest = async (config) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            try {
                const tx = db.transaction(QUEUE_STORE, 'readwrite');
                const store = tx.objectStore(QUEUE_STORE);

                let parsedData = null;
                if (config.data) {
                    try {
                        parsedData = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
                    } catch (e) {
                        parsedData = config.data;
                    }
                }

                const relativeUrl = cleanUrl(config.url, config.baseURL);

                store.add({
                    url: relativeUrl,
                    method: config.method,
                    data: parsedData,
                    timestamp: new Date().toISOString()
                });

                tx.oncomplete = () => {
                    console.log('[OfflineSync] Enfileirado:', config.method, relativeUrl);
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            } catch (e) {
                dbInstance = null;
                reject(e);
            }
        });
    } catch (err) {
        console.error('[OfflineSync] Erro ao enfileirar:', err);
    }
};

export const getPendingCount = async () => {
    try {
        const db = await initDB();
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(QUEUE_STORE, 'readonly');
                const req = tx.objectStore(QUEUE_STORE).count();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(0);
            } catch (e) {
                dbInstance = null;
                resolve(0);
            }
        });
    } catch (e) {
        return 0;
    }
};

export const syncOfflineRequests = async (apiInstance, userId) => {
    if (!navigator.onLine) return 0;

    try {
        const db = await initDB();

        return new Promise((resolve) => {
            let requests = [];
            try {
                const tx = db.transaction(QUEUE_STORE, 'readonly');
                const store = tx.objectStore(QUEUE_STORE);
                const req = store.getAll();

                req.onsuccess = async () => {
                    requests = req.result;
                    if (requests.length === 0) return resolve(0);

                    let syncedCount = 0;

                    for (const item of requests) {
                        try {
                            await apiInstance({
                                url: item.url,
                                method: item.method,
                                data: item.data,
                            });

                            // Remove do banco local
                            try {
                                const delTx = db.transaction(QUEUE_STORE, 'readwrite');
                                delTx.objectStore(QUEUE_STORE).delete(item.id);
                            } catch (e) {
                                dbInstance = null;
                            }
                            syncedCount++;
                        } catch (err) {
                            console.error('[OfflineSync] Falha ao sincronizar:', err);
                            if (!err.response && err.code === 'ERR_NETWORK') break;
                        }
                    }

                    if (syncedCount > 0) {
                        await preloadAllData(apiInstance, userId);
                    }

                    resolve(syncedCount);
                };
                req.onerror = () => resolve(0);
            } catch (e) {
                dbInstance = null;
                resolve(0);
            }
        });
    } catch (err) {
        console.error('[OfflineSync] Erro no sync:', err);
        return 0;
    }
};
