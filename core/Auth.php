<?php
class Auth {
    private static int $maxIdleSeconds = 28800; // 8 hours

    public static function start(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_name('YODA_SESS');
            session_start();
        }
        // Auto-logout on idle
        if (isset($_SESSION['last_activity'])) {
            if (time() - $_SESSION['last_activity'] > self::$maxIdleSeconds) {
                self::logout();
                return;
            }
        }
        $_SESSION['last_activity'] = time();
    }

    public static function login(array $user): void {
        session_regenerate_id(true);
        $_SESSION['user_id']   = $user['idUser'];
        $_SESSION['user_name'] = $user['nameUser'];
        $_SESSION['user_email']= $user['emailUser'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['user_avatar']= $user['avatar'];
        $_SESSION['last_activity'] = time();
    }

    public static function logout(): void {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
    }

    public static function isLoggedIn(): bool {
        return !empty($_SESSION['user_id']);
    }

    public static function requireLogin(): void {
        if (!self::isLoggedIn()) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'No autenticado']);
            exit;
        }
    }

    public static function currentUser(): array {
        return [
            'id'     => $_SESSION['user_id']   ?? null,
            'name'   => $_SESSION['user_name']  ?? null,
            'email'  => $_SESSION['user_email'] ?? null,
            'role'   => $_SESSION['user_role']  ?? null,
            'avatar' => $_SESSION['user_avatar']?? '😊',
        ];
    }

    public static function getPartnerId(PDO $db): ?int {
        $uid = self::currentUser()['id'];
        if (!$uid) return null;
        
        $stmt = $db->prepare("
            SELECT (CASE WHEN idUser1 = ? THEN idUser2 ELSE idUser1 END) as partnerId 
            FROM TablePartnership 
            WHERE (idUser1 = ? OR idUser2 = ?) AND isActive = 1 
            LIMIT 1
        ");
        $stmt->execute([$uid, $uid, $uid]);
        $res = $stmt->fetch();
        return $res ? (int)$res['partnerId'] : null;
    }

    public static function getAllowedUserIds(PDO $db): array {
        $uid = self::currentUser()['id'];
        if (!$uid) return [];
        $pid = self::getPartnerId($db);
        return $pid ? [$uid, $pid] : [$uid];
    }
}
