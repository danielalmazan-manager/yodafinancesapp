<?php

namespace App\Core;

class Request {
    public static function method(): string {
        return $_SERVER['REQUEST_METHOD'];
    }

    public static function body(): array {
        return json_decode(file_get_contents('php://input'), true) ?? [];
    }

    public static function query(string $key = null, $default = null) {
        if ($key === null) return $_GET;
        return $_GET[$key] ?? $default;
    }
}
