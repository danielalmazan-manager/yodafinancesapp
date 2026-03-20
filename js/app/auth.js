/* ============================================
   YODA FINANZAS — auth.js
   Logout handler
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
            await API.delete('api/auth.php');
            window.location.href = 'index.php';
        } catch {
            window.location.href = 'index.php';
        }
    });
});
