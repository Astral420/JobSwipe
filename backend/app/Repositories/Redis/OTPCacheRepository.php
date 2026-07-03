<?php

namespace App\Repositories\Redis;

use Carbon\Carbon;
use Illuminate\Support\Facades\Redis;

class OTPCacheRepository
{
    private function key(string $email): string
    {
        return 'otp:'.hash('sha256', strtolower(trim($email)));
    }

    public function store(
        string $email,
        string $codeHash,
        ?string $passwordHash = null,
        ?string $role = null,
        array $metadata = []
    ): void {
        $key = $this->key($email);

        Redis::hset($key, 'code_hash', $codeHash);
        if ($passwordHash !== null) {
            Redis::hset($key, 'password_hash', $passwordHash);
        }
        if ($role !== null) {
            Redis::hset($key, 'role', $role);
        }
        if ($metadata !== []) {
            Redis::hset($key, 'metadata', json_encode($metadata));
        }
        Redis::hset($key, 'attempts', 0);
        Redis::hset($key, 'created_at', Carbon::now()->timestamp);
        Redis::expire($key, 600);
    }

    public function get(string $email): ?array
    {
        $key = $this->key($email);
        $data = Redis::hgetall($key);

        if (! Redis::exists($key)) {
            return null;
        }

        return $data;
    }

    public function incrementAttempts(string $email): int
    {
        return (int) Redis::hincrby($this->key($email), 'attempts', 1);
    }

    public function delete(string $email): void
    {
        Redis::del($this->key($email));
    }

    public function exists(string $email): bool
    {
        return (bool) Redis::exists($this->key($email));
    }
}
