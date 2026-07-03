<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BlockedEmailDomainSeeder extends Seeder
{
    public function run(): void
    {
        $freeProviders = [
            'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk',
            'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
            'aol.com', 'icloud.com', 'me.com', 'mac.com',
            'protonmail.com', 'proton.me', 'mail.com', 'ymail.com',
            'zoho.com', 'gmx.com', 'gmx.net', 'tutanota.com',
            'fastmail.com', 'hushmail.com',
        ];

        $disposable = [
            'mailinator.com', 'guerrillamail.com', 'tempmail.com',
            'throwaway.email', 'sharklasers.com', 'guerrillamailblock.com',
            'grr.la', 'yopmail.com', 'trashmail.com', '10minutemail.com',
            'temp-mail.org', 'dispostable.com', 'maildrop.cc',
        ];

        $now = now();

        $rows = [];
        foreach ($freeProviders as $domain) {
            $rows[] = ['domain' => $domain, 'reason' => 'free_provider', 'created_at' => $now];
        }
        foreach ($disposable as $domain) {
            $rows[] = ['domain' => $domain, 'reason' => 'disposable', 'created_at' => $now];
        }

        DB::connection('pgsql')->table('blocked_email_domains')->insertOrIgnore($rows);
    }
}
