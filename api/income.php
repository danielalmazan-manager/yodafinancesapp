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
        $where[] = 'ti.idUser = ?';
        $params[] = (int)$_GET['idUser'];
    }
    if (!empty($_GET['idTypeIncome'])) {
        $where[] = 'ti.idTypeIncome = ?';
        $params[] = (int)$_GET['idTypeIncome'];
    }
    if (!empty($_GET['idCatDate'])) {
        $where[] = 'ti.idCatDate = ?';
        $params[] = (int)$_GET['idCatDate'];
    }

    $sql = "
        SELECT ti.*, 
               cd.date, cd.numQuin,
               cti.nameTypeIncome,
               ts.nameTypeSubjectIncome,
               tu.nameUser,
               co.nameOrigin
        FROM TableIncome ti
        LEFT JOIN CatalogDate cd ON ti.idCatDate = cd.idCatDate
        LEFT JOIN CatalogTypeIncome cti ON ti.idTypeIncome = cti.idTypeIncome
        LEFT JOIN CatalogTypeSubjectIncome ts ON ti.typeSubjectIncome = ts.typeSubjectIncome
        LEFT JOIN TableUser tu ON ti.idUser = tu.idUser
        LEFT JOIN CatalogOrigin co ON ti.idOrigin = co.idOrigin
    ";
    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY cd.date DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Calculate monthly summary
    $summary = $db->query("
        SELECT 
            COALESCE(SUM(amountToBeReceived), 0) as expected,
            COALESCE(SUM(actualAmountReceived), 0) as actual
        FROM TableIncome ti
        JOIN CatalogDate cd ON ti.idCatDate = cd.idCatDate
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
        INSERT INTO TableIncome (amountToBeReceived, actualAmountReceived, txtNotes, idUser, idCatDate, idTypeIncome, typeSubjectIncome, idOrigin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $b['amountToBeReceived']   ?? 0,
        $b['actualAmountReceived'] ?? 0,
        $b['txtNotes']             ?? null,
        $b['idUser']               ?? Auth::currentUser()['id'],
        $b['idCatDate']            ?? null,
        $b['idTypeIncome']         ?? null,
        $b['typeSubjectIncome']    ?? null,
        $b['idOrigin']             ?? null,
    ]);
    Response::success(['id' => $db->lastInsertId()], 'Ingreso creado');
}

if ($method === 'PUT') {
    $b  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = (int)($b['idIncome'] ?? 0);
    if (!$id) Response::error('ID requerido');
    $stmt = $db->prepare("
        UPDATE TableIncome SET amountToBeReceived=?, actualAmountReceived=?, txtNotes=?,
               idUser=?, idCatDate=?, idTypeIncome=?, typeSubjectIncome=?, idOrigin=?
        WHERE idIncome=?
    ");
    $stmt->execute([
        $b['amountToBeReceived']   ?? 0,
        $b['actualAmountReceived'] ?? 0,
        $b['txtNotes']             ?? null,
        $b['idUser']               ?? Auth::currentUser()['id'],
        $b['idCatDate']            ?? null,
        $b['idTypeIncome']         ?? null,
        $b['typeSubjectIncome']    ?? null,
        $b['idOrigin']             ?? null,
        $id,
    ]);
    Response::success(null, 'Ingreso actualizado');
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) Response::error('ID requerido');
    $db->prepare('DELETE FROM TableIncome WHERE idIncome = ?')->execute([$id]);
    Response::success(null, 'Ingreso eliminado');
}

Response::error('Método no soportado', 405);
