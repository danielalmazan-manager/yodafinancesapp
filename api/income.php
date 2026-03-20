<?php
require_once __DIR__ . '/../autoload.php';
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Auth.php';

use App\Controllers\IncomeController;
use App\Repositories\IncomeRepository;
use App\Middleware\AuthMiddleware;
use App\Core\Request;

AuthMiddleware::handle();

$incomeRepo = new IncomeRepository();
$controller = new IncomeController($incomeRepo);

$method = Request::method();

switch ($method) {
    case 'GET':
        $controller->index();
        break;
    case 'POST':
        $controller->store();
        break;
    case 'PUT':
        $controller->update();
        break;
    case 'DELETE':
        $controller->destroy();
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no soportado']);
        break;
}
