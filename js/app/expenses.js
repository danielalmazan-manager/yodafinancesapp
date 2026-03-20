/* ============================================
   YODA FINANZAS — expenses.js
   ============================================ */
registerModule('#expenses', async (outlet) => {
    await renderExpensesModule(outlet);
});

async function renderExpensesModule(outlet) {
    const [data, cats] = await Promise.all([
        API.get('api/expenses.php'),
        getCatalogs(),
    ]);

    const { rows, summary } = data;
    const total = +summary.total || 0;
    const paid = +summary.paid || 0;
    const pending = Math.max(0, total - paid);
    const percent = total > 0 ? Math.round((paid / total) * 100) : 100;

    const tableRows = renderExpenseRows(rows, cats);

    outlet.innerHTML = `
      <div class="module-header" style="margin-bottom: var(--gap-lg);">
        <div class="module-header__left">
          <h2 class="module-header__title">🛒 Gastos</h2>
          <p class="module-header__subtitle">Control de egresos y pagos</p>
        </div>
        <div style="display:flex; gap:10px">
          <button class="btn btn--ghost" onclick="Ui.downloadCSV('gastos_yoda.csv', window._expRows)">📥 Exportar CSV</button>
          <button class="btn btn--primary" onclick="expNew()">+ Registrar Gasto</button>
        </div>
      </div>

      <div class="expense-summary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--gap-md); margin-bottom: var(--gap-lg);">
        <div class="stat-card glass-card">
            <span class="stat-card__label">Gastos del mes</span>
            <span class="stat-card__value amount-expense">${Ui.money(total)}</span>
            <div class="quincena-progress" style="margin-top: 0.5rem; overflow:hidden">
                <div class="q-bar" style="width: ${Math.min(percent, 100)}%; height:100%; background: var(--clr-expense); box-shadow: 0 0 10px var(--clr-expense)"></div>
            </div>
            <span class="txt-muted" style="margin-top:0.25rem">${percent}% liquidado</span>
        </div>
        <div class="stat-card glass-card">
            <span class="stat-card__label">Pendiente por pagar</span>
            <span class="stat-card__value amount-pending">${Ui.money(pending)}</span>
            <span class="txt-muted" style="margin-top:0.5rem">Pagado hasta ahora: ${Ui.money(paid)}</span>
        </div>
        <div class="stat-card glass-card" style="padding:1rem; display:flex; flex-direction:column; align-items:center;">
            <span class="stat-card__label" style="margin-bottom:0.5rem">Distribución</span>
            <div style="height:120px; width:120px"><canvas id="expCategoryChart"></canvas></div>
        </div>
      </div>

      <div class="table-wrap">
        <div class="table-toolbar" style="flex-wrap:wrap; gap:15px">
          <div style="display:flex; align-items:center; gap:10px; flex-grow:1">
            <span class="table-toolbar__title">Detalle de Gastos</span>
            <select class="form__input" style="padding:4px 8px; font-size:0.8rem; width:auto" id="expFilterDate">
                <option value="">Todas las fechas</option>
                ${Ui.options(cats.dates, 'idCatDate', r => `${r.date} (Q${r.numQuin})`)}
            </select>
            <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; cursor:pointer; color:var(--clr-text-2)">
                <input type="checkbox" id="expHideCovered" checked> Ocultar pagados
            </label>
          </div>
          <input type="text" class="table-search" id="expSearch" placeholder="Buscar texto...">
        </div>
        <div style="overflow-x:auto">
          <table class="data-table" id="expTable">
            <thead>
              <tr>
                <th>Fecha</th><th>Categoría / Estado</th><th>👤</th><th>Para</th><th>Monto</th><th>Notas</th><th></th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>`;

    Ui.filterTable('expSearch', 'expTable');
    
    const handleFilters = () => {
        const dateId = document.getElementById('expFilterDate').value;
        const hideCovered = document.getElementById('expHideCovered').checked;
        
        let filtered = rows;
        if (dateId) filtered = filtered.filter(r => r.idCatDate == dateId);
        if (hideCovered) {
            filtered = filtered.filter(r => (+r.actualAmountPaid < +r.amountToPay) || (+r.amountToPay == 0));
        }
        
        document.querySelector('#expTable tbody').innerHTML = renderExpenseRows(filtered, cats);
    };

    document.getElementById('expFilterDate').addEventListener('change', handleFilters);
    document.getElementById('expHideCovered').addEventListener('change', handleFilters);

    renderExpChart(rows);

    window._expRows = rows;
    window._expCats = cats;
}

