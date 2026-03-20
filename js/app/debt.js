/* ============================================
   YODA FINANZAS — debt.js
   ============================================ */
registerModule('#debt', async (outlet) => {
    await renderDebtModule(outlet);
});

async function renderDebtModule(outlet) {
    const [data, cats] = await Promise.all([
        API.get('api/debt.php'),
        getCatalogs(),
    ]);

    const { rows, summary } = data;
    const total = +summary.total || 0;
    const paid = +summary.paid || 0;
    const pending = Math.max(0, total - paid);
    const globalPercent = total > 0 ? Math.round((paid / total) * 100) : 100;

    const tableRows = renderDebtRows(rows, cats);

    outlet.innerHTML = `
      <div class="module-header" style="margin-bottom: var(--gap-lg);">
        <div class="module-header__left">
          <h2 class="module-header__title">💳 Deudas</h2>
          <p class="module-header__subtitle">Seguimiento de saldos y compromisos</p>
        </div>
        <div style="display:flex; gap:10px">
          <button class="btn btn--ghost" onclick="Ui.downloadCSV('deudas_yoda.csv', window._debtRows)">📥 Exportar CSV</button>
          <button class="btn btn--primary" onclick="debtNew()">+ Registrar Deuda</button>
        </div>
      </div>

      <div class="debt-timeline glass-card" style="margin-bottom: var(--gap-lg); padding: 1.5rem;">
        <h3 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 1rem; color: var(--clr-text-muted); text-transform: uppercase;">📅 Próximos Vencimientos (Cronograma)</h3>
        <div class="timeline-scroll" style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 10px;">
            ${(cats.dates || []).slice().reverse().slice(0, 8).map(d => {
                const dueInQuin = rows.filter(r => r.idCatDate == d.idCatDate);
                const totalDue = dueInQuin.reduce((acc, r) => acc + (+r.amountToPay - +r.actualAmountPaid), 0);
                const isCurrent = d.idCatDate == Ui.getCurrentIdCatDate(cats.dates);
                
                return `
                <div class="timeline-item ${isCurrent ? 'active' : ''}" style="min-width: 140px; padding: 12px; border-radius: 12px; background: ${isCurrent ? 'rgba(var(--clr-primary-rgb), 0.1)' : 'var(--clr-bg-2)'}; border: 1px solid ${isCurrent ? 'var(--clr-primary)' : 'var(--clr-border)'};">
                    <div style="font-size: 0.7rem; font-weight: 700; color: var(--clr-text-muted)">${d.date}</div>
                    <div style="font-size: 0.8rem; font-weight: 800; margin: 4px 0;">Q${d.numQuin}</div>
                    <div class="${totalDue > 0 ? 'amount-expense' : 'amount-income'}" style="font-size: 1rem; font-weight: 700;">
                        ${Ui.money(totalDue)}
                    </div>
                </div>`;
            }).join('')}
        </div>
      </div>

      <div class="debt-summary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--gap-md); margin-bottom: var(--gap-lg);">
        <div class="stat-card glass-card stat-card--total-debt" style="position:relative; overflow:hidden">
            <span class="stat-card__label">Deuda Total Acumulada</span>
            <span class="stat-card__value" style="color:var(--clr-expense)">${Ui.money(total)}</span>
            <div style="margin-top:1rem">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.9rem">
                    <span>Progreso de Liquidación</span>
                    <span style="font-weight:700">${globalPercent}%</span>
                </div>
                <div class="quincena-progress" style="height:12px; background: rgba(0,0,0,0.05)">
                    <div class="q-bar" style="width: ${globalPercent}%; background: linear-gradient(90deg, var(--clr-primary), var(--clr-income))"></div>
                </div>
            </div>
        </div>
        <div class="stat-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:var(--gap-md)">
            <div class="stat-card glass-card">
                <span class="stat-card__label">Total Pagado</span>
                <span class="stat-card__value amount-income" style="font-size:1.5rem">${Ui.money(paid)}</span>
            </div>
            <div class="stat-card glass-card">
                <span class="stat-card__label">Saldo Pendiente</span>
                <span class="stat-card__value amount-pending" style="font-size:1.5rem">${Ui.money(pending)}</span>
            </div>
        </div>
      </div>

      <div class="table-wrap">
        <div class="table-toolbar" style="flex-wrap:wrap; gap:15px">
          <div style="display:flex; align-items:center; gap:10px; flex-grow:1">
            <span class="table-toolbar__title">Detalle de Deudas</span>
            <select class="form__input" style="padding:4px 8px; font-size:0.8rem; width:auto" id="debtFilterDate">
                <option value="">Todas las fechas</option>
                ${Ui.options(cats.dates, 'idCatDate', r => `${r.date} (Q${r.numQuin})`)}
            </select>
            <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; cursor:pointer; color:var(--clr-text-2)">
                <input type="checkbox" id="debtHideLiquidated" checked> Ocultar liquidadas
            </label>
          </div>
          <input type="text" class="table-search" id="debtSearch" placeholder="Buscar…">
        </div>
        <div style="overflow-x:auto">
          <table class="data-table" id="debtTable">
            <thead>
              <tr>
                <th>Fecha</th><th>Tipo / Instrumento</th><th>Responsable</th>
                <th style="width:200px">Amortización</th><th>Pendiente</th><th>Estado</th><th>Notas</th><th></th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>`;

    Ui.filterTable('debtSearch', 'debtTable');

    const handleFilters = () => {
        const dateId = document.getElementById('debtFilterDate').value;
        const hideLiquidated = document.getElementById('debtHideLiquidated').checked;
        
        let filtered = rows;
        if (dateId) filtered = filtered.filter(r => r.idCatDate == dateId);
        if (hideLiquidated) {
            filtered = filtered.filter(r => (+r.actualAmountPaid < +r.amountToPay) || (+r.amountToPay == 0));
        }
        
        document.querySelector('#debtTable tbody').innerHTML = renderDebtRows(filtered, cats);
    };

    document.getElementById('debtFilterDate').addEventListener('change', handleFilters);
    document.getElementById('debtHideLiquidated').addEventListener('change', handleFilters);

    window._debtRows = rows;
    window._debtCats = cats;
}

