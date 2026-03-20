<?php

namespace App\Interfaces;

interface IncomeRepositoryInterface {
    public function findAll(array $filters = []): array;
    public function findById(int $id): ?array;
    public function create(array $data): int;
    public function update(int $id, array $data): bool;
    public function delete(int $id): bool;
    public function getMonthlySummary(array $allowedUserIds = []): array;
}
