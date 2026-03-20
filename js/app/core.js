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
        return list.map(r => `<option value="${r[valKey]}" ${r[valKey] == selected ? 'selected' : ''}>${r[labelKey]}</option>`).join('');
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
    });

    // Top nav links
    document.querySelectorAll('.top-nav__link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const moduleKey = link.dataset.module;
            if (moduleKey) navigate('#' + moduleKey);
        });
    });

    // Hash-based routing on load
    window.addEventListener('hashchange', () => navigate(window.location.hash));
    
    // Initial Boot
    setTimeout(() => navigate(window.location.hash || '#dashboard'), 100);
});
