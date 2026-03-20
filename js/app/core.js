/* ============================================
   YODA FINANZAS — core.js
   API client, SPA Router, UI utilities
   ============================================ */

// ---- API CLIENT ----
const API = {
    async _req(url, options = {}) {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options,
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Error');
        return json.data;
    },
    get:    (url, params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return API._req(qs ? `${url}?${qs}` : url);
    },
    post:   (url, body) => API._req(url, { method: 'POST',   body: JSON.stringify(body) }),
    put:    (url, body) => API._req(url, { method: 'PUT',    body: JSON.stringify(body) }),
    delete: (url, params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return API._req(qs ? `${url}?${qs}` : url, { method: 'DELETE' });
    },
};

// ---- CATALOG CACHE ----
let _catalogs = null;
async function getCatalogs() {
    if (!_catalogs) _catalogs = await API.get('api/catalogs.php');
    return _catalogs;
}

// ---- ROUTER ----
const modules = {};
function registerModule(hash, fn) { modules[hash] = fn; }

async function navigate(hash) {
    hash = hash || '#dashboard';
    window.location.hash = hash;

    const outlet = document.getElementById('app-outlet');
    if (!outlet) return;
    
    outlet.innerHTML = `<div class="app-loader"><div class="app-loader__spinner"></div></div>`;

    // Update active nav link
    document.querySelectorAll('.top-nav__link').forEach(l => l.classList.remove('active'));
    const key  = hash.replace('#', '');
    const link = document.querySelector(`.top-nav__link[data-module="${key}"]`);
    if (link) link.classList.add('active');

    const titles = { dashboard: 'Resumen', income: 'Ingresos', expenses: 'Gastos', debt: 'Deudas', goals: 'Metas' };
    
    const fn = modules[hash];
    if (fn) {
        try { await fn(outlet); }
        catch(e) { outlet.innerHTML = `<div class="empty-state"><div class="empty-state__icon">⚠️</div><p>${e.message}</p></div>`; }
    } else {
        outlet.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🔍</div><p>Módulo no encontrado</p></div>`;
    }
}

// ---- UI UTILITIES ----
const Ui = {
    // Format currency MXN
    money(val) {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
    },

    // Format date
    date(val) {
        if (!val) return '—';
        return new Date(val + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    // Toast notification
    toast(msg, type = 'success') {
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        const el    = document.createElement('div');
        el.className = `toast toast--${type}`;
        el.innerHTML = `<span class="toast__icon">${icons[type]||'ℹ️'}</span><span class="toast__msg">${msg}</span>`;
        document.getElementById('toastContainer').appendChild(el);
        setTimeout(() => el.remove(), 3500);
    },

    // Open modal
    openModal(title, bodyHTML, footerHTML = '') {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML   = bodyHTML;
        const backdrop = document.getElementById('modalBackdrop');
        backdrop.classList.add('open');
        backdrop.setAttribute('aria-hidden', 'false');
        if (footerHTML) {
            let footer = document.getElementById('modalFooterSlot');
            if (!footer) {
                footer = document.createElement('div');
                footer.id = 'modalFooterSlot';
                footer.className = 'modal__footer';
                document.getElementById('modal').appendChild(footer);
            }
            footer.innerHTML = footerHTML;
        }
    },

    closeModal() {
        document.getElementById('modalBackdrop').classList.remove('open');
        document.getElementById('modalBackdrop').setAttribute('aria-hidden', 'true');
        const slot = document.getElementById('modalFooterSlot');
        if (slot) slot.innerHTML = '';
    },

    // Build select options HTML
    options(list, valKey, labelKey, selected = '') {
        if (!list || !Array.isArray(list)) return '';
        return list.map(r => {
            const label = typeof labelKey === 'function' ? labelKey(r) : r[labelKey];
            return `<option value="${r[valKey]}" ${r[valKey] == selected ? 'selected' : ''}>${label}</option>`;
        }).join('');
    },

    // Form field validator
    validate(rules) {
        const errors = [];
        rules.forEach(({ id, label, required }) => {
            const el = document.getElementById(id);
            const val = el?.value?.trim();
            if (required && !val) {
                errors.push(label);
                el?.classList.add('input--error');
            } else {
                el?.classList.remove('input--error');
            }
        });
        return { valid: errors.length === 0, errors };
    },

    // Confirm dialog
    confirm(msg) { return window.confirm(msg); },

    // Simple client-side search filter on table
    filterTable(inputId, tableId) {
        const inp = document.getElementById(inputId);
        const tbl = document.getElementById(tableId);
        if (!inp || !tbl) return;
        inp.addEventListener('input', () => {
            const q = inp.value.toLowerCase();
            tbl.querySelectorAll('tbody tr').forEach(tr => {
                tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        });
    },

    // Global search modal
    async openSearch() {
        const html = `
            <div class="search-modal-content">
                <input type="text" id="globalSearchInp" class="form__input" placeholder="Buscar gastos, ingresos, notas..." style="width: 100%; font-size: 1.2rem; padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem;" autofocus>
                <div id="globalSearchResults" style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
                    <p class="txt-muted" style="text-align: center; padding: 2rem;">Escribe al menos 2 caracteres para buscar...</p>
                </div>
            </div>
        `;
        this.openModal('🔍 Buscador Global', html);
        
        const inp = document.getElementById('globalSearchInp');
        const resDiv = document.getElementById('globalSearchResults');
        
        let timeout;
        inp.addEventListener('input', () => {
            clearTimeout(timeout);
            const q = inp.value.trim();
            if (q.length < 2) return;
            
            timeout = setTimeout(async () => {
                resDiv.innerHTML = '<div class="app-loader__spinner" style="margin: 2rem auto"></div>';
                try {
                    const results = await API.get('api/search.php', { q });
                    if (!results.length) {
                        resDiv.innerHTML = '<p class="txt-muted" style="text-align: center; padding: 2rem;">No se encontraron resultados.</p>';
                        return;
                    }
                    resDiv.innerHTML = results.map(r => {
                        const icon = { income: '💵', expense: '🛒', debt: '💳' }[r.type];
                        return `
                            <div class="search-result-item glass-card" style="padding: 12px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: transform 0.2s;" onclick="Ui.closeModal(); navigate('#${r.type}')">
                                <div style="font-size: 1.5rem;">${icon}</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 700; font-size: 0.95rem;">${r.category || 'Sin categoría'}</div>
                                    <div class="txt-muted" style="font-size: 0.8rem;">${r.date} — ${r.notes || 'Sin notas'}</div>
                                </div>
                                <div class="amount-${r.type}" style="font-weight: 800;">${this.money(r.amount)}</div>
                            </div>
                        `;
                    }).join('');
                } catch(e) { 
                    resDiv.innerHTML = `<p class="amount-expense" style="text-align: center; padding: 2rem;">${e.message}</p>`;
                }
            }, 300);
        });
    },

    // CSV Export
    downloadCSV(filename, rows) {
        if (!rows || !rows.length) return this.toast('Sin datos para exportar', 'error');
        const keys = Object.keys(rows[0]);
        const csvContent = "data:text/csv;charset=utf-8," 
            + keys.join(",") + "\n"
            + rows.map(r => keys.map(k => {
                let cell = r[k] === null || r[k] === undefined ? "" : r[k];
                cell = cell.toString().replace(/"/g, '""');
                return cell.includes(',') ? `"${cell}"` : cell;
            }).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // Helper to find current quincena from catalog
    getCurrentIdCatDate(dates) {
        if (!dates || !dates.length) return null;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        // Find the record with the closest date <= today
        let bestMatch = null;
        for (const r of dates) {
            if (r.date <= todayStr) {
                if (!bestMatch || r.date > bestMatch.date) {
                    bestMatch = r;
                }
            }
        }
        
        // If no past date, take the first one
        return (bestMatch || dates[0]).idCatDate;
    }
};

/* --- FAB LOGIC --- */
window.toggleFab = () => {
    const fab = document.getElementById('fabContainer');
    if (fab) fab.classList.toggle('open');
};

/* --- NAVIGATION SYNC --- */
const syncNav = (hash) => {
    const module = (hash || '#dashboard').replace('#', '');
    document.querySelectorAll('.top-nav__link, .bottom-nav__link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-module') === module);
    });
};

// ---- SIDEBAR & HEADER TOGGLE ----
document.addEventListener('DOMContentLoaded', () => {
    // Modal close
    document.getElementById('modalClose')?.addEventListener('click', Ui.closeModal);
    document.getElementById('modalBackdrop')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) Ui.closeModal();
    });

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Swap logo src
        const appLogo = document.getElementById('appLogo');
        if (appLogo) {
            appLogo.src = newTheme === 'dark' ? 'assets/images/yoda_logo_dark.png' : 'assets/images/yoda_logo_light.png';
        }
    });

    // Set initial logo based on saved theme
    if (savedTheme === 'dark') {
        const appLogo = document.getElementById('appLogo');
        if (appLogo) appLogo.src = 'assets/images/yoda_logo_dark.png';
    }

    // Nav links (Top & Bottom)
    document.querySelectorAll('.top-nav__link, .bottom-nav__link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const moduleKey = link.dataset.module;
            if (moduleKey) navigate('#' + moduleKey);
        });
    });

    // Hash-based routing on load
    window.addEventListener('hashchange', () => {
        syncNav(window.location.hash);
        navigate(window.location.hash);
    });
    
    // Initial Boot
    setTimeout(() => {
        syncNav(window.location.hash);
        navigate(window.location.hash || '#dashboard');
    }, 100);

    // Close FAB when clicking outside
    document.addEventListener('click', (e) => {
        const fab = document.getElementById('fabContainer');
        if (fab && fab.classList.contains('open') && !fab.contains(e.target) && !e.target.closest('.fab-main')) {
            fab.classList.remove('open');
        }
    });

    // Ctrl+K Search Listener
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            Ui.openSearch();
        }
    });
});
