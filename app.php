<?php
require_once __DIR__ . '/core/Auth.php';
Auth::start();
if (!Auth::isLoggedIn()) {
    header('Location: index.php');
    exit;
}
$user = Auth::currentUser();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Yoda Finanzas — Dashboard financiero">
    <meta name="theme-color" content="#6c63ff">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Yoda Finanzas">
    <title>Yoda · <?= htmlspecialchars($user['name']) ?></title>
    <link rel="manifest" href="manifest.json">
    <link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="assets/icons/icon-192.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/app.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="app-body">

<!-- ======= OFFLINE BANNER ======= -->
<div class="offline-banner" id="offlineBanner" role="status" aria-live="polite">
    <span class="offline-banner__icon">📡</span>
    <span class="offline-banner__msg">Sin conexión — mostrando datos locales. Los cambios se sincronizarán al reconectar.</span>
    <span class="offline-banner__badge" id="syncBadge" style="display:none"></span>
</div>

<!-- ======= TOP NAV ======= -->
<nav class="top-nav glass-card">
    <div class="top-nav__inner">
        <div class="top-nav__logo">
            <span class="top-nav__logo-icon">C</span>
            <span class="top-nav__logo-text">Yoda</span>
        </div>
        
        <ul class="top-nav__menu">
            <li class="top-nav__item">
                <a href="#dashboard" class="top-nav__link active" data-module="dashboard">RESUMEN</a>
            </li>
            <li class="top-nav__item">
                <a href="#income" class="top-nav__link" data-module="income">INGRESOS</a>
            </li>
            <li class="top-nav__item">
                <a href="#expenses" class="top-nav__link" data-module="expenses">GASTOS</a>
            </li>
            <li class="top-nav__item">
                <a href="#debt" class="top-nav__link" data-module="debt">DEUDAS</a>
            </li>
            <li class="top-nav__item">
                <a href="#goals" class="top-nav__link" data-module="goals">METAS</a>
            </li>
        </ul>

        <div class="top-nav__actions">
            <button id="themeToggle" class="theme-toggle" aria-label="Cambiar Tema">
                <span class="icon-sun">☀️</span>
                <span class="icon-moon">🌙</span>
            </button>
            <div class="user-profile">
                <div class="user-profile__info">
                    <span class="user-profile__name"><?= htmlspecialchars($user['name']) ?></span>
                </div>
                <div class="user-profile__avatar-wrap">
                    <?php if (strpos($user['avatar'], 'http') === 0 || strpos($user['avatar'], '/') === 0): ?>
                        <img src="<?= $user['avatar'] ?>" alt="Avatar" class="user-profile__avatar">
                    <?php else: ?>
                        <span class="user-profile__avatar-text"><?= $user['avatar'] ?></span>
                    <?php endif; ?>
                </div>
            </div>
            <button id="logoutBtn" class="logout-btn">Cerrar Sesión</button>
        </div>
    </div>
</nav>

<!-- ======= BOTTOM NAV (Mobile) ======= -->
<nav class="bottom-nav">
    <a href="#dashboard" class="bottom-nav__link active" data-module="dashboard">
        <span class="bottom-nav__icon">🏠</span>
        <span>INICIO</span>
    </a>
    <a href="#income" class="bottom-nav__link" data-module="income">
        <span class="bottom-nav__icon">💵</span>
        <span>INGRESOS</span>
    </a>
    <a href="#expenses" class="bottom-nav__link" data-module="expenses">
        <span class="bottom-nav__icon">🛒</span>
        <span>GASTOS</span>
    </a>
    <a href="#debt" class="bottom-nav__link" data-module="debt">
        <span class="bottom-nav__icon">💳</span>
        <span>DEUDAS</span>
    </a>
    <a href="#goals" class="bottom-nav__link" data-module="goals">
        <span class="bottom-nav__icon">🎯</span>
        <span>METAS</span>
    </a>
</nav>

<!-- ======= FAB ======= -->
<div class="fab-container" id="fabContainer">
    <div class="fab-menu">
        <a href="javascript:void(0)" class="fab-item" onclick="toggleFab(); incNew()">
            <span class="fab-item__label">Nuevo Ingreso</span>
            <span class="fab-item__btn">💵</span>
        </a>
        <a href="javascript:void(0)" class="fab-item" onclick="toggleFab(); expNew()">
            <span class="fab-item__label">Registrar Gasto</span>
            <span class="fab-item__btn">🛒</span>
        </a>
        <a href="javascript:void(0)" class="fab-item" onclick="toggleFab(); debtNew()">
            <span class="fab-item__label">Nueva Deuda</span>
            <span class="fab-item__btn">💳</span>
        </a>
    </div>
    <button class="fab-main" id="fabMain" onclick="toggleFab()">+</button>
</div>

<!-- ======= MAIN ======= -->
<div class="app-viewport">
    <main class="app-content" id="app-outlet">
        <!-- Content injected here -->
        <div class="app-loader" id="appLoader">
            <div class="app-loader__spinner"></div>
        </div>
    </main>
</div>

<!-- ======= MODAL ======= -->
<div class="modal-backdrop" id="modalBackdrop" aria-hidden="true">
    <div class="modal glass-card" id="modal" role="dialog" aria-modal="true">
        <div class="modal__header">
            <h3 class="modal__title" id="modalTitle">Modal</h3>
            <button class="modal__close" id="modalClose" aria-label="Cerrar">✕</button>
        </div>
        <div class="modal__body" id="modalBody"></div>
    </div>
</div>

<!-- ======= TOAST ======= -->
<div class="toast-container" id="toastContainer" aria-live="polite"></div>

<!-- Inject server data -->
<script>
window.YODA_USER = <?= json_encode($user) ?>;
</script>

<!-- Core JS modules -->
<script src="js/app/core.js"></script>
<script src="js/app/dashboard.js"></script>
<script src="js/app/income.js"></script>
<script src="js/app/expenses.js"></script>
<script src="js/app/debt.js"></script>
<script src="js/app/goals.js"></script>
<script src="js/app/auth.js"></script>
<script src="js/app/offline.js"></script>

<script>
// ---- Service Worker Registration ----
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            // Check for SW update
            reg.addEventListener('updatefound', () => {
                const newSW = reg.installing;
                newSW.addEventListener('statechange', () => {
                    if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available
                        if (confirm('🔄 Nueva versión disponible. ¿Actualizar ahora?')) {
                            newSW.postMessage({ type: 'SKIP_WAITING' });
                            window.location.reload();
                        }
                    }
                });
            });
        } catch(e) {
            console.warn('Service Worker no registrado:', e);
        }
    });

    // Online/Offline status
    const update = () => {
        const banner = document.getElementById('offlineBanner');
        if (banner) banner.style.display = navigator.onLine ? 'none' : 'flex';
    };
    window.addEventListener('online',  update);
    window.addEventListener('offline', update);
    update();
}
</script>
</body>
</html>
