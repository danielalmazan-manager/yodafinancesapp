<?php

namespace App\Core;

class Controller {
    protected function json($data, int $status = 200): void {
        header('Content-Type: application/json');
        http_response_code($status);
        echo json_encode($data);
        exit;
    }

    protected function success($data = null, string $message = 'Success'): void {
        $this->json([
            'success' => true,
            'message' => $message,
            'data'    => $data
        ]);
    }

    protected function error(string $message = 'Error', int $status = 400): void {
        $this->json([
            'success' => false,
            'message' => $message
        ], $status);
    }
}
