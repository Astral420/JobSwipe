<?php

use App\Jobs\ExpireApplicantSubscriptionsJob;
use App\Jobs\ExpireJobPostingsJob;
use App\Jobs\ExpireMatchesJob;
use App\Jobs\MatchReminderJob;
use App\Jobs\ResetDailySwipesJob;
use App\Jobs\RetryStripeWebhookEventsJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Check for expired job postings every 30 minutes
Schedule::job(new ExpireJobPostingsJob)->everyThirtyMinutes();
// Schedule daily swipe reset at midnight Philippine Time (UTC+8)
Schedule::job(new ResetDailySwipesJob)
    ->dailyAt('00:00')
    ->timezone(config('app.timezone'))
    ->name('reset-daily-swipes')
    ->withoutOverlapping();
// Check for expired applicant subscriptions every hour
Schedule::job(new ExpireApplicantSubscriptionsJob)
    ->hourly()
    ->name('expire-applicant-subscriptions')
    ->withoutOverlapping();
// Retry failed or stale Stripe webhook processing entries.
Schedule::job(new RetryStripeWebhookEventsJob)
    ->everyFiveMinutes()
    ->name('retry-stripe-webhooks')
    ->withoutOverlapping();

// ── Match System Scheduled Jobs ───────────────────────────────────────
// Expire pending matches past their 24h response deadline (checks every 5 min)
Schedule::job(new ExpireMatchesJob)
    ->everyFiveMinutes()
    ->name('expire-matches')
    ->withoutOverlapping();
// Send reminder notifications to applicants before match deadline (6h and 1h)
Schedule::job(new MatchReminderJob)
    ->everyFifteenMinutes()
    ->name('match-reminders')
    ->withoutOverlapping();

// ── Trust Score System Scheduled Commands ─────────────────────────────
// Recalculate all company trust scores monthly (1st of month at 2am)
Schedule::command('trust:refresh')
    ->monthlyOn(1, '02:00')
    ->timezone(config('app.timezone'))
    ->name('refresh-trust-scores')
    ->withoutOverlapping();
// Award clean month bonus to companies with no incidents (1st of month at 3am)
Schedule::command('trust:clean-month')
    ->monthlyOn(1, '03:00')
    ->timezone(config('app.timezone'))
    ->name('award-clean-month-bonus')
    ->withoutOverlapping();
