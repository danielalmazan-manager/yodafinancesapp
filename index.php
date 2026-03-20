<?php
require_once __DIR__ . '/core/Auth.php';
Auth::start();
if (Auth::isLoggedIn()) {
    header('Location: app.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Yoda Finanzas — Gestión financiera para parejas">
    <title>Yoda · Inicia Sesión</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/app.css">
</head>
<body class="login-body">
    <div class="login-bg">
        <div class="login-bg__glow login-bg__glow--1"></div>
        <div class="login-bg__glow login-bg__glow--2"></div>
        <div class="login-bg__glow login-bg__glow--3"></div>
    </div>

    <div class="login-wrap">
        <!-- Branding -->
        <div class="login-brand">
            <div class="login-brand__icon">💰</div>
            <h1 class="login-brand__name gradient-text">Yoda Finanzas</h1>
            <p class="login-brand__tagline">Administración financiera para dos ❤️</p>
        </div>

        <!-- Login Card -->
        <div class="login-card glass-card">
            <h2 class="login-card__title">Bienvenido de vuelta</h2>
            <p class="login-card__subtitle">Inicia sesión para continuar</p>

            <form id="loginForm" class="login-form" novalidate>
                <div class="form__group">
                    <label for="loginEmail" class="form__label">Correo electrónico</label>
                    <div class="input-wrap">
                        <span class="input-wrap__icon">✉️</span>
                        <input type="email" id="loginEmail" name="email" class="form__input input-wrap__field"
                               placeholder="tu@correo.com" required autocomplete="email">
                    </div>
                </div>

                <div class="form__group">
                    <label for="loginPassword" class="form__label">Contraseña</label>
                    <div class="input-wrap">
                        <span class="input-wrap__icon">🔒</span>
                        <input type="password" id="loginPassword" name="password" class="form__input input-wrap__field"
                               placeholder="••••••••" required autocomplete="current-password">
                        <button type="button" class="input-wrap__toggle" id="togglePass" aria-label="Ver contraseña">👁</button>
                    </div>
                </div>

                <div id="loginError" class="login-error" role="alert" aria-live="polite"></div>

                <button type="submit" class="btn btn--primary btn--full login-btn" id="loginSubmit">
                    <span class="login-btn__text">Entrar</span>
                    <span class="login-btn__spinner" aria-hidden="true"></span>
                </button>
            </form>

            <div class="login-hint">
                <p>¿Primera vez? Usa las credenciales que te compartió tu pareja 💑</p>
            </div>
        </div>

        <p class="login-footer">© 2026 Yoda · NexusLogic IT</p>
    </div>

    <script>
    const form     = document.getElementById('loginForm');
    const errBox   = document.getElementById('loginError');
    const submitBtn= document.getElementById('loginSubmit');
    const toggleBtn= document.getElementById('togglePass');
    const passInput= document.getElementById('loginPassword');

    toggleBtn.addEventListener('click', () => {
        const isText = passInput.type === 'text';
        passInput.type  = isText ? 'password' : 'text';
        toggleBtn.textContent = isText ? '👁' : '🙈';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errBox.textContent = '';
        errBox.classList.remove('active');
        submitBtn.classList.add('loading');

        const email    = document.getElementById('loginEmail').value.trim();
        const password = passInput.value;

        try {
            const res  = await fetch('api/auth.php', {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (data.success) {
                submitBtn.classList.remove('loading');
                submitBtn.querySelector('.login-btn__text').textContent = '✓ Entrando…';
                setTimeout(() => window.location.href = 'app.php', 400);
            } else {
                throw new Error(data.message || 'Error al iniciar sesión');
            }
        } catch (err) {
            errBox.textContent = err.message;
            errBox.classList.add('active');
            submitBtn.classList.remove('loading');
        }
    });
    </script>
</body>
</html>
