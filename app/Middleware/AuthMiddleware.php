<?php

namespace App\Middleware;

use Auth;
use App\Core\Request;

class AuthMiddleware {
    public static function handle(): void {
        Auth::start();
        if (!Auth::isLoggedIn()) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'No autenticado']);
            exit;
        }
    }
}
