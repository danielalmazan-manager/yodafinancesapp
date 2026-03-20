/* ============================================
   YODA FINANZAS — offline.js
   IndexedDB wrapper + offline mutation queue
   ============================================ */

const OFFLINE_DB_NAME    = 'yoda-finance';
const OFFLINE_DB_VERSION = 1;
const STORES = {
    catalogs  : 'catalogs',
    income    : 'income',
    expenses  : 'expenses',
    debt      : 'debt',
    syncQueue : 'syncQueue',
};

// ---- IndexedDB singleton ----
let _idb = null;
function openIDB() {
    if (_idb) return Promise.resolve(_idb);
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORES.catalogs))  db.createObjectStore(STORES.catalogs,   { keyPath: 'key' });
            if (!db.objectStoreNames.contains(STORES.income))    db.createObjectStore(STORES.income,     { keyPath: 'idIncome' });
            if (!db.objectStoreNames.contains(STORES.expenses))  db.createObjectStore(STORES.expenses,   { keyPath: 'idExpense' });
            if (!db.objectStoreNames.contains(STORES.debt))      db.createObjectStore(STORES.debt,       { keyPath: 'idDebt' });
            if (!db.objectStoreNames.contains(STORES.syncQueue)) db.createObjectStore(STORES.syncQueue,  { keyPath: 'id', autoIncrement: true });
        };
        req.onsuccess = e => { _idb = e.target.result; resolve(_idb); };
        req.onerror   = e => reject(e.target.error);
    });
}

// Generic IDB helpers
const IDB = {
    async getAll(store) {
        const db = await openIDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readonly');
            const req = tx.objectStore(store).getAll();
            req.onsuccess = e => resolve(e.target.result);
            req.onerror   = e => reject(e.target.error);
        });
    },
    async get(store, key) {
        const db = await openIDB();
        return new Promise((resolve, reject) => {
            const tx  = db.transaction(store, 'readonly');
            const req = tx.objectStore(store).get(key);
            req.onsuccess = e => resolve(e.target.result);
            req.onerror   = e => reject(e.target.error);
        });
    },
    async putAll(store, items) {
        const db = await openIDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const os = tx.objectStore(store);
            // Clear and re-put for fresh cache
            os.clear();
            items.forEach(item => os.put(item));
            tx.oncomplete = resolve;
            tx.onerror    = e => reject(e.target.error);
        });
    },
    async add(store, item) {
        const db = await openIDB();
        return new Promise((resolve, reject) => {
            const tx  = db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).add(item);
            req.onsuccess = e => resolve(e.target.result);
            req.onerror   = e => reject(e.target.error);
        });
    },
    async delete(store, key) {
        const db = await openIDB();
        return new Promise((resolve, reject) => {
            const tx  = db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).delete(key);
            req.onsuccess = () => resolve();
            req.onerror   = e => reject(e.target.error);
        });
    },
    async count(store) {
        const db = await openIDB();
        return new Promise((resolve, reject) => {
            const tx  = db.transaction(store, 'readonly');
            const req = tx.objectStore(store).count();
            req.onsuccess = e => resolve(e.target.result);
            req.onerror   = e => reject(e.target.error);
        });
    },
};

// ---- Store map: API path → IDB store + key ----
const STORE_MAP = {
    'api/income.php'  : { store: STORES.income,   key: 'idIncome'  },
    'api/expenses.php': { store: STORES.expenses,  key: 'idExpense' },
    'api/debt.php'    : { store: STORES.debt,      key: 'idDebt'    },
};

// ---- Offline-aware API override ----
// Save reference to the original API._req
const _originalReq = API._req.bind(API);