function renderDebtRows(rows, cats) {
    if (!rows.length) return '<tr><td colspan="8"><div class="empty-state">No hay resultados...</div></td></tr>';
    
    return rows.map(r => {
        const amtToPay = +r.amountToPay || 0;
        const amtPaid = +r.actualAmountPaid || 0;
        const rowPending = Math.max(0, amtToPay - amtPaid);
        const isPaid = rowPending <= 0 && amtToPay > 0;
        
        let statusBadge = '';
        let progressColor = 'var(--clr-primary)';
        
        if (isPaid) {
            statusBadge = '<span class="badge badge--income">✅ Liquidada</span>';
            progressColor = 'var(--clr-income)';
        } else if (amtPaid > 0) {
            statusBadge = '<span class="badge" style="background:var(--clr-accent); color:white">🌓 En Proceso</span>';
            progressColor = 'var(--clr-accent)';
        } else {
            statusBadge = '<span class="badge badge--expense">⏳ Vigente</span>';
        }

        const rowPercent = amtToPay > 0 ? Math.min(100, Math.round((amtPaid / amtToPay) * 100)) : 100;

        return `<tr data-id="${r.idDebt}">
          <td>${Ui.date(r.date)}</td>
          <td>
            <div style="display:flex; flex-direction:column; gap:4px">
                <span style="font-weight:600">${r.nameTypeDebt || '—'}</span>
                <span class="txt-muted" style="font-size:0.8rem">${r.nameCreditCardOrPersonalLoan || '—'}</span>
            </div>
          </td>
          <td><span class="txt-muted">${r.nameTypeSubjectDebt || '—'}</span></td>
          <td>
            <div style="display:flex; flex-direction:column; gap:4px">
                <div style="display:flex; justify-content:space-between; font-size:0.85rem">
                    <span>${Ui.money(amtPaid)}</span>
                    <span class="txt-muted">de ${Ui.money(amtToPay)}</span>
                </div>
                <div class="quincena-progress" style="height:6px">
                    <div class="q-bar" style="width: ${rowPercent}%; background: ${progressColor}"></div>
                </div>
            </div>
          </td>
          <td><span class="${isPaid ? 'amount-income' : 'amount-pending'}" style="font-weight:600">${Ui.money(rowPending)}</span></td>
          <td>${statusBadge}</td>
          <td class="txt-muted" style="font-size:0.85rem">${r.txtNotes || '—'}</td>
          <td>
            <div class="tbl-actions">
              <button class="tbl-btn" onclick="debtEdit(${r.idDebt})" title="Editar">✏️</button>
              <button class="tbl-btn tbl-btn--danger" onclick="debtDelete(${r.idDebt})" title="Eliminar">🗑</button>
            </div>
          </td>
        </tr>`;
    }).join('');
}

