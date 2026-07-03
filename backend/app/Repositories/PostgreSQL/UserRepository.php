<?php

namespace App\Repositories\PostgreSQL;

use App\Models\PostgreSQL\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class UserRepository
{
    public function findByEmail(string $email): ?User
    {
        return User::where('email', strtolower(trim($email)))->first();
    }

    public function findById(string $id): ?User
    {
        return User::find($id);
    }

    public function findByGoogleId(string $googleId): ?User
    {
        return User::where('google_id', $googleId)->first();
    }

    public function create(array $data): User
    {
        return User::create($data);
    }

    public function update(User $user, array $data): User
    {
        $user->update($data);

        return $user->fresh();
    }

    public function markEmailVerified(string $email): void
    {
        User::where('email', strtolower(trim($email)))
            ->update([
                'email_verified_at' => now(),
            ]);
    }

    public function emailExists(string $email): bool
    {
        return User::where('email', strtolower(trim($email)))->exists();
    }

    public function searchAdmin(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $query = User::query();

        if (! empty($filters['role'])) {
            $query->where('role', $filters['role']);
        }

        if (array_key_exists('is_banned', $filters) && $filters['is_banned'] !== null) {
            $query->where('is_banned', (bool) $filters['is_banned']);
        }

        if (! empty($filters['search'])) {
            $term = '%'.strtolower(trim($filters['search'])).'%';
            $query->where('email', 'ilike', $term);
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function countByRole(string $role): int
    {
        return User::where('role', $role)->count();
    }

    public function countBanned(): int
    {
        return User::where('is_banned', true)->count();
    }

    public function countTotal(): int
    {
        return User::count();
    }
}
