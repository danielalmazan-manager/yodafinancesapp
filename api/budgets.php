<?php
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';

Auth::start();
Auth::requireLogin();

$db = Database::get();
$method = $_SERVER['REQUEST_METHOD'];
$currentUserId = Auth::currentUser()['id'];

if ($method === 'GET') {
    $allowedIds = Auth::getAllowedUserIds($db);
    $allowedIdsStr = implode(',', $allowedIds);
    
    // Get all budgets with current month spending (combined for the partnership)
    $stmt = $db->prepare("
        SELECT
            MAX(b.idBudget) as idBudget,
            SUM(COALESCE(b.budgetAmount, 0)) as budgetAmount,
            MAX(COALESCE(b.alertPercentage, 80)) as alertPercentage,
            cte.idTypeExpense,
            cte.nameTypeExpense,
            COALESCE(SUM(te.amountToPay), 0) as currentSpent,
            CASE
                WHEN SUM(COALESCE(b.budgetAmount, 0)) > 0 THEN ROUND((COALESCE(SUM(te.amountToPay), 0) / SUM(COALESCE(b.budgetAmount, 0))) * 100)
                ELSE 0
            END as usagePercentage,
            CASE
                WHEN SUM(COALESCE(b.budgetAmount, 0)) > 0 AND (COALESCE(SUM(te.amountToPay), 0) / SUM(COALESCE(b.budgetAmount, 0))) * 100 >= MAX(COALESCE(b.alertPercentage, 80)) THEN 1
                ELSE 0
            END as isAlert
        FROM CatalogTypeExpense cte
        LEFT JOIN TableBudget b ON cte.idTypeExpense = b.idTypeExpense AND b.idUser IN ($allowedIdsStr) AND b.isActive = 1
        LEFT JOIN TableExpenses te ON cte.idTypeExpense = te.idTypeExpense
            AND te.idUser IN ($allowedIdsStr)
            AND te.idCatDate IN (
                SELECT idCatDate FROM CatalogDate
                WHERE YEAR(date) = YEAR(NOW()) AND MONTH(date) = MONTH(NOW())
            )
        GROUP BY cte.idTypeExpense
        ORDER BY cte.nameTypeExpense
    ");
    $stmt->execute();
    $budgets = $stmt->fetchAll();

    // Calculate totals
    $totalBudget = 0;
    $totalSpent = 0;
    $alertCount = 0;

    foreach ($budgets as $budget) {
        $totalBudget += floatval($budget['budgetAmount']);
        $totalSpent += floatval($budget['currentSpent']);
        if ($budget['isAlert']) $alertCount++;
    }

    Response::success([
        'budgets' => $budgets,
        'summary' => [
            'totalBudget' => $totalBudget,
            'totalSpent' => $totalSpent,
            'remaining' => max(0, $totalBudget - $totalSpent),
            'overallPercentage' => $totalBudget > 0 ? round(($totalSpent / $totalBudget) * 100) : 0,
            'alertCount' => $alertCount
        ]
    ]);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $idTypeExpense = intval($body['idTypeExpense'] ?? 0);
    $budgetAmount = floatval($body['budgetAmount'] ?? 0);
    $alertPercentage = intval($body['alertPercentage'] ?? 80);

    if (!$idTypeExpense || $budgetAmount <= 0) {
        Response::error('Datos inválidos');
    }

    // Insert or update budget for the current user
    $stmt = $db->prepare("
        INSERT INTO TableBudget (idUser, idTypeExpense, budgetAmount, alertPercentage)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            budgetAmount = VALUES(budgetAmount),
            alertPercentage = VALUES(alertPercentage),
            isActive = 1
    ");
    $stmt->execute([$currentUserId, $idTypeExpense, $budgetAmount, $alertPercentage]);

    Response::success(['id' => $db->lastInsertId()], 'Presupuesto guardado');
}

if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $idBudget = intval($body['idBudget'] ?? 0);

    if (!$idBudget) {
        Response::error('ID de presupuesto requerido');
    }

    $budgetAmount = floatval($body['budgetAmount'] ?? 0);
    $alertPercentage = intval($body['alertPercentage'] ?? 80);

    $stmt = $db->prepare("
        UPDATE TableBudget
        SET budgetAmount = ?, alertPercentage = ?
        WHERE idBudget = ? AND idUser = ?
    ");
    $result = $stmt->execute([$budgetAmount, $alertPercentage, $idBudget, $currentUserId]);

    if ($stmt->rowCount() === 0) {
        Response::error('No se encontró el presupuesto o no tienes permiso');
    }

    Response::success(null, 'Presupuesto actualizado');
}

if ($method === 'DELETE') {
    $idBudget = intval($_GET['id'] ?? 0);

    if (!$idBudget) {
        Response::error('ID de presupuesto requerido');
    }

    $stmt = $db->prepare("
        UPDATE TableBudget
        SET isActive = 0
        WHERE idBudget = ? AND idUser = ?
    ");
    $stmt->execute([$idBudget, $currentUserId]);

    if ($stmt->rowCount() === 0) {
        Response::error('No se encontró el presupuesto o no tienes permiso');
    }

    Response::success(null, 'Presupuesto eliminado');
}

Response::error('Método no soportado', 405);