API._req = async function(url, options = {}) {
    const method  = (options.method || 'GET').toUpperCase();
    const urlPath = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    const storeInfo = STORE_MAP[urlPath] || null;

    if (navigator.onLine) {
        // --- ONLINE: normal fetch ---
        try {
            const result = await _originalReq(url, options);

            // After successful GET, cache the data in IndexedDB
            if (method === 'GET' && storeInfo) {
                const rowsToCache = (['api/income.php', 'api/expenses.php', 'api/debt.php', 'api/goals.php'].includes(urlPath) && result.rows) ? result.rows : result;
                if (Array.isArray(rowsToCache)) {
                    IDB.putAll(storeInfo.store, rowsToCache).catch(() => {});
                }
            }
            // After successful GET of catalogs, cache them
            if (method === 'GET' && urlPath === 'api/catalogs.php' && result) {
                IDB.putAll(STORES.catalogs, [{ key: 'all', data: result }]).catch(() => {});
            }

            return result;
        } catch(err) {
            throw err;
        }
    } else {
        // --- OFFLINE ---
        if (method === 'GET') {
            // Serve from IndexedDB
            if (urlPath === 'api/catalogs.php') {
                const cached = await IDB.get(STORES.catalogs, 'all');
                if (cached?.data) { showOfflineBanner(); return cached.data; }
                throw new Error('Catálogos no disponibles offline. Conecta y recarga la app.');
            }
            if (storeInfo) {
                const rows = await IDB.getAll(storeInfo.store);
                showOfflineBanner();
                
                // Specific fix for income.php: construct the object expected by income.js
                if (urlPath === 'api/income.php') {
                    const now = new Date();
                    const month = now.getMonth() + 1; // 1-indexed
                    const year  = now.getFullYear();
                    
                    // Filter and sum for current month locally
                    const currentMonthRows = rows.filter(r => {
                        if (!r.date) return false;
                        const d = new Date(r.date + 'T12:00:00');
                        return (d.getMonth() + 1) === month && d.getFullYear() === year;
                    });
                    
                    const summary = currentMonthRows.reduce((acc, r) => {
                        acc.expected += (+r.amountToBeReceived || 0);
                        acc.actual   += (+r.actualAmountReceived || 0);
                        return acc;
                    }, { expected: 0, actual: 0 });

                    return { rows, summary };
                }

                // Specific fix for expenses.php: construct the object expected by expenses.js
                if (urlPath === 'api/expenses.php') {
                    const now = new Date();
                    const month = now.getMonth() + 1;
                    const year  = now.getFullYear();
                    
                    const currentMonthRows = rows.filter(r => {
                        if (!r.date) return false;
                        const d = new Date(r.date + 'T12:00:00');
                        return (d.getMonth() + 1) === month && d.getFullYear() === year;
                    });
                    
                    const summary = currentMonthRows.reduce((acc, r) => {
                        acc.total += (+r.amountToPay || 0);
                        acc.paid  += (+r.actualAmountPaid || 0);
                        return acc;
                    }, { total: 0, paid: 0 });

                    return { rows, summary };
                }

                // Specific fix for debt.php: construct the object expected by debt.js
                if (urlPath === 'api/debt.php') {
                    const summary = rows.reduce((acc, r) => {
                        acc.total += (+r.amountToPay || 0);
                        acc.paid  += (+r.actualAmountPaid || 0);
                        return acc;
                    }, { total: 0, paid: 0 });

                    return { rows, summary };
                }

                // Specific fix for goals.php: construct the object expected by goals.js
                if (urlPath === 'api/goals.php') {
                    const summary = rows.reduce((acc, r) => {
                        acc.totalTarget += (+r.targetAmount || 0);
                        acc.totalSaved  += (+r.amountDeposited || 0);
                        return acc;
                    }, { totalTarget: 0, totalSaved: 0 });

                    return { rows, summary };
                }
                
                // Specific fix for dashboard.php: construct the object expected by dashboard.js
                if (urlPath === 'api/dashboard.php') {
                    // This is a complex build, but we can do a basic fallback
                    // We'll filter rows by current month for counts/totals
                    const now = new Date();
                    const m = now.getMonth() + 1;
                    const y = now.getFullYear();

                    const filterCurr = r => {
                        const d = new Date(r.date + 'T12:00:00');
                        return (d.getMonth() + 1) === m && d.getFullYear() === y;
                    };

                    // For projection, we actually need data across all dates
                    // We'll group all cached data by idCatDate
                    const cachedCats = await IDB.get(STORES.catalogs, 'all');
                    const dates = cachedCats?.data?.dates || [];
                    
                    const projection = dates.sort((a,b) => new Date(a.date) - new Date(b.date)).map(d => {
                        const incRows = rows.filter(r => r.type === 'income'  && r.idCatDate == d.idCatDate);
                        const expRows = rows.filter(r => r.type === 'expense' && r.idCatDate == d.idCatDate);
                        const dbtRows = rows.filter(r => r.type === 'debt'    && r.idCatDate == d.idCatDate);
                        const golRows = rows.filter(r => r.type === 'goal'    && r.idCatDate == d.idCatDate);

                        return {
                            idCatDate: d.idCatDate,
                            date: d.date,
                            numQuin: d.numQuin,
                            income:  incRows.reduce((s,r) => s + (+r.actualAmountReceived || +r.amountToBeReceived || 0), 0),
                            expense: expRows.reduce((s,r) => s + (+r.amountToPay || 0), 0),
                            debt:    dbtRows.reduce((s,r) => s + (+r.amountToPay || 0), 0),
                            goals:   golRows.reduce((s,r) => s + (+r.amountDeposited || +r.targetAmount || 0), 0),
                        };
                    });

                    return {
                        income: { total: rows.filter(r => r.type === 'income' && filterCurr(r)).reduce((s,r) => s + (+r.amount || 0), 0) },
                        expense: { total: rows.filter(r => r.type === 'expense' && filterCurr(r)).reduce((s,r) => s + (+r.amount || 0), 0) },
                        debt: { total: rows.filter(r => r.type === 'debt').reduce((s,r) => s + (+r.amount || 0), 0) },
                        balance: 0, 
                        recent: rows.slice(0, 10),
                        chart: [],
                        quincenal: { income: 0, expense: 0 },
                        coupleBalance: [],
                        currentQuin: (now.getDate() <= 15 ? 1 : 2),
                        projection: projection
                    };
                }
                
                return rows;
            }
            // For dashboard: build from local stores
            if (urlPath === 'api/dashboard.php') {
                const income  = await IDB.getAll(STORES.income);
                const expense = await IDB.getAll(STORES.expenses);
                const debt    = await IDB.getAll(STORES.debt);
                showOfflineBanner();
                return buildOfflineDashboard(income, expense, debt);
            }
            throw new Error('Sin conexión y sin datos locales disponibles.');
        }

        // POST / PUT / DELETE → enqueue mutation
        if (['POST','PUT','DELETE'].includes(method)) {
            const body = options.body ? JSON.parse(options.body) : {};
            const params = new URLSearchParams(url.split('?')[1] || '').toString();
            await IDB.add(STORES.syncQueue, {
                method, url: urlPath, body, params,
                timestamp: Date.now(),
            });
            showOfflineBanner();
            Ui.toast('Sin conexión — cambio guardado. Se sincronizará al reconectar 🔄', 'info');
            // Return optimistic response
            return { queued: true };
        }

        throw new Error('Sin conexión a internet');
    }
};

