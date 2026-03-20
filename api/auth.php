<?php
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';

header('Access-Control-Allow-Origin: same-origin');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

Auth::start();
$method = $_SERVER['REQUEST_METHOD'];

// GET  → current session user
// POST → login
// DELETE → logout

if ($method === 'GET') {
    if (!Auth::isLoggedIn()) Response::error('No autenticado', 401);
    Response::success(Auth::currentUser());
}

if ($method === 'POST') {
    $body  = json_decode(file_get_contents('php://input'), true) ?? [];
    $email = trim($body['email'] ?? '');
    $pass  = trim($body['password'] ?? '');

    if (!$email || !$pass) Response::error('Email y contraseña requeridos');

    $db   = Database::get();
    $stmt = $db->prepare('SELECT * FROM TableUser WHERE emailUser = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($pass, $user['passwordHash'])) {
        Response::error('Credenciales incorrectas', 401);
    }

    Auth::login($user);
    Response::success(Auth::currentUser(), 'Bienvenido, ' . $user['nameUser']);
}

if ($method === 'DELETE') {
    Auth::start();
    Auth::logout();
    Response::success(null, 'Sesión cerrada');
}

Response::error('Método no soportado', 405);
