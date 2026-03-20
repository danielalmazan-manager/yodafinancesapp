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
    // Get partner information for current user
    $stmt = $db->prepare("
        SELECT
            p.*,
            u1.nameUser as partner1Name,
            u1.emailUser as partner1Email,
            u1.avatar as partner1Avatar,
            u2.nameUser as partner2Name,
            u2.emailUser as partner2Email,
            u2.avatar as partner2Avatar
        FROM TablePartnership p
        JOIN TableUser u1 ON p.idUser1 = u1.idUser
        JOIN TableUser u2 ON p.idUser2 = u2.idUser
        WHERE (p.idUser1 = ? OR p.idUser2 = ?) AND p.isActive = 1
        LIMIT 1
    ");
    $stmt->execute([$currentUserId, $currentUserId]);
    $partnership = $stmt->fetch();

    if (!$partnership) {
        Response::success([
            'hasPartner' => false,
            'message' => 'No tienes pareja vinculada'
        ]);
    }

    // Determine partner info
    $partnerId = ($partnership['idUser1'] == $currentUserId)
        ? $partnership['idUser2']
        : $partnership['idUser1'];

    $partnerInfo = ($partnership['idUser1'] == $currentUserId)
        ? [
            'id' => $partnership['idUser2'],
            'name' => $partnership['partner2Name'],
            'email' => $partnership['partner2Email'],
            'avatar' => $partnership['partner2Avatar']
        ]
        : [
            'id' => $partnership['idUser1'],
            'name' => $partnership['partner1Name'],
            'email' => $partnership['partner1Email'],
            'avatar' => $partnership['partner1Avatar']
        ];

    // Calculate shared expenses balance for current month
    $stmt = $db->prepare("
        SELECT
            SUM(CASE WHEN te.idUser = ? THEN te.amountToPay ELSE 0 END) as myExpenses,
            SUM(CASE WHEN te.idUser = ? THEN te.amountToPay ELSE 0 END) as partnerExpenses,
            SUM(CASE WHEN ts.typeSubjectExpense = 3 THEN te.amountToPay ELSE 0 END) as sharedExpenses
        FROM TableExpenses te
        JOIN CatalogDate cd ON te.idCatDate = cd.idCatDate
        LEFT JOIN CatalogTypeSubjectExpense ts ON te.typeSubjectExpense = ts.typeSubjectExpense
        WHERE YEAR(cd.date) = YEAR(NOW())
        AND MONTH(cd.date) = MONTH(NOW())
        AND te.idUser IN (?, ?)
    ");
    $stmt->execute([$currentUserId, $partnerId, $currentUserId, $partnerId]);
    $balance = $stmt->fetch();

    // Calculate who owes who
    $myTotal = floatval($balance['myExpenses']);
    $partnerTotal = floatval($balance['partnerExpenses']);
    $sharedTotal = floatval($balance['sharedExpenses']);

    // Each person should pay half of shared expenses
    $sharedPerPerson = $sharedTotal / 2;
    $myFairShare = $myTotal + $sharedPerPerson;
    $partnerFairShare = $partnerTotal + $sharedPerPerson;

    $difference = $myFairShare - $partnerFairShare;

    Response::success([
        'hasPartner' => true,
        'partner' => $partnerInfo,
        'balance' => [
            'myExpenses' => $myTotal,
            'partnerExpenses' => $partnerTotal,
            'sharedExpenses' => $sharedTotal,
            'myFairShare' => $myFairShare,
            'partnerFairShare' => $partnerFairShare,
            'difference' => abs($difference),
            'whoOwes' => $difference > 0 ? 'partner' : ($difference < 0 ? 'me' : 'balanced')
        ]
    ]);
}

// POST - Create partnership
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $partnerEmail = trim($body['email'] ?? '');

    if (!$partnerEmail) {
        Response::error('Email de pareja requerido');
    }

    // Find partner user
    $stmt = $db->prepare("SELECT idUser FROM TableUser WHERE emailUser = ? AND idUser != ?");
    $stmt->execute([$partnerEmail, $currentUserId]);
    $partner = $stmt->fetch();

    if (!$partner) {
        Response::error('Usuario no encontrado');
    }

    $partnerId = $partner['idUser'];

    // Check if partnership already exists
    $stmt = $db->prepare("
        SELECT * FROM TablePartnership
        WHERE (idUser1 = ? AND idUser2 = ?) OR (idUser1 = ? AND idUser2 = ?)
    ");
    $stmt->execute([$currentUserId, $partnerId, $partnerId, $currentUserId]);

    if ($stmt->fetch()) {
        Response::error('Ya existe una relación con este usuario');
    }

    // Create partnership (ensure lower ID is always idUser1 for consistency)
    $user1 = min($currentUserId, $partnerId);
    $user2 = max($currentUserId, $partnerId);

    $stmt = $db->prepare("INSERT INTO TablePartnership (idUser1, idUser2) VALUES (?, ?)");
    $stmt->execute([$user1, $user2]);

    Response::success(['id' => $db->lastInsertId()], 'Pareja vinculada exitosamente');
}

// DELETE - Remove partnership
if ($method === 'DELETE') {
    $stmt = $db->prepare("
        UPDATE TablePartnership
        SET isActive = 0
        WHERE (idUser1 = ? OR idUser2 = ?) AND isActive = 1
    ");
    $stmt->execute([$currentUserId, $currentUserId]);

    Response::success(null, 'Vínculo de pareja eliminado');
}

Response::error('Método no soportado', 405);