<?php

namespace App\Console\Commands;

use App\Models\PostgreSQL\CompanyProfile;
use App\Services\TrustScoreService;
use Illuminate\Console\Command;

class RefreshTrustScores extends Command
{
    protected $signature = 'trust:refresh {--company= : Specific company ID to refresh}';

    protected $description = 'Recalculate trust scores for all verified companies';

    public function handle(TrustScoreService $trustScore): int
    {
        $companyId = $this->option('company');

        if ($companyId) {
            $result = $trustScore->recalculate($companyId);

            if ($result === []) {
                $this->error("Company not found: {$companyId}");

                return self::FAILURE;
            }

            $this->info("Recalculated: score={$result['total_score']}, level={$result['trust_level']}");

            return self::SUCCESS;
        }

        $companies = CompanyProfile::whereIn('verification_status', ['pending', 'approved'])
            ->pluck('id');

        $bar = $this->output->createProgressBar($companies->count());

        foreach ($companies as $id) {
            $trustScore->recalculate($id);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Refreshed {$companies->count()} company trust scores.");

        return self::SUCCESS;
    }
}
