/* ============================================
   YODA FINANZAS — goals.js
   ============================================ */
registerModule('#goals', async (outlet) => {
    await renderGoalsModule(outlet);
});

async function renderGoalsModule(outlet) {
    const [data, cats] = await Promise.all([
        API.get('api/goals.php'),
        getCatalogs(),
    ]);

    const { rows, summary } = data;
    const totalTarget = +summary.totalTarget || 0;
    const totalSaved  = +summary.totalSaved || 0;
    const globalPercent = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

    const tableRows = rows.length
        ? rows.map(r => {
            const target = +r.targetAmount || 0;
            const saved = +r.amountDeposited || 0;
            const pending = Math.max(0, target - saved);
            const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 100;
            const isCompleted = percent >= 100;

            const badge = isCompleted
                ? `<span class="badge badge--income">🎯 Completada</span>`
                : `<span class="badge badge--pending">🚀 En marcha</span>`;

            return `<tr data-id="${r.idGoal}">
              <td>${Ui.date(r.date)}</td>
              <td>
                <div style="display:flex; flex-direction:column; gap:4px">
                    <span style="font-weight:600">${r.nameTypeGoal || '—'}</span>
                    <span class="txt-muted" style="font-size:0.8rem">${r.namePlanGoal || '—'}</span>
                </div>
              </td>
              <td><span class="txt-muted">${r.nameTypeSubjectGoal || '—'}</span></td>
              <td>
                <div style="display:flex; flex-direction:column; gap:4px">
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem">
                        <span>${Ui.money(saved)}</span>
                        <span class="txt-muted">de ${Ui.money(target)}</span>
                    </div>
                    <div class="quincena-progress" style="height:6px">
                        <div class="q-bar" style="width: ${percent}%; background: ${isCompleted ? 'var(--clr-income)' : 'var(--clr-primary)'}"></div>
                    </div>
                </div>
              </td>
              <td><span class="${isCompleted ? 'amount-income' : 'amount-pending'}" style="font-weight:600">${Ui.money(pending)}</span></td>
              <td>${badge}</td>
              <td class="txt-muted" style="font-size:0.85rem">${r.txtDescription || '—'}</td>
              <td>
                <div class="tbl-actions">
                  <button class="tbl-btn" onclick="goalEdit(${r.idGoal})" title="Editar">✏️</button>
                  <button class="tbl-btn tbl-btn--danger" onclick="goalDelete(${r.idGoal})" title="Eliminar">🗑</button>
                </div>
              </td>
            </tr>`;
          }).join('')
        : `<tr><td colspan="8"><div class="empty-state"><div class="empty-state__icon">🎯</div><p class="empty-state__title">Sin metas registradas</p><p class="empty-state__text">Define tus objetivos y empieza a ahorrar hoy mismo.</p></div></td></tr>`;

    outlet.innerHTML = `
      <div class="module-header" style="margin-bottom: var(--gap-lg);">
        <div class="module-header__left">
          <h2 class="module-header__title">🎯 Metas y Ahorro</h2>
          <p class="module-header__subtitle">Visualiza y alcanza tus sueños financieros</p>
        </div>
        <button class="btn btn--primary" onclick="goalNew()">+ Nueva Meta</button>
      </div>

      <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--gap-md); margin-bottom: var(--gap-lg);">
        <div class="stat-card glass-card stat-card--total-goal" style="grid-column: span 2">
            <span class="stat-card__label">Progreso Global de Ahorro</span>
            <div style="display:flex; align-items:baseline; gap:10px; margin-bottom:1rem">
                <span class="stat-card__value" style="color:var(--clr-primary); font-size:2.5rem">${Ui.money(totalSaved)}</span>
                <span class="txt-muted">acumulados de ${Ui.money(totalTarget)}</span>
            </div>
            <div class="quincena-progress" style="height: 12px; margin-top:1.5rem; overflow:hidden">
                <div class="q-bar" style="width: ${globalPercent}%; height:100%; background: var(--clr-goal); box-shadow: 0 0 10px var(--clr-goal)"></div>
            </div>
            <div style="text-align:right; margin-top:5px; font-weight:700; color:var(--clr-primary)">${globalPercent}% Alcanzado</div>
        </div>
        <div class="stat-grid" style="display:grid; grid-template-rows: 1fr 1fr; gap:var(--gap-md)">
            <div class="stat-card glass-card">
                <span class="stat-card__label">Metas Activas</span>
                <span class="stat-card__value" style="font-size:1.5rem">${rows.filter(r => (r.amountDeposited||0) < (r.targetAmount||0)).length}</span>
            </div>
            <div class="stat-card glass-card">
                <span class="stat-card__label">Metas Cumplidas</span>
                <span class="stat-card__value amount-income" style="font-size:1.5rem">${rows.filter(r => (r.amountDeposited||0) >= (r.targetAmount||0)).length}</span>
            </div>
        </div>
      </div>

      <div class="table-wrap">
        <div class="table-toolbar">
          <span class="table-toolbar__title">Mis Metas (${rows.length})</span>
          <input type="text" class="table-search" id="goalSearch" placeholder="Buscar…">
        </div>
        <div style="overflow-x:auto">
          <table class="data-table" id="goalTable">
            <thead>
              <tr>
                <th>Fecha</th><th>Meta / Plan</th><th>Responsable</th>
                <th style="width:250px">Progreso</th><th>Faltante</th><th>Estado</th><th>Descripción</th><th></th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>`;

    Ui.filterTable('goalSearch', 'goalTable');
    window._goalRows = rows;
    window._goalCats = cats;
}

