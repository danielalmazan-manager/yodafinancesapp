<?php
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';

Auth::start();
Auth::requireLogin();

$db = Database::get();
$allowedIds = Auth::getAllowedUserIds($db);
$allowedIdsStr = implode(',', $allowedIds);

// Income totals (current month)
$incomeTotal = $db->query("
    SELECT COALESCE(SUM(actualAmountReceived),0) AS total, COUNT(*) AS count
    FROM TableIncome ti
    JOIN CatalogDate cd ON ti.idCatDate = cd.idCatDate
    WHERE YEAR(cd.date) = YEAR(NOW()) AND MONTH(cd.date) = MONTH(NOW())
    AND ti.idUser IN ($allowedIdsStr)
")->fetch();

// Expense totals (current month - pending)
$expenseTotal = $db->query("
    SELECT 
        COALESCE(SUM(amountToPay),0) AS total,
        COALESCE(SUM(amountToPay - COALESCE(actualAmountPaid,0)),0) AS pending
    FROM TableExpenses te
    JOIN CatalogDate cd ON te.idCatDate = cd.idCatDate
    WHERE YEAR(cd.date) = YEAR(NOW()) AND MONTH(cd.date) = MONTH(NOW())
    AND te.idUser IN ($allowedIdsStr)
")->fetch();

// Debt totals (all pending)
$debtTotal = $db->query("
    SELECT COALESCE(SUM(amountToPay - COALESCE(actualAmountPaid,0)),0) AS total, COUNT(*) AS count
    FROM TableDebt
    WHERE COALESCE(actualAmountPaid,0) < amountToPay
    AND idUser IN ($allowedIdsStr)
")->fetch();

// Total Goals (remaining target for active goals)
$goalsTotal = $db->query("
    SELECT COALESCE(SUM(targetAmount - COALESCE(amountDeposited,0)),0) AS total
    FROM TableGoals
    WHERE COALESCE(amountDeposited,0) < targetAmount
    AND idUser IN ($allowedIdsStr)
")->fetch();

// Balance
$totalBalance = floatval($incomeTotal['total']) - floatval($expenseTotal['total']);

// --- PREVIOUS QUINCENA BALANCE ---
$currentYear = intval(date('Y'));
$currentMonth = intval(date('n'));
$quincenaNum = (date('j') <= 15) ? 1 : 2;

if ($quincenaNum === 1) {
    $prevQuin = 2;
    $prevMonth = ($currentMonth === 1) ? 12 : $currentMonth - 1;
    $prevYear = ($currentMonth === 1) ? $currentYear - 1 : $currentYear;
} else {
    $prevQuin = 1;
    $prevMonth = $currentMonth;
    $prevYear = $currentYear;
}

$stmtPrev = $db->prepare("
    SELECT 
        COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END),0) AS income,
        COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END),0) AS expense
    FROM (
        SELECT 'income' AS type, actualAmountReceived AS amount, idCatDate, idUser FROM TableIncome
        UNION ALL
        SELECT 'expense', amountToPay, idCatDate, idUser FROM TableExpenses
    ) t
    JOIN CatalogDate cd ON t.idCatDate = cd.idCatDate
    WHERE YEAR(cd.date) = ? AND MONTH(cd.date) = ? AND cd.numQuin = ?
    AND t.idUser IN ($allowedIdsStr)
");
$stmtPrev->execute([$prevYear, $prevMonth, $prevQuin]);
$prevData = $stmtPrev->fetch();
$prevBalance = floatval($prevData['income']) - floatval($prevData['expense']);
$variation = $totalBalance - $prevBalance;

// --- COUPLE BALANCE LOGIC ---
// Calculate shared expenses paid by each user
// Assuming typeSubjectExpense = 3 is "Shared/Ambos"
$sharedExpenses = $db->query("
    SELECT 
        u.idUser,
        u.nameUser,
        u.avatar,
        COALESCE(SUM(te.actualAmountPaid), 0) AS paid
    FROM TableUser u
    LEFT JOIN TableExpenses te ON u.idUser = te.idUser AND te.typeSubjectExpense = 3
    LEFT JOIN CatalogDate cd ON te.idCatDate = cd.idCatDate
    WHERE u.idUser IN ($allowedIdsStr) 
    AND ((YEAR(cd.date) = YEAR(NOW()) AND MONTH(cd.date) = MONTH(NOW())) OR cd.idCatDate IS NULL)
    GROUP BY u.idUser
")->fetchAll();

$totalShared = 0;
foreach($sharedExpenses as $se) { $totalShared += floatval($se['paid']); }
$expectedPerUser = $totalShared / 2;

$coupleBalance = [];
foreach($sharedExpenses as $se) {
    $diff = floatval($se['paid']) - $expectedPerUser;
    $coupleBalance[] = [
        'idUser'   => $se['idUser'],
        'nameUser' => $se['nameUser'],
        'avatar'   => $se['avatar'],
        'paid'     => floatval($se['paid']),
        'diff'     => $diff
    ];
}

// --- QUINCENAL BREAKDOWN ---
$quincenaNum = (date('j') <= 15) ? 1 : 2;
    $stmt = $db->prepare("
    SELECT 
        COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END),0) AS income,
        COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END),0) AS expense
    FROM (
        SELECT 'income' AS type, actualAmountReceived AS amount, idCatDate, idUser FROM TableIncome
        UNION ALL
        SELECT 'expense', amountToPay, idCatDate, idUser FROM TableExpenses
    ) t
    JOIN CatalogDate cd ON t.idCatDate = cd.idCatDate
    WHERE YEAR(cd.date) = YEAR(NOW()) AND MONTH(cd.date) = MONTH(NOW()) AND cd.numQuin = ?
    AND t.idUser IN ($allowedIdsStr)
