<?php
require_once __DIR__ . '/../autoload.php';
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Auth.php';

use App\Controllers\IncomeController;
use App\Repositories\IncomeRepository;
use App\Core\Request;

// Mock session for testing
session_start();
$_SESSION['user_id'] = 1;
$_SESSION['user_name'] = 'Test User';

echo "Testing IncomeRepository::findAll...\n";
$repo = new IncomeRepository();
try {
    $rows = $repo->findAll();
    echo "Success: Found " . count($rows) . " rows.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\nTesting IncomeController::index...\n";
$controller = new IncomeController($repo);
try {
    // We capture output since it calls exit;
    ob_start();
    $controller->index();
    $output = ob_get_clean();
    echo "Success: Controller executed. Output:\n";
    echo $output . "\n";
} catch (Exception $e) {
    ob_end_clean();
    echo "Error: " . $e->getMessage() . "\n";
}
echo "\nVerification complete.\n";
