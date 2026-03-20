/* ============================================
   YODA FINANZAS — income.js
   ============================================ */
registerModule('#income', async (outlet) => {
    await renderIncomeModule(outlet);
});

async function renderIncomeModule(outlet) {
    const [data, cats] = await Promise.all([
        API.get('api/income.php'),
        getCatalogs(),
    ]);

    const { rows, summary } = data;
    const totalActual = +summary.actual || 0;
    const totalExpected = +summary.expected || 0;
    const percent = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 100;

    const tableRows = rows.length
        ? rows.map(r => {
            const user = cats.users.find(u => u.idUser == r.idUser) || { avatar: '👤', nameUser: '?' };
            const statusClass = (+r.actualAmountReceived >= +r.amountToBeReceived) ? 'amount-income' : 'amount-pending';
            const statusIcon = (+r.actualAmountReceived >= +r.amountToBeReceived) ? '✅' : '⏳';
            
            return `
              <tr data-id="${r.idIncome}">
                <td>${Ui.date(r.date)}</td>
                <td><span class="badge badge--income">💵 ${r.nameTypeIncome || '—'}</span></td>
                <td><div class="user-chip" title="${user.nameUser}"><span>${user.avatar}</span></div></td>
                <td><span class="txt-muted">${r.nameTypeSubjectIncome || '—'}</span></td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:2px">
                        <span class="${statusClass}" style="font-size:1rem">${Ui.money(r.actualAmountReceived)}</span>
                        <span class="txt-muted" style="font-size:0.75rem">de ${Ui.money(r.amountToBeReceived)}</span>
                    </div>
                </td>
                <td><span class="txt-muted" style="font-size:0.8rem">${statusIcon} ${r.nameOrigin || '—'}</span></td>
                <td>
                  <div class="tbl-actions">
                    <button class="tbl-btn" onclick="incEdit(${r.idIncome})" title="Editar">✏️</button>
                    <button class="tbl-btn tbl-btn--danger" onclick="incDelete(${r.idIncome})" title="Eliminar">🗑</button>
                  </div>
                </td>
              </tr>`;
          }).join('')
        : `<tr><td colspan="7"><div class="empty-state">No hay ingresos registrados...</div></td></tr>`;

    outlet.innerHTML = `
      <div class="module-header" style="margin-bottom: var(--gap-lg);">
        <div class="module-header__left">
          <h2 class="module-header__title">💵 Ingresos</h2>
          <p class="module-header__subtitle">Gestión de entradas de capital</p>
        </div>
        <button class="btn btn--primary" onclick="incNew()">+ Nuevo Ingreso</button>
      </div>

      <div class="income-summary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--gap-md); margin-bottom: var(--gap-lg);">
        <div class="stat-card glass-card">
            <span class="stat-card__label">Recibido este mes</span>
            <span class="stat-card__value amount-income">${Ui.money(totalActual)}</span>
            <div class="quincena-progress" style="margin-top: 0.5rem; overflow:hidden">
                <div class="q-bar" style="width: ${Math.min(percent, 100)}%; height:100%; background: var(--clr-income); box-shadow: 0 0 10px var(--clr-income)"></div>
            </div>
            <span class="txt-muted" style="margin-top:0.25rem">${percent}% de lo esperado</span>
        </div>
        <div class="stat-card glass-card">
            <span class="stat-card__label">Pendiente por recibir</span>
            <span class="stat-card__value amount-pending">${Ui.money(Math.max(0, totalExpected - totalActual))}</span>
            <span class="txt-muted" style="margin-top:0.5rem">Total esperado: ${Ui.money(totalExpected)}</span>
        </div>
      </div>

      <div class="table-wrap">
        <div class="table-toolbar">
          <span class="table-toolbar__title">Detalle de Ingresos (${rows.length})</span>
          <input type="text" class="table-search" id="incSearch" placeholder="Cerca...">
        </div>
        <div style="overflow-x:auto">
          <table class="data-table" id="incTable">
            <thead>
              <tr>
                <th>Fecha</th><th>Categoría</th><th>👤</th><th>Para</th><th>Monto (Real/Esp)</th><th>Origen</th><th></th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>`;

    Ui.filterTable('incSearch', 'incTable');
    window._incRows = rows;
    window._incCats = cats;
}

