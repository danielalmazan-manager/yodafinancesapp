<?php

namespace App\Repositories;

use App\Interfaces\IncomeRepositoryInterface;
use PDO;
use Database;

class IncomeRepository implements IncomeRepositoryInterface {
    private PDO $db;

    public function __construct() {
        $this->db = Database::get();
    }

    public function findAll(array $filters = []): array {
        $where  = [];
        $params = [];

        if (!empty($filters['allowedUserIds'])) {
            $placeholders = implode(',', array_fill(0, count($filters['allowedUserIds']), '?'));
            $where[] = "ti.idUser IN ($placeholders)";
            foreach ($filters['allowedUserIds'] as $uid) $params[] = (int)$uid;
        } elseif (!empty($filters['idUser'])) {
            $where[] = 'ti.idUser = ?';
            $params[] = (int)$filters['idUser'];
        }
        
        if (!empty($filters['idTypeIncome'])) {
            $where[] = 'ti.idTypeIncome = ?';
            $params[] = (int)$filters['idTypeIncome'];
        }
        if (!empty($filters['idCatDate'])) {
            $where[] = 'ti.idCatDate = ?';
            $params[] = (int)$filters['idCatDate'];
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

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM TableIncome WHERE idIncome = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $d): int {
        $stmt = $this->db->prepare("
            INSERT INTO TableIncome (amountToBeReceived, actualAmountReceived, txtNotes, idUser, idCatDate, idTypeIncome, typeSubjectIncome, idOrigin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $d['amountToBeReceived']   ?? 0,
            $d['actualAmountReceived'] ?? 0,
            $d['txtNotes']             ?? null,
            $d['idUser']               ?? null,
            $d['idCatDate']            ?? null,
            $d['idTypeIncome']         ?? null,
            $d['typeSubjectIncome']    ?? null,
            $d['idOrigin']             ?? null,
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function update(int $id, array $d): bool {
        $stmt = $this->db->prepare("
            UPDATE TableIncome SET amountToBeReceived=?, actualAmountReceived=?, txtNotes=?,
                   idUser=?, idCatDate=?, idTypeIncome=?, typeSubjectIncome=?, idOrigin=?
            WHERE idIncome=?
        ");
        return $stmt->execute([
            $d['amountToBeReceived']   ?? 0,
            $d['actualAmountReceived'] ?? 0,
            $d['txtNotes']             ?? null,
            $d['idUser']               ?? null,
            $d['idCatDate']            ?? null,
            $d['idTypeIncome']         ?? null,
            $d['typeSubjectIncome']    ?? null,
            $d['idOrigin']             ?? null,
            $id,
        ]);
    }

    public function delete(int $id): bool {
        $stmt = $this->db->prepare('DELETE FROM TableIncome WHERE idIncome = ?');
        return $stmt->execute([$id]);
    }

    public function getMonthlySummary(array $allowedUserIds = []): array {
        $sql = "
            SELECT 
                COALESCE(SUM(amountToBeReceived), 0) as expected,
                COALESCE(SUM(actualAmountReceived), 0) as actual
            FROM TableIncome ti
            JOIN CatalogDate cd ON ti.idCatDate = cd.idCatDate
            WHERE YEAR(cd.date) = YEAR(NOW()) AND MONTH(cd.date) = MONTH(NOW())
        ";
        $params = [];
        if ($allowedUserIds) {
            $placeholders = implode(',', array_fill(0, count($allowedUserIds), '?'));
            $sql .= " AND ti.idUser IN ($placeholders)";
            $params = $allowedUserIds;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    }
}
