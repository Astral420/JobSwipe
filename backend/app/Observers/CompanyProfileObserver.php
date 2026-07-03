<?php

namespace App\Observers;

use App\Models\PostgreSQL\CompanyProfile;
use App\Services\TrustScoreService;

class CompanyProfileObserver
{
    public function updated(CompanyProfile $companyProfile): void
    {
        if (! $companyProfile->wasChanged('verification_status')) {
            return;
        }

        $previousStatus = (string) $companyProfile->getOriginal('verification_status');
        $currentStatus = (string) $companyProfile->verification_status;

        if ($currentStatus === 'approved' && $previousStatus !== 'approved') {
            app(TrustScoreService::class)->recordEvent(
                $companyProfile->id,
                'docs_approved',
                30,
                ['action' => 'admin_verification_approved']
            );

            return;
        }

        app(TrustScoreService::class)->recalculate($companyProfile->id);
    }
}
