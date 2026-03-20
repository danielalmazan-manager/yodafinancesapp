<?php
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';

Auth::start();
Auth::requireLogin();

$db = Database::get();

$data = [
    'typeIncome'           => $db->query('SELECT * FROM CatalogTypeIncome ORDER BY nameTypeIncome')->fetchAll(),
    'typeExpense'          => $db->query('SELECT * FROM CatalogTypeExpense ORDER BY nameTypeExpense')->fetchAll(),
    'typeDebt'             => $db->query('SELECT * FROM CatalogTypeDebt ORDER BY nameTypeDebt')->fetchAll(),
    'origin'               => $db->query('SELECT * FROM CatalogOrigin ORDER BY nameOrigin')->fetchAll(),
    'subjectIncome'        => $db->query('SELECT * FROM CatalogTypeSubjectIncome ORDER BY nameTypeSubjectIncome')->fetchAll(),
    'subjectExpense'       => $db->query('SELECT * FROM CatalogTypeSubjectExpense ORDER BY nameTypeSubjectExpense')->fetchAll(),
    'subjectDebt'          => $db->query('SELECT * FROM CatalogTypeSubjectDebt ORDER BY nameTypeSubjectDebt')->fetchAll(),
    'creditCard'           => $db->query('SELECT * FROM CatalogidCreditCardOrPersonalLoan ORDER BY nameCreditCardOrPersonalLoan')->fetchAll(),
    'dates'                => $db->query('SELECT * FROM CatalogDate ORDER BY date DESC LIMIT 24')->fetchAll(),
    'users'                => $db->query('SELECT idUser, nameUser, avatar FROM TableUser ORDER BY nameUser')->fetchAll(),
    'typeGoal'             => $db->query('SELECT * FROM CatalogTypeGoal ORDER BY nameTypeGoal')->fetchAll(),
    'planGoal'             => $db->query('SELECT * FROM CatalogPlanGoal ORDER BY namePlanGoal')->fetchAll(),
    'subjectGoal'          => $db->query('SELECT * FROM CatalogTypeSubjectGoal ORDER BY nameTypeSubjectGoal')->fetchAll(),
];

Response::success($data);
