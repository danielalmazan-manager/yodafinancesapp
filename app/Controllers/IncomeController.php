<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Interfaces\IncomeRepositoryInterface;
use Auth;
use Database;

class IncomeController extends Controller {
    private IncomeRepositoryInterface $incomeRepo;

    public function __construct(IncomeRepositoryInterface $incomeRepo) {
        $this->incomeRepo = $incomeRepo;
    }

    public function index(): void {
        $db = Database::get();
        $allowedIds = Auth::getAllowedUserIds($db);
        
        $filters = Request::query();
        $filters['allowedUserIds'] = $allowedIds;
        
        $rows = $this->incomeRepo->findAll($filters);
        $summary = $this->incomeRepo->getMonthlySummary($allowedIds);

        $this->success([
            'rows'    => $rows,
            'summary' => $summary
        ]);
    }

    public function store(): void {
        $data = Request::body();
        if (empty($data['idUser'])) {
            $data['idUser'] = Auth::currentUser()['id'];
        }
        $id = $this->incomeRepo->create($data);
        $this->success(['id' => $id], 'Ingreso creado');
    }

    public function update(): void {
        $data = Request::body();
        $id = (int)($data['idIncome'] ?? 0);
        if (!$id) {
            $this->error('ID requerido');
        }
        
        // Ownership check
        $existing = $this->incomeRepo->findById($id);
        $currentUserId = Auth::currentUser()['id'];
        if (!$existing || $existing['idUser'] != $currentUserId) {
            $this->error('No tienes permiso para editar este registro');
        }

        if (empty($data['idUser'])) {
            $data['idUser'] = $currentUserId;
        }
        $this->incomeRepo->update($id, $data);
        $this->success(null, 'Ingreso actualizado');
    }

    public function destroy(): void {
        $id = (int)Request::query('id', 0);
        if (!$id) {
            $this->error('ID requerido');
        }
        
        // Ownership check
        $existing = $this->incomeRepo->findById($id);
        $currentUserId = Auth::currentUser()['id'];
        if (!$existing || $existing['idUser'] != $currentUserId) {
            $this->error('No tienes permiso para eliminar este registro');
        }

        $this->incomeRepo->delete($id);
        $this->success(null, 'Ingreso eliminado');
    }
}
