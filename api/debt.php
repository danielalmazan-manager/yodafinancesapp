<?php
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';

Auth::start();
Auth::requireLogin();

$db     = Database::get();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $allowedIds = Auth::getAllowedUserIds($db);
    $allowedIdsStr = implode(',', $allowedIds);

    $where  = [];
    $params = [];

    if (!empty($_GET['idUser'])) {
        $where[] = 'td.idUser = ?';
        $params[] = (int)$_GET['idUser'];
    }
    if (!empty($_GET['idTypeDebt'])) {
        $where[] = 'td.idTypeDebt = ?';
        $params[] = (int)$_GET['idTypeDebt'];
    }

    $sql = "
        SELECT td.*,
               cd.date, cd.numQuin,
               ctd.nameTypeDebt,
               ts.nameTypeSubjectDebt,
               tu.nameUser,
               co.nameOrigin,
               cc.nameCreditCardOrPersonalLoan,
               (td.amountToPay - COALESCE(td.actualAmountPaid,0)) AS pending
        FROM TableDebt td
        LEFT JOIN CatalogDate cd ON td.idCatDate = cd.idCatDate
        LEFT JOIN CatalogTypeDebt ctd ON td.idTypeDebt = ctd.idTypeDebt
        LEFT JOIN CatalogTypeSubjectDebt ts ON td.typeSubjectDebt = ts.typeSubjectDebt
        LEFT JOIN TableUser tu ON td.idUser = tu.idUser
        LEFT JOIN CatalogOrigin co ON td.idOrigin = co.idOrigin
        LEFT JOIN CatalogidCreditCardOrPersonalLoan cc ON td.idCreditCardOrPersonalLoan = cc.idCreditCardOrPersonalLoan
    ";
    
    $where[] = "td.idUser IN ($allowedIdsStr)";
    
    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY cd.date ASC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Calculate global summary (across all debts for the couple)
    $summary = $db->query("
        SELECT 
            COALESCE(SUM(amountToPay), 0) AS total,
            COALESCE(SUM(actualAmountPaid), 0) AS paid
        FROM TableDebt
        WHERE idUser IN ($allowedIdsStr)
    ")->fetch();

    Response::success([
        'rows'    => $rows,
        'summary' => $summary
    ]);
}

if ($method === 'POST') {
    $currentUserId = Auth::currentUser()['id'];
    $b = json_decode(file_get_contents('php://input'), true) ?? [];
    $stmt = $db->prepare("
        INSERT INTO TableDebt (amountToPay, actualAmountPaid, txtNotes, idUser, idCatDate, idTypeDebt, idOrigin, idCreditCardOrPersonalLoan, typeSubjectDebt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $b['amountToPay']                  ?? 0,
        $b['actualAmountPaid']             ?? null,
        $b['txtNotes']                     ?? null,
        $b['idUser']                       ?? $currentUserId,
        $b['idCatDate']                    ?? null,
        $b['idTypeDebt']                   ?? null,
        $b['idOrigin']                     ?? null,
        $b['idCreditCardOrPersonalLoan']   ?? null,
        $b['typeSubjectDebt']              ?? null,
    ]);
    Response::success(['id' => $db->lastInsertId()], 'Deuda creada');
}

if ($method === 'PUT') {
    $b  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = (int)($b['idDebt'] ?? 0);
    if (!$id) Response::error('ID requerido');
    
    $currentUserId = Auth::currentUser()['id'];
    
    // Ownership check
    $stmtCheck = $db->prepare("SELECT idUser FROM TableDebt WHERE idDebt = ?");
    $stmtCheck->execute([$id]);
    $existing = $stmtCheck->fetch();
    if (!$existing || $existing['idUser'] != $currentUserId) {
        Response::error('No tienes permiso para editar este registro', 403);
    }

    $stmt = $db->prepare("
        UPDATE TableDebt SET amountToPay=?, actualAmountPaid=?, txtNotes=?, idUser=?,
               idCatDate=?, idTypeDebt=?, idOrigin=?, idCreditCardOrPersonalLoan=?, typeSubjectDebt=?
        WHERE idDebt=?
    ");
    $stmt->execute([
        $b['amountToPay']                  ?? 0,
        $b['actualAmountPaid']             ?? null,
        $b['txtNotes']                     ?? null,
        $b['idUser']                       ?? $currentUserId,
        $b['idCatDate']                    ?? null,
        $b['idTypeDebt']                   ?? null,
        $b['idOrigin']                     ?? null,
        $b['idCreditCardOrPersonalLoan']   ?? null,
        $b['typeSubjectDebt']              ?? null,
        $id,
    ]);
    Response::success(null, 'Deuda actualizada');
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) Response::error('ID requerido');
    
    $currentUserId = Auth::currentUser()['id'];
    
    // Ownership check
    $stmtCheck = $db->prepare("SELECT idUser FROM TableDebt WHERE idDebt = ?");
    $stmtCheck->execute([$id]);
    $existing = $stmtCheck->fetch();
    if (!$existing || $existing['idUser'] != $currentUserId) {
        Response::error('No tienes permiso para eliminar este registro', 403);
    }

    $db->prepare('DELETE FROM TableDebt WHERE idDebt = ?')->execute([$id]);
    Response::success(null, 'Deuda eliminada');
}

Response::error('Método no soportado', 405);