function renderExpenseRows(rows, cats) {
    if (!rows.length) return '<tr><td colspan="7"><div class="empty-state">No hay resultados...</div></td></tr>';
    
    return rows.map(r => {
        const user = cats.users.find(u => u.idUser == r.idUser) || { avatar: '👤', nameUser: '?' };
        const amtToPay = +r.amountToPay || 0;
        const amtPaid = +r.actualAmountPaid || 0;
        const faltante = amtToPay - amtPaid;
        let statusBadge = (amtPaid >= amtToPay && amtToPay > 0) ? '<span class="badge badge--income">✅ Pagado</span>' : (amtPaid > 0 ? '<span class="badge" style="background:var(--clr-accent); color:var(--clr-white)">🌓 Parcial</span>' : '<span class="badge badge--expense">⏳ Pendiente</span>');
        
        return `
          <tr data-id="${r.idExpense}">
            <td>${Ui.date(r.date)}</td>
            <td><div style="display:flex; flex-direction:column; gap:4px"><span class="badge badge--expense">🛒 ${r.nameTypeExpense || '—'}</span>${statusBadge}</div></td>
            <td><div class="user-chip" title="${user.nameUser}"><span>${user.avatar}</span></div></td>
            <td><span class="txt-muted">${r.nameTypeSubjectExpense || '—'}</span></td>
            <td><div style="display:flex; flex-direction:column; gap:2px"><span class="amount-expense" style="font-size:1.1rem">${Ui.money(amtToPay)}</span><span class="txt-muted" style="font-size:0.75rem">Faltante: ${Ui.money(faltante)}</span></div></td>
            <td><span class="txt-muted" style="font-size:0.85rem">${r.txtNotes || '—'}</span></td>
            <td><div class="tbl-actions">${faltante > 0 ? `<button class="tbl-btn" onclick="expMarkPaid(${r.idExpense})" title="Marcar como pagado">✓</button>` : ''}<button class="tbl-btn" onclick="expEdit(${r.idExpense})" title="Editar">✏️</button><button class="tbl-btn tbl-btn--danger" onclick="expDelete(${r.idExpense})" title="Eliminar">🗑</button></div></td>
          </tr>`;
    }).join('');
}

function renderExpChart(rows) {
    const ctx = document.getElementById('expCategoryChart').getContext('2d');
    const categories = {};
    rows.forEach(r => {
        const cat = r.nameTypeExpense || 'Otros';
        categories[cat] = (categories[cat] || 0) + (+r.amountToPay || 0);
    });

    const labels = Object.keys(categories);
    const data = Object.values(categories);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#6c63ff', '#ff6b9d', '#22d3ee', '#f59e0b', '#10b981', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            plugins: { legend: { display: false } },
            maintainAspectRatio: false
        }
    });
}

function expFormHTML(data = {}) {
    const cats = window._expCats;
    return `
      <div class="form-grid" style="display: grid; gap: var(--gap-md); grid-template-columns: 1fr 1fr;">
          <div class="form__group">
            <label class="form__label">Categoría</label>
            <select id="f_idTypeExpense" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.typeExpense,'idTypeExpense','nameTypeExpense', data.idTypeExpense)}
            </select>
          </div>
          <div class="form__group">
            <label class="form__label">¿Para quién?</label>
            <select id="f_typeSubjectExpense" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.subjectExpense,'typeSubjectExpense','nameTypeSubjectExpense', data.typeSubjectExpense)}
            </select>
          </div>
          <div class="form__group">
            <label class="form__label">Fecha (Quincena)</label>
            <select id="f_idCatDate" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.dates,'idCatDate', r => `${r.date} (Q${r.numQuin||'?'})`, data.idCatDate)}
            </select>
          </div>
          <div class="form__group">
            <label class="form__label">Monto a Pagar</label>
            <input type="number" id="f_amountToPay" class="form__input" step="0.01" min="0" placeholder="0.00" value="${data.amountToPay||''}">
          </div>
          <div class="form__group">
            <label class="form__label">Monto Pagado Actual</label>
            <div style="display:flex; gap:8px">
                <input type="number" id="f_amountPaid" class="form__input" step="0.01" min="0" placeholder="0.00" value="${data.actualAmountPaid||''}">
                <button class="btn btn--ghost" style="padding:0 10px" onclick="document.getElementById('f_amountPaid').value = document.getElementById('f_amountToPay').value" title="Marcar como pagado">✅</button>
            </div>
          </div>
          <div class="form__group" style="grid-column: span 2;">
            <label class="form__label">Notas</label>
            <input type="text" id="f_txtNotes" class="form__input" placeholder="Ej: Súper del sábado" value="${data.txtNotes||''}">
          </div>
      </div>`;
}

