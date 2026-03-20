<?php
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';

Auth::start();
Auth::requireLogin();

$db     = Database::get();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $where  = [];
    $params = [];

    if (!empty($_GET['idUser'])) {
        $where[] = 'g.idUser = ?';
        $params[] = (int)$_GET['idUser'];
    }

    $sql = "
        SELECT g.*,
               cd.date, cd.numQuin,
               tg.nameTypeGoal,
               pg.namePlanGoal,
               tsg.nameTypeSubjectGoal,
               tu.nameUser,
               (g.targetAmount - COALESCE(g.amountDeposited, 0)) AS pending
        FROM TableGoals g
        LEFT JOIN CatalogDate cd ON g.idCatDate = cd.idCatDate
        LEFT JOIN CatalogTypeGoal tg ON g.idTypeGoal = tg.idTypeGoal
        LEFT JOIN CatalogPlanGoal pg ON g.idPlanGoal = pg.idPlanGoal
        LEFT JOIN CatalogTypeSubjectGoal tsg ON g.typeSubjectGoal = tsg.typeSubjectGoal
        LEFT JOIN TableUser tu ON g.idUser = tu.idUser
    ";

    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY g.idGoal DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Summary calculation
    $summary = $db->query("
        SELECT 
            SUM(targetAmount) as totalTarget,
            SUM(amountDeposited) as totalSaved
        FROM TableGoals
    ")->fetch();

    Response::success([
        'rows' => $rows,
        'summary' => [
            'totalTarget' => (float)($summary['totalTarget'] ?? 0),
            'totalSaved'  => (float)($summary['totalSaved'] ?? 0)
        ]
    ]);
}

if ($method === 'POST') {
    $b = json_decode(file_get_contents('php://input'), true) ?? [];
    $stmt = $db->prepare("
        INSERT INTO TableGoals (targetAmount, amountDeposited, txtDescription, statusGoal, idUser, idCatDate, idTypeGoal, idPlanGoal, typeSubjectGoal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $b['targetAmount']     ?? 0,
        $b['amountDeposited']  ?? 0,
        $b['txtDescription']   ?? null,
        $b['statusGoal']       ?? 0,
        $b['idUser']           ?? Auth::currentUser()['id'],
        $b['idCatDate']        ?? null,
        $b['idTypeGoal']       ?? null,
        $b['idPlanGoal']       ?? null,
        $b['typeSubjectGoal']  ?? null
    ]);
    Response::success(['id' => $db->lastInsertId()], 'Meta creada');
}

if ($method === 'PUT') {
    $b = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = (int)($b['idGoal'] ?? 0);
    if (!$id) Response::error('ID requerido');

    $stmt = $db->prepare("
        UPDATE TableGoals SET 
            targetAmount = ?, 
            amountDeposited = ?, 
            txtDescription = ?, 
            statusGoal = ?, 
            idUser = ?,
            idCatDate = ?, 
            idTypeGoal = ?, 
            idPlanGoal = ?, 
            typeSubjectGoal = ?
        WHERE idGoal = ?
    ");
    $stmt->execute([
        $b['targetAmount']     ?? 0,
        $b['amountDeposited']  ?? 0,
        $b['txtDescription']   ?? null,
        $b['statusGoal']       ?? 0,
        $b['idUser']           ?? Auth::currentUser()['id'],
        $b['idCatDate']        ?? null,
        $b['idTypeGoal']       ?? null,
        $b['idPlanGoal']       ?? null,
        $b['typeSubjectGoal']  ?? null,
        $id
    ]);
    Response::success(null, 'Meta actualizada');
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) Response::error('ID requerido');
    $db->prepare('DELETE FROM TableGoals WHERE idGoal = ?')->execute([$id]);
    Response::success(null, 'Meta eliminada');
}

Response::error('Método no soportado', 405);