// ---- Build offline dashboard from local data ----
function buildOfflineDashboard(income, expense, debt) {
    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();

    const incTotal  = income.reduce((s, r)  => s + (+r.actualAmountReceived || 0), 0);
    const expTotal  = expense.reduce((s, r) => s + (+r.amount || 0), 0);
    const debtTotal = debt.reduce((s, r)    => s + Math.max(0, (+r.amountToPay || 0) - (+r.actualAmountPaid || 0)), 0);

    return {
        income:  { total: incTotal,  count: income.length },
        expense: { total: expTotal,  count: expense.length },
        debt:    { total: debtTotal, count: debt.filter(r => (+r.amountToPay||0) > (+r.actualAmountPaid||0)).length },
        balance: incTotal - expTotal,
        recent:  [],
        chart:   [],
        offline: true,
    };
}

// ---- Offline banner ----
function showOfflineBanner() {
    document.getElementById('offlineBanner')?.classList.add('visible');
}
function hideOfflineBanner() {
    document.getElementById('offlineBanner')?.classList.remove('visible');
}

// ---- Online/Offline events ----
window.addEventListener('online',  () => { hideOfflineBanner(); processSyncQueue(); });
window.addEventListener('offline', () => { showOfflineBanner(); });
if (!navigator.onLine) showOfflineBanner();

// ---- Process sync queue when back online ----
async function processSyncQueue() {
    const queue = await IDB.getAll(STORES.syncQueue);
    if (!queue.length) return;

    let synced = 0;
    for (const item of queue) {
        try {
            const url  = item.url + (item.params ? '?' + item.params : '');
            const opts = { method: item.method };
            if (['POST','PUT'].includes(item.method)) {
                opts.headers = { 'Content-Type': 'application/json' };
                opts.body    = JSON.stringify(item.body);
            }
            const res  = await fetch(url, opts);
            if (res.ok) {
                await IDB.delete(STORES.syncQueue, item.id);
                synced++;
            }
        } catch { /* keep in queue for next attempt */ }
    }

    if (synced > 0) {
        Ui.toast(`✅ ${synced} cambio(s) sincronizados con el servidor`);
        // Refresh current module
        navigate(window.location.hash || '#dashboard');
    }

    // Update badge
    updateSyncBadge();
}

// ---- Sync badge in header ----
async function updateSyncBadge() {
    const count  = await IDB.count(STORES.syncQueue);
    const badge  = document.getElementById('syncBadge');
    if (!badge) return;
    badge.textContent = count > 0 ? count : '';
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

// ---- SW message listener (background sync trigger) ----
navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data?.type === 'PROCESS_SYNC_QUEUE') processSyncQueue();
});

// ---- Init: check queue on load ----
document.addEventListener('DOMContentLoaded', async () => {
    updateSyncBadge();
    if (navigator.onLine) await processSyncQueue();
});
