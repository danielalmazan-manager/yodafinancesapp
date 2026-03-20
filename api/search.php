<?php
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';

Auth::start();
Auth::requireLogin();

$q = $_GET['q'] ?? '';
if (strlen($q) < 2) {
    Response::success([]);
    exit;
}

$db = Database::get();
$allowedIds = Auth::getAllowedUserIds($db);
$allowedIdsStr = implode(',', $allowedIds);
$searchTerm = "%$q%";

$results = $db->query("
    SELECT 'income' AS type, ti.idIncome AS id, ti.actualAmountReceived AS amount,
           ti.txtNotes AS notes, cd.date, cti.nameTypeIncome AS category,
           ts.nameTypeSubjectIncome AS subject
    FROM TableIncome ti
    JOIN CatalogDate cd ON ti.idCatDate = cd.idCatDate
    LEFT JOIN CatalogTypeIncome cti ON ti.idTypeIncome = cti.idTypeIncome
    LEFT JOIN CatalogTypeSubjectIncome ts ON ti.typeSubjectIncome = ts.typeSubjectIncome
    WHERE (ti.txtNotes LIKE '$searchTerm' OR cti.nameTypeIncome LIKE '$searchTerm')
    AND ti.idUser IN ($allowedIdsStr)
    
    UNION ALL
    
    SELECT 'expense' AS type, te.idExpense AS id, te.amountToPay AS amount,
           te.txtNotes AS notes, cd.date, cte.nameTypeExpense AS category,
           ts.nameTypeSubjectExpense AS subject
    FROM TableExpenses te
    JOIN CatalogDate cd ON te.idCatDate = cd.idCatDate
    LEFT JOIN CatalogTypeExpense cte ON te.idTypeExpense = cte.idTypeExpense
    LEFT JOIN CatalogTypeSubjectExpense ts ON te.typeSubjectExpense = ts.typeSubjectExpense
    WHERE (te.txtNotes LIKE '$searchTerm' OR cte.nameTypeExpense LIKE '$searchTerm')
    AND te.idUser IN ($allowedIdsStr)
    
    UNION ALL
    
    SELECT 'debt' AS type, td.idDebt AS id, td.amountToPay AS amount,
           td.txtNotes AS notes, cd.date, ctd.nameTypeDebt AS category,
           ts.nameTypeSubjectDebt AS subject
    FROM TableDebt td
    JOIN CatalogDate cd ON td.idCatDate = cd.idCatDate
    LEFT JOIN CatalogTypeDebt ctd ON td.idTypeDebt = ctd.idTypeDebt
    LEFT JOIN CatalogTypeSubjectDebt ts ON td.typeSubjectDebt = ts.typeSubjectDebt
    WHERE (td.txtNotes LIKE '$searchTerm' OR ctd.nameTypeDebt LIKE '$searchTerm')
    AND td.idUser IN ($allowedIdsStr)
    
    ORDER BY date DESC LIMIT 50
")->fetchAll();

Response::success($results);