");
$stmt->execute([$quincenaNum]);
$quincenalData = $stmt->fetch();

// Recent transactions (last 10, mixed)
$recent = $db->query("
    SELECT 'income' AS type, ti.idIncome AS id, ti.actualAmountReceived AS amount,
           ti.txtNotes AS notes, cd.date, cti.nameTypeIncome AS category,
           ts.nameTypeSubjectIncome AS subject, ti.idUser
    FROM TableIncome ti
    JOIN CatalogDate cd ON ti.idCatDate = cd.idCatDate
    LEFT JOIN CatalogTypeIncome cti ON ti.idTypeIncome = cti.idTypeIncome
    LEFT JOIN CatalogTypeSubjectIncome ts ON ti.typeSubjectIncome = ts.typeSubjectIncome
    WHERE ti.idUser IN ($allowedIdsStr)
    UNION ALL
    SELECT 'expense' AS type, te.idExpense AS id, te.amountToPay AS amount,
           te.txtNotes AS notes, cd.date, cte.nameTypeExpense AS category,
           ts.nameTypeSubjectExpense AS subject, te.idUser
    FROM TableExpenses te
    JOIN CatalogDate cd ON te.idCatDate = cd.idCatDate
    LEFT JOIN CatalogTypeExpense cte ON te.idTypeExpense = cte.idTypeExpense
    LEFT JOIN CatalogTypeSubjectExpense ts ON te.typeSubjectExpense = ts.typeSubjectExpense
    WHERE te.idUser IN ($allowedIdsStr)
    UNION ALL
    SELECT 'debt' AS type, td.idDebt AS id, td.amountToPay AS amount,
           td.txtNotes AS notes, cd.date, ctd.nameTypeDebt AS category,
           ts.nameTypeSubjectDebt AS subject, td.idUser
    FROM TableDebt td
    JOIN CatalogDate cd ON td.idCatDate = cd.idCatDate
    LEFT JOIN CatalogTypeDebt ctd ON td.idTypeDebt = ctd.idTypeDebt
    LEFT JOIN CatalogTypeSubjectDebt ts ON td.typeSubjectDebt = ts.typeSubjectDebt
    WHERE td.idUser IN ($allowedIdsStr)
    ORDER BY date DESC LIMIT 10
")->fetchAll();

// Monthly chart data (last 6 months income vs expenses)
$chart = $db->query("
    SELECT 
        DATE_FORMAT(cd.date,'%Y-%m') AS month,
        COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END),0) AS income,
        COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END),0) AS expense
    FROM (
        SELECT 'income' AS type, actualAmountReceived AS amount, idCatDate, idUser FROM TableIncome
        UNION ALL
        SELECT 'expense', amountToPay, idCatDate, idUser FROM TableExpenses
    ) t
    JOIN CatalogDate cd ON t.idCatDate = cd.idCatDate
    WHERE cd.date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    AND t.idUser IN ($allowedIdsStr)
    GROUP BY DATE_FORMAT(cd.date,'%Y-%m')
    ORDER BY month ASC