function incFormHTML(data = {}) {
    const cats = window._incCats;
    return `
      <div class="form-grid" style="display: grid; gap: var(--gap-md); grid-template-columns: 1fr 1fr;">
          <div class="form__group">
            <label class="form__label">Categoría</label>
            <select id="f_idTypeIncome" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.typeIncome,'idTypeIncome','nameTypeIncome', data.idTypeIncome)}
            </select>
          </div>
          <div class="form__group">
            <label class="form__label">Origen / Fuente</label>
            <select id="f_idOrigin" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.origin,'idOrigin','nameOrigin', data.idOrigin)}
            </select>
          </div>
          <div class="form__group">
            <label class="form__label">¿Para quién?</label>
            <select id="f_typeSubjectIncome" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.subjectIncome,'typeSubjectIncome','nameTypeSubjectIncome', data.typeSubjectIncome)}
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
            <label class="form__label">Monto Esperado</label>
            <input type="number" id="f_amountExpected" class="form__input" step="0.01" min="0" placeholder="0.00" value="${data.amountToBeReceived||''}">
          </div>
          <div class="form__group">
            <label class="form__label">Monto Real Recibido</label>
            <input type="number" id="f_amountActual" class="form__input" step="0.01" min="0" placeholder="0.00" value="${data.actualAmountReceived||''}">
          </div>
          <div class="form__group" style="grid-column: span 2;">
            <label class="form__label">Notas</label>
            <input type="text" id="f_txtNotes" class="form__input" placeholder="Ej: Bono mensual" value="${data.txtNotes||''}">
          </div>
      </div>`;
}

function incCollect() {
    return {
        idTypeIncome:         document.getElementById('f_idTypeIncome').value      || null,
        idOrigin:             document.getElementById('f_idOrigin').value          || null,
        typeSubjectIncome:    document.getElementById('f_typeSubjectIncome').value  || null,
        idCatDate:            document.getElementById('f_idCatDate').value         || null,
        amountToBeReceived:   document.getElementById('f_amountExpected').value    || 0,
        actualAmountReceived: document.getElementById('f_amountActual').value      || 0,
        txtNotes:             document.getElementById('f_txtNotes').value          || null,
    };
}

function incAddFooter(action, id = null) {
    document.getElementById('modalFooterSlot')?.remove();
    const footer = document.createElement('div');
    footer.id = 'modalFooterSlot'; footer.className = 'modal__footer';
    if (action === 'new') {
        footer.innerHTML = `<button class="btn btn--ghost" onclick="Ui.closeModal()">Cancelar</button>
                            <button class="btn btn--primary" style="padding: 0.75rem 2rem" onclick="incSave()">Guardar Ingreso</button>`;
    } else {
        footer.innerHTML = `<button class="btn btn--ghost" onclick="Ui.closeModal()">Cancelar</button>
                            <button class="btn btn--primary" style="padding: 0.75rem 2rem" onclick="incUpdate(${id})">Actualizar</button>`;
    }
    document.getElementById('modal').appendChild(footer);
}

window.incNew = () => { Ui.openModal('💵 Nuevo Ingreso', incFormHTML()); incAddFooter('new'); };

window.incSave = async () => {
    try {
        await API.post('api/income.php', incCollect());
        Ui.toast('Ingreso guardado ✅'); Ui.closeModal(); navigate('#income');
    } catch(e) { Ui.toast(e.message, 'error'); }
};

window.incEdit = (id) => {
    const row = window._incRows.find(r => r.idIncome == id);
    if (!row) return;
    Ui.openModal('✏️ Editar Ingreso', incFormHTML(row)); incAddFooter('edit', id);
};

window.incUpdate = async (id) => {
    try {
        await API.put('api/income.php', { ...incCollect(), idIncome: id });
        Ui.toast('Ingreso actualizado ✅'); Ui.closeModal(); navigate('#income');
    } catch(e) { Ui.toast(e.message, 'error'); }
};

window.incDelete = async (id) => {
    if (!Ui.confirm('¿Eliminar este ingreso?')) return;
    try {
        await API.delete('api/income.php', { id });
        Ui.toast('Ingreso eliminado'); navigate('#income');
    } catch(e) { Ui.toast(e.message, 'error'); }
};

// Override options helper for objects with dynamic label function
const _origOptions = Ui.options.bind(Ui);
Ui.options = (list, valKey, labelKey, selected = '') => {
    if (!list || !Array.isArray(list)) return '';
    if (typeof labelKey === 'function') {
        return list.map(r => `<option value="${r[valKey]}" ${r[valKey] == selected ? 'selected' : ''}>${labelKey(r)}</option>`).join('');
    }
    return _origOptions(list, valKey, labelKey, selected);
};
