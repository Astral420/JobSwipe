<?php

namespace App\Console\Commands;

use App\Models\PostgreSQL\CompanyProfile;
use App\Services\TrustScoreService;
use Illuminate\Console\Command;

class AwardCleanMonthBonus extends Command
{
    protected $signature = 'trust:clean-month';

    protected $description = 'Award +1 behavioral trust point to companies with no incidents in the past month';

    public function handle(TrustScoreService $trustScore): int
    {
        $oneMonthAgo = now()->subMonth();

        $eligibleCompanies = CompanyProfile::where('verification_status', 'approved')
            ->whereNotExists(function ($query) use ($oneMonthAgo) {
                $query->selectRaw('1')
                    ->from('trust_events')
                    ->whereColumn('trust_events.company_id', 'company_profiles.id')
                    ->whereIn('trust_events.event_type', ['job_flagged', 'spam_confirmed', 'warning_issued'])
                    ->where('trust_events.created_at', '>=', $oneMonthAgo);
            })
            ->pluck('id');

        $bonus = (int) config('trust.behavioral.clean_month_bonus', 1);
        $count = 0;

        foreach ($eligibleCompanies as $companyId) {
            $trustScore->recordEvent($companyId, 'clean_month', $bonus, [
                'period' => $oneMonthAgo->toDateString().' to '.now()->toDateString(),
            ]);
            $count++;
        }

        $this->info("Awarded clean month bonus to {$count} companies.");

        return self::SUCCESS;
    }
}