")->fetchAll();

// --- QUINCENAL PROJECTION (REPLICATING EXCEL) ---
$projection = $db->query("
    SELECT 
        cd.idCatDate,
        cd.date,
        cd.numQuin,
        (SELECT COALESCE(SUM(COALESCE(NULLIF(actualAmountReceived, 0), amountToBeReceived, 0)), 0) FROM TableIncome WHERE idCatDate = cd.idCatDate AND idUser IN ($allowedIdsStr)) as income,
        (SELECT COALESCE(SUM(amountToPay), 0) FROM TableExpenses WHERE idCatDate = cd.idCatDate AND idUser IN ($allowedIdsStr)) as expense,
        (SELECT COALESCE(SUM(amountToPay), 0) FROM TableDebt WHERE idCatDate = cd.idCatDate AND idUser IN ($allowedIdsStr)) as debt,
        (SELECT COALESCE(SUM(COALESCE(NULLIF(amountDeposited, 0), targetAmount, 0)), 0) FROM TableGoals WHERE idCatDate = cd.idCatDate AND idUser IN ($allowedIdsStr)) as goals
    FROM CatalogDate cd
    WHERE YEAR(cd.date) = YEAR(NOW())
    ORDER BY cd.date ASC
")->fetchAll();

$totalIncome = floatval($incomeTotal['total']);
$pendingExpenses = floatval($expenseTotal['pending']);
$pendingDebt = floatval($debtTotal['total']);
$totalGoals = floatval($goalsTotal['total']);

$dti = $totalIncome > 0 ? round(($pendingExpenses + $pendingDebt) / $totalIncome * 100, 1) : 0;
$savingsRate = $totalIncome > 0 ? round(($totalIncome - $pendingExpenses - $pendingDebt) / $totalIncome * 100, 1) : 0;

Response::success([
    'summary' => [
        'totalBalance'      => (float)$totalBalance,
        'prevBalance'       => (float)$prevBalance,
        'variation'         => (float)$variation,
        'totalIncome'       => (float)$totalIncome,
        'pendingExpenses'   => (float)$pendingExpenses,
        'totalGoals'        => (float)$totalGoals,
        'dti'               => $dti,
        'savingsRate'       => $savingsRate
    ],
    'quincena' => [
        'month'    => [
            '1'=>'Enero','2'=>'Febrero','3'=>'Marzo','4'=>'Abril','5'=>'Mayo','6'=>'Junio',
            '7'=>'Julio','8'=>'Agosto','9'=>'Septiembre','10'=>'Octubre','11'=>'Noviembre','12'=>'Diciembre'
        ][date('n')],
        'income'   => floatval($quincenalData['income']),
        'expense'  => floatval($quincenalData['expense']),
        'progress' => ($quincenalData['income'] > 0) ? round(($quincenalData['expense'] / $quincenalData['income']) * 100) : 0
    ],
    'recent'        => $recent,
    'chart'         => $chart,
    'coupleBalance' => $coupleBalance,
    'currentQuin'   => $quincenaNum,
    'projection'    => $projection
]);