function debtFormHTML(data = {}) {
    const cats = window._debtCats;
    return `
      <div class="form-grid" style="display: grid; gap: var(--gap-md); grid-template-columns: 1fr 1fr;">
          <div class="form__group">
            <label class="form__label">Tipo de Deuda</label>
            <select id="f_idTypeDebt" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.typeDebt,'idTypeDebt','nameTypeDebt', data.idTypeDebt)}
            </select>
          </div>
          <div class="form__group">
            <label class="form__label">Tarjeta / Préstamo</label>
            <select id="f_idCreditCardOrPersonalLoan" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.creditCard,'idCreditCardOrPersonalLoan','nameCreditCardOrPersonalLoan', data.idCreditCardOrPersonalLoan)}
            </select>
          </div>
          <div class="form__group">
            <label class="form__label">Banco / Origen</label>
            <select id="f_idOrigin" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.origin,'idOrigin','nameOrigin', data.idOrigin)}
            </select>
          </div>
          <div class="form__group">
            <label class="form__label">¿De quién es?</label>
            <select id="f_typeSubjectDebt" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.subjectDebt,'typeSubjectDebt','nameTypeSubjectDebt', data.typeSubjectDebt)}
            </select>
          </div>
          <div class="form__group">
            <label class="form__label">Período de origen</label>
            <select id="f_idCatDate" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.dates,'idCatDate', r => `${r.date} (Q${r.numQuin||'?'})`, data.idCatDate)}
            </select>
          </div>
          <div class="form__group">
            <label class="form__label">Monto Total a Pagar</label>
            <input type="number" id="f_amountToPay" class="form__input" step="0.01" min="0" placeholder="0.00" value="${data.amountToPay||''}">
          </div>
          <div class="form__group" style="grid-column: span 2;">
            <label class="form__label">Monto Pagado hasta hoy</label>
            <div style="display:flex; gap:8px">
                <input type="number" id="f_actualAmountPaid" class="form__input" step="0.01" min="0" placeholder="0.00" value="${data.actualAmountPaid||''}">
                <button class="btn btn--ghost" style="padding:0 10px" onclick="document.getElementById('f_actualAmountPaid').value = document.getElementById('f_amountToPay').value" title="Marcar como liquidada">✅ Liquidar</button>
            </div>
          </div>
          <div class="form__group" style="grid-column: span 2;">
            <label class="form__label">Notas</label>
            <input type="text" id="f_txtNotes" class="form__input" placeholder="Ej: Pago mínimo tarjeta BBVA" value="${data.txtNotes||''}">
          </div>
      </div>`;
}

function debtCollect() {
    return {
        idTypeDebt:                 document.getElementById('f_idTypeDebt').value                 || null,
        idCreditCardOrPersonalLoan: document.getElementById('f_idCreditCardOrPersonalLoan').value  || null,
        idOrigin:                   document.getElementById('f_idOrigin').value                    || null,
        typeSubjectDebt:            document.getElementById('f_typeSubjectDebt').value             || null,
        idCatDate:                  document.getElementById('f_idCatDate').value                   || null,
        amountToPay:                document.getElementById('f_amountToPay').value                 || 0,
        actualAmountPaid:           document.getElementById('f_actualAmountPaid').value            || 0,
        txtNotes:                   document.getElementById('f_txtNotes').value                    || null,
    };
}

function debtAddFooter(action, id = null) {
    document.getElementById('modalFooterSlot')?.remove();
    const footer = document.createElement('div');
    footer.id = 'modalFooterSlot'; footer.className = 'modal__footer';
    if (action === 'new') {
        footer.innerHTML = `<button class="btn btn--ghost" onclick="Ui.closeModal()">Cancelar</button>
                            <button class="btn btn--primary" style="padding: 0.75rem 2rem" onclick="debtSave()">Guardar Deuda</button>`;
    } else {
        footer.innerHTML = `<button class="btn btn--ghost" onclick="Ui.closeModal()">Cancelar</button>
                            <button class="btn btn--primary" style="padding: 0.75rem 2rem" onclick="debtUpdate(${id})">Actualizar</button>`;
    }
    document.getElementById('modal').appendChild(footer);
}

window.debtNew = () => { 
    const cats = window._debtCats;
    const defaultDateId = Ui.getCurrentIdCatDate(cats.dates);
    Ui.openModal('➕ Nueva Deuda', debtFormHTML({ idCatDate: defaultDateId })); 
    debtAddFooter('new'); 
};

window.debtSave = async () => {
    const { valid, errors } = Ui.validate([
        { id: 'f_idTypeDebt',   label: 'Tipo de Deuda', required: true },
        { id: 'f_idCatDate',    label: 'Fecha',         required: true },
        { id: 'f_amountToPay',  label: 'Monto Total',   required: true },
    ]);
    if (!valid) return Ui.toast(`Campos requeridos: ${errors.join(', ')}`, 'error');

    try {
        await API.post('api/debt.php', debtCollect());
        Ui.toast('Deuda guardada ✅'); Ui.closeModal(); navigate('#debt');
    } catch(e) { Ui.toast(e.message, 'error'); }
};

window.debtEdit = (id) => {
    const row = window._debtRows.find(r => r.idDebt == id);
    if (!row) return;
    Ui.openModal('✏️ Editar Deuda', debtFormHTML(row)); debtAddFooter('edit', id);
};

window.debtUpdate = async (id) => {
    const { valid, errors } = Ui.validate([
        { id: 'f_idTypeDebt',   label: 'Tipo de Deuda', required: true },
        { id: 'f_idCatDate',    label: 'Fecha',         required: true },
        { id: 'f_amountToPay',  label: 'Monto Total',   required: true },
    ]);
    if (!valid) return Ui.toast(`Campos requeridos: ${errors.join(', ')}`, 'error');

    try {
        await API.put('api/debt.php', { ...debtCollect(), idDebt: id });
        Ui.toast('Deuda actualizada ✅'); Ui.closeModal(); navigate('#debt');
    } catch(e) { Ui.toast(e.message, 'error'); }
};

window.debtDelete = async (id) => {
    if (!Ui.confirm('¿Eliminar esta deuda?')) return;
    try {
        await API.delete('api/debt.php', { id });
        Ui.toast('Deuda eliminada'); navigate('#debt');
    } catch(e) { Ui.toast(e.message, 'error'); }
};
