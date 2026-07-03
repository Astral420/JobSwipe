<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class CompanyEmailValidator
{
    /**
     * Extract the domain from an email address.
     */
    public function extractDomain(string $email): string
    {
        $parts = explode('@', strtolower(trim($email)));

        return $parts[1] ?? '';
    }

    /**
     * Check if a domain is in the blocked list (free/disposable providers).
     */
    public function isBlockedDomain(string $domain): bool
    {
        if ($domain === '') {
            return true;
        }

        return DB::connection('pgsql')
            ->table('blocked_email_domains')
            ->where('domain', strtolower($domain))
            ->exists();
    }

    /**
     * Validate a company email and return domain info.
     *
     * Returns: ['domain' => string, 'is_free' => bool, 'trust_points' => int]
     */
    public function validate(string $email): array
    {
        $domain = $this->extractDomain($email);
        $isFree = $this->isBlockedDomain($domain);

        return [
            'domain' => $domain,
            'is_free' => $isFree,
            'trust_points' => $isFree ? 0 : 10,
        ];
    }
}
