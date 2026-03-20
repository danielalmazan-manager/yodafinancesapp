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

    const tableRows = rows.length
        ? rows.map(r => {
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
                        <span class="txt-muted">of ${Ui.money(amtToPay)}</span>
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
          }).join('')
        : `<tr><td colspan="8"><div class="empty-state"><div class="empty-state__icon">💳</div><p class="empty-state__title">Sin deudas registradas</p><p class="empty-state__text">¡Bien hecho! O empieza registrando una deuda.</p></div></td></tr>`;

    outlet.innerHTML = `
      <div class="module-header" style="margin-bottom: var(--gap-lg);">
        <div class="module-header__left">
          <h2 class="module-header__title">💳 Deudas</h2>
          <p class="module-header__subtitle">Seguimiento de saldos y compromisos</p>
        </div>
        <button class="btn btn--primary" onclick="debtNew()">+ Registrar Deuda</button>
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
        <div class="table-toolbar">
          <span class="table-toolbar__title">Detalle de Deudas (${rows.length})</span>
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
    window._debtRows = rows;
    window._debtCats = cats;
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
                <button class="btn btn--ghost" style="padding:0 10px" onclick="document.getElementById('f_actualAmountPaid').value = document.getElementById('f_amountToPay').value" title="Marcar como liquidada">✅ Liquidad</button>
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

window.debtNew = () => { Ui.openModal('➕ Nueva Deuda', debtFormHTML()); debtAddFooter('new'); };

window.debtSave = async () => {
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