function goalFormHTML(data = {}) {
    const cats = window._goalCats;
    return `
      <div class="form-grid" style="display: grid; gap: var(--gap-md); grid-template-columns: 1fr 1fr;">
          <div class="form__group">
            <label class="form__label">¿Qué meta es?</label>
            <select id="f_idTypeGoal" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.typeGoal,'idTypeGoal','nameTypeGoal', data.idTypeGoal)}
            </select>
          </div>
          <div class="form__group">
            <label class="form__label">Plan de ahorro</label>
            <select id="f_idPlanGoal" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.planGoal,'idPlanGoal','namePlanGoal', data.idPlanGoal)}
            </select>
          </div>
          <div class="form__group">
            <label class="form__label">¿De quién es?</label>
            <select id="f_typeSubjectGoal" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.subjectGoal,'typeSubjectGoal','nameTypeSubjectGoal', data.typeSubjectGoal)}
            </select>
          </div>
          <div class="form__group">
            <label class="form__label">Período Inicio</label>
            <select id="f_idCatDate" class="form__input">
              <option value="">-- Selecciona --</option>
              ${Ui.options(cats.dates,'idCatDate', r => `${r.date} (Q${r.numQuin||'?'})`, data.idCatDate)}
            </select>
          </div>
          <div class="form__group">
            <label class="form__label">Monto Meta (Target)</label>
            <input type="number" id="f_targetAmount" class="form__input" step="0.01" min="0" placeholder="0.00" value="${data.targetAmount||''}">
          </div>
          <div class="form__group">
            <label class="form__label">Monto Ahorrado</label>
            <input type="number" id="f_amountDeposited" class="form__input" step="0.01" min="0" placeholder="0.00" value="${data.amountDeposited||''}">
          </div>
          <div class="form__group" style="grid-column: span 2;">
            <label class="form__label">Descripción / Notas</label>
            <input type="text" id="f_txtDescription" class="form__input" placeholder="Ej: Ahorro para vacaciones en Cancún" value="${data.txtDescription||''}">
          </div>
      </div>`;
}

function goalCollect() {
    return {
        idTypeGoal:       document.getElementById('f_idTypeGoal').value       || null,
        idPlanGoal:       document.getElementById('f_idPlanGoal').value       || null,
        typeSubjectGoal:  document.getElementById('f_typeSubjectGoal').value  || null,
        idCatDate:        document.getElementById('f_idCatDate').value        || null,
        targetAmount:     document.getElementById('f_targetAmount').value     || 0,
        amountDeposited:  document.getElementById('f_amountDeposited').value  || 0,
        txtDescription:   document.getElementById('f_txtDescription').value   || null,
    };
}

function goalAddFooter(action, id = null) {
    document.getElementById('modalFooterSlot')?.remove();
    const footer = document.createElement('div');
    footer.id = 'modalFooterSlot'; footer.className = 'modal__footer';
    if (action === 'new') {
        footer.innerHTML = `<button class="btn btn--ghost" onclick="Ui.closeModal()">Cancelar</button>
                            <button class="btn btn--primary" style="padding: 0.75rem 2rem" onclick="goalSave()">Crear Meta</button>`;
    } else {
        footer.innerHTML = `<button class="btn btn--ghost" onclick="Ui.closeModal()">Cancelar</button>
                            <button class="btn btn--primary" style="padding: 0.75rem 2rem" onclick="goalUpdate(${id})">Actualizar</button>`;
    }
    document.getElementById('modal').appendChild(footer);
}

window.goalNew = () => { Ui.openModal('🎯 Nueva Meta', goalFormHTML()); goalAddFooter('new'); };

window.goalSave = async () => {
    try {
        await API.post('api/goals.php', goalCollect());
        Ui.toast('Meta guardada ✅'); Ui.closeModal(); navigate('#goals');
    } catch(e) { Ui.toast(e.message, 'error'); }
};

window.goalEdit = (id) => {
    const row = window._goalRows.find(r => r.idGoal == id);
    if (!row) return;
    Ui.openModal('✏️ Editar Meta', goalFormHTML(row)); goalAddFooter('edit', id);
};

window.goalUpdate = async (id) => {
    try {
        await API.put('api/goals.php', { ...goalCollect(), idGoal: id });
        Ui.toast('Meta actualizada ✅'); Ui.closeModal(); navigate('#goals');
    } catch(e) { Ui.toast(e.message, 'error'); }
};

window.goalDelete = async (id) => {
    if (!Ui.confirm('¿Eliminar esta meta?')) return;
    try {
        await API.delete('api/goals.php', { id });
        Ui.toast('Meta eliminada'); navigate('#goals');
    } catch(e) { Ui.toast(e.message, 'error'); }
};
