<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Seeder;

class RoleUsersSeeder extends Seeder
{
    /**
     * Seed default area manager and branch head (branch manager) users.
     */
    public function run(): void
    {
        $areaManager = User::updateOrCreate(
            ['email' => 'area.manager@example.com'],
            [
                'name' => 'Default Area Manager',
                'password' => 'password123',
                'role' => User::ROLE_AREA_MANAGER,
                'branch_id' => null,
            ],
        );

        $branch = Branch::firstOrCreate(
            ['name' => 'Main Branch'],
            [
                'area_manager_id' => $areaManager->id,
            ],
        );

        if ((int) $branch->area_manager_id !== (int) $areaManager->id) {
            $branch->area_manager_id = $areaManager->id;
            $branch->save();
        }

        User::updateOrCreate(
            ['email' => 'branch.head@example.com'],
            [
                'name' => 'Default Branch Head',
                'password' => 'password123',
                // DB enum supports branch_manager; this is the branch-head role.
                'role' => User::ROLE_BRANCH_MANAGER,
                'branch_id' => $branch->id,
            ],
        );
    }
}
