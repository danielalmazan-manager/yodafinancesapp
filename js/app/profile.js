/* ============================================
   YODA FINANZAS — profile.js
   User settings and Partnership management
   ============================================ */
registerModule('#profile', async (outlet) => {
    await renderProfileModule(outlet);
});

async function renderProfileModule(outlet) {
    const user = window.YODA_USER;
    const partnership = await API.get('api/partnership.php');

    outlet.innerHTML = `
      <div class="module-header" style="margin-bottom: var(--gap-lg);">
        <div class="module-header__left">
          <h2 class="module-header__title">👤 Mi Perfil</h2>
          <p class="module-header__subtitle">Configuración y vinculación de pareja</p>
        </div>
      </div>

      <div class="profile-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--gap-lg);">
        <!-- USER INFO -->
        <div class="glass-card" style="padding: 2rem; display: flex; flex-direction: column; align-items: center; text-align: center;">
            <div class="profile-avatar-large" style="width: 100px; height: 100px; border-radius: 50%; background: var(--clr-primary); display: flex; align-items: center; justify-content: center; font-size: 3rem; margin-bottom: 1.5rem; border: 4px solid var(--clr-bg-surface); box-shadow: var(--shadow-md);">
                ${user.avatar}
            </div>
            <h3 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">${user.name}</h3>
            <p class="txt-muted" style="margin-bottom: 1.5rem;">${user.email}</p>
            <div class="badge badge--income" style="font-size: 0.8rem;">${user.role === 'admin' ? '👑 Administrador' : '👤 Usuario'}</div>
        </div>

        <!-- PARTNERSHIP INFO -->
        <div class="glass-card" style="padding: 2rem;">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 10px;">
                <span>🤝 Mi Pareja</span>
                ${partnership.hasPartner ? '<span class="badge badge--income" style="font-size: 0.7rem;">Vinculado</span>' : '<span class="badge badge--pending" style="font-size: 0.7rem;">Sin Vincular</span>'}
            </h3>

            <div id="partnershipContent">
                ${partnership.hasPartner ? renderPartnerActive(partnership.partner) : renderPartnerInvite()}
            </div>
        </div>
      </div>
    `;
}

function renderPartnerActive(partner) {
    return `
        <div style="display: flex; align-items: center; gap: 15px; padding: 1.5rem; background: var(--clr-bg-2); border-radius: var(--radius-md); border: 1px solid var(--clr-border); margin-bottom: 1.5rem;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--clr-bg-surface); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; border: 2px solid var(--clr-primary);">
                ${partner.avatar}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 700;">${partner.name}</div>
                <div class="txt-muted" style="font-size: 0.85rem;">${partner.email}</div>
            </div>
        </div>
        <p class="txt-muted" style="font-size: 0.85rem; margin-bottom: 1.5rem;">
            Tu información financiera se comparte con <b>${partner.name}</b> para el cálculo de proyecciones y gastos compartidos.
        </p>
        <button class="btn btn--danger-ghost" style="width: 100%" onclick="unlinkPartner()">Desvincular Cuenta</button>
    `;
}

function renderPartnerInvite() {
    return `
        <p class="txt-muted" style="font-size: 0.85rem; margin-bottom: 1.5rem;">
            Vincula tu cuenta con tu pareja para gestionar finanzas juntos, ver deudas compartidas y proyectar su saldo acumulado.
        </p>
        <div class="form__group" style="margin-bottom: 1.5rem;">
            <label class="form__label">Correo de tu pareja</label>
            <input type="email" id="partnerEmailInp" class="form__input" placeholder="ejemplo@correo.com">
        </div>
        <button class="btn btn--primary" style="width: 100%" onclick="invitePartner()">Vincular con Pareja</button>
        <p class="txt-muted" style="font-size: 0.75rem; margin-top: 1rem; text-align: center;">
            * Tu pareja ya debe tener una cuenta registrada en YoDa.
        </p>
    `;
}

async function invitePartner() {
    const email = document.getElementById('partnerEmailInp').value.trim();
    if (!email) return Ui.toast('Por favor ingresa un correo', 'error');

    try {
        await API.post('api/partnership.php', { email });
        Ui.toast('¡Felicidades! Ahora son partners 🤝');
        navigate('#profile');
    } catch (e) {
        Ui.toast(e.message, 'error');
    }
}

async function unlinkPartner() {
    if (!Ui.confirm('¿Estás seguro de que quieres desvincular tu cuenta? Dejarán de compartir proyecciones.')) return;

    try {
        await API.delete('api/partnership.php');
        Ui.toast('Vínculo eliminado');
        navigate('#profile');
    } catch (e) {
        Ui.toast(e.message, 'error');
    }
}