function expCollect() {
    return {
        idTypeExpense:      document.getElementById('f_idTypeExpense').value      || null,
        typeSubjectExpense: document.getElementById('f_typeSubjectExpense').value  || null,
        idCatDate:          document.getElementById('f_idCatDate').value           || null,
        amount:             document.getElementById('f_amountToPay').value         || 0,
        actualAmountPaid:   document.getElementById('f_amountPaid').value          || 0,
        txtNotes:           document.getElementById('f_txtNotes').value            || null,
    };
}

function expAddFooter(action, id = null) {
    document.getElementById('modalFooterSlot')?.remove();
    const footer = document.createElement('div');
    footer.id = 'modalFooterSlot'; footer.className = 'modal__footer';
    if (action === 'new') {
        footer.innerHTML = `<button class="btn btn--ghost" onclick="Ui.closeModal()">Cancelar</button>
                            <button class="btn btn--primary" style="padding: 0.75rem 2rem" onclick="expSave()">Guardar Gasto</button>`;
    } else {
        footer.innerHTML = `<button class="btn btn--ghost" onclick="Ui.closeModal()">Cancelar</button>
                            <button class="btn btn--primary" style="padding: 0.75rem 2rem" onclick="expUpdate(${id})">Actualizar</button>`;
    }
    document.getElementById('modal').appendChild(footer);
}

window.expNew = () => { 
    const cats = window._expCats;
    const defaultDateId = Ui.getCurrentIdCatDate(cats.dates);
    Ui.openModal('➕ Nuevo Gasto', expFormHTML({ idCatDate: defaultDateId })); 
    expAddFooter('new'); 
};

window.expSave = async () => {
    const { valid, errors } = Ui.validate([
        { id: 'f_idTypeExpense',      label: 'Categoría', required: true },
        { id: 'f_idCatDate',          label: 'Fecha',     required: true },
        { id: 'f_amountToPay',        label: 'Monto',     required: true },
    ]);
    if (!valid) return Ui.toast(`Campos requeridos: ${errors.join(', ')}`, 'error');

    try {
        await API.post('api/expenses.php', expCollect());
        Ui.toast('Gasto guardado ✅'); Ui.closeModal(); navigate('#expenses');
    } catch(e) { Ui.toast(e.message, 'error'); }
};

window.expEdit = (id) => {
    const row = window._expRows.find(r => r.idExpense == id);
    if (!row) return;
    Ui.openModal('✏️ Editar Gasto', expFormHTML(row)); expAddFooter('edit', id);
};

window.expUpdate = async (id) => {
    const { valid, errors } = Ui.validate([
        { id: 'f_idTypeExpense',      label: 'Categoría', required: true },
        { id: 'f_idCatDate',          label: 'Fecha',     required: true },
        { id: 'f_amountToPay',        label: 'Monto',     required: true },
    ]);
    if (!valid) return Ui.toast(`Campos requeridos: ${errors.join(', ')}`, 'error');

    try {
        await API.put('api/expenses.php', { ...expCollect(), idExpense: id });
        Ui.toast('Gasto actualizado ✅'); Ui.closeModal(); navigate('#expenses');
    } catch(e) { Ui.toast(e.message, 'error'); }
};

window.expDelete = async (id) => {
    if (!Ui.confirm('¿Eliminar este gasto?')) return;
    try {
        await API.delete('api/expenses.php', { id });
        Ui.toast('Gasto eliminado'); navigate('#expenses');
    } catch(e) { Ui.toast(e.message, 'error'); }
};

window.expMarkPaid = async (id) => {
    const row = window._expRows.find(r => r.idExpense == id);
    if (!row) return;
    try {
        await API.put('api/expenses.php', {
            ...row,
            idExpense: id,
            amount: row.amountToPay, // API expects 'amount' for amountToPay
            actualAmountPaid: row.amountToPay
        });
        Ui.toast('Gasto marcado como pagado ✅');
        navigate('#expenses');
    } catch(e) { Ui.toast(e.message, 'error'); }
};
