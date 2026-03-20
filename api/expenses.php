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
        $where[] = 'te.idUser = ?';
        $params[] = (int)$_GET['idUser'];
    }
    if (!empty($_GET['idTypeExpense'])) {
        $where[] = 'te.idTypeExpense = ?';
        $params[] = (int)$_GET['idTypeExpense'];
    }
    if (!empty($_GET['idCatDate'])) {
        $where[] = 'te.idCatDate = ?';
        $params[] = (int)$_GET['idCatDate'];
    }

    $sql = "
        SELECT te.*, te.amountToPay AS amount,
               cd.date, cd.numQuin,
               cte.nameTypeExpense,
               ts.nameTypeSubjectExpense,
               tu.nameUser
        FROM TableExpenses te
        LEFT JOIN CatalogDate cd ON te.idCatDate = cd.idCatDate
        LEFT JOIN CatalogTypeExpense cte ON te.idTypeExpense = cte.idTypeExpense
        LEFT JOIN CatalogTypeSubjectExpense ts ON te.typeSubjectExpense = ts.typeSubjectExpense
        LEFT JOIN TableUser tu ON te.idUser = tu.idUser
    ";
    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY cd.date DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Calculate monthly summary
    $summary = $db->query("
        SELECT 
            COALESCE(SUM(amountToPay), 0) as total,
            COALESCE(SUM(actualAmountPaid), 0) as paid
        FROM TableExpenses te
        JOIN CatalogDate cd ON te.idCatDate = cd.idCatDate
        WHERE YEAR(cd.date) = YEAR(NOW()) AND MONTH(cd.date) = MONTH(NOW())
    ")->fetch();

    Response::success([
        'rows'    => $rows,
        'summary' => $summary
    ]);
}

if ($method === 'POST') {
    $b = json_decode(file_get_contents('php://input'), true) ?? [];
    $stmt = $db->prepare("
        INSERT INTO TableExpenses (amountToPay, actualAmountPaid, txtNotes, idUser, idCatDate, idTypeExpense, typeSubjectExpense)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $b['amount']            ?? 0,
        $b['actualAmountPaid']  ?? 0,
        $b['txtNotes']          ?? null,
        $b['idUser']            ?? Auth::currentUser()['id'],
        $b['idCatDate']         ?? null,
        $b['idTypeExpense']     ?? null,
        $b['typeSubjectExpense']?? null,
    ]);
    Response::success(['id' => $db->lastInsertId()], 'Gasto creado');
}

if ($method === 'PUT') {
    $b  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = (int)($b['idExpense'] ?? 0);
    if (!$id) Response::error('ID requerido');
    $stmt = $db->prepare("
        UPDATE TableExpenses SET amountToPay=?, actualAmountPaid=?, txtNotes=?, idUser=?, idCatDate=?, idTypeExpense=?, typeSubjectExpense=?
        WHERE idExpense=?
    ");
    $stmt->execute([
        $b['amount']            ?? 0,
        $b['actualAmountPaid']  ?? 0,
        $b['txtNotes']          ?? null,
        $b['idUser']            ?? Auth::currentUser()['id'],
        $b['idCatDate']         ?? null,
        $b['idTypeExpense']     ?? null,
        $b['typeSubjectExpense']?? null,
        $id,
    ]);
    Response::success(null, 'Gasto actualizado');
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) Response::error('ID requerido');
    $db->prepare('DELETE FROM TableExpenses WHERE idExpense = ?')->execute([$id]);
    Response::success(null, 'Gasto eliminado');
}

Response::error('Método no soportado', 405);
