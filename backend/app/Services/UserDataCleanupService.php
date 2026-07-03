<?php

namespace App\Services;

use App\Models\MongoDB\ApplicantProfileDocument;
use App\Models\MongoDB\CompanyProfileDocument;
use App\Models\MongoDB\SwipeHistory;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use App\Repositories\Redis\OTPCacheRepository;
use Illuminate\Support\Facades\Redis;

class UserDataCleanupService
{
    public function __construct(private OTPCacheRepository $otpCache) {}

    public function cleanupForDeletedUser(User $user): void
    {
        $companyId = CompanyProfile::query()
            ->where('user_id', $user->id)
            ->value('id');

        ApplicantProfileDocument::where('user_id', $user->id)->delete();

        CompanyProfileDocument::where('user_id', $user->id)->delete();
        if (is_string($companyId) && $companyId !== '') {
            CompanyProfileDocument::where('company_id', $companyId)->delete();
        }

        SwipeHistory::where('user_id', $user->id)
            ->orWhere('target_id', $user->id)
            ->delete();

        $this->otpCache->delete($user->email);

        Redis::del("swipe:deck:seen:{$user->id}");

        // Use SCAN instead of KEYS for counter cleanup
        $this->scanAndDelete("swipe:counter:{$user->id}:*");

        // Use SCAN instead of KEYS for HR seen cleanup
        $this->scanAndDelete("swipe:hr:seen:{$user->id}:*");

        Redis::del("points:{$user->id}");
    }

    private function scanAndDelete(string $pattern): void
    {
        // Redis SCAN cursor is string-based; use string comparison to avoid infinite loops.
        $cursor = '0';
        do {
            $result = Redis::scan($cursor, ['MATCH' => $pattern, 'COUNT' => 100]);
            if ($result === false) {
                break;
            }

            [$nextCursor, $keys] = $result;
            $cursor = (string) $nextCursor;

            if (! empty($keys)) {
                Redis::del(...$keys);
            }
        } while ($cursor !== '0');
    }
}
