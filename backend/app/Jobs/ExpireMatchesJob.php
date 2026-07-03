<?php

namespace App\Jobs;

use App\Repositories\PostgreSQL\MatchRepository;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class ExpireMatchesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function handle(MatchRepository $matches, NotificationService $notifications): void
    {
        $expiredCount = 0;
        $failedCount = 0;

        $pendingExpired = $matches->getPendingExpired();

        foreach ($pendingExpired as $match) {
            try {
                $updated = $matches->expireIfPendingAndDeadlinePassed($match->id);
                if ($updated === 0) {
                    continue;
                }

                // Notify applicant
                $applicantUserId = $match->applicant->user_id;

                $notifications->create(
                    userId: $applicantUserId,
                    type: 'match_expired',
                    title: 'Match Expired',
                    body: 'Your match response window has expired.',
                    data: ['match_id' => $match->id],
                );

                $notifications->sendPush(
                    userId: $applicantUserId,
                    type: 'match_expired',
                    title: 'Match Expired ⏰',
                    body: 'Your match response window has expired.',
                    data: ['match_id' => $match->id],
                );

                // Notify HR
                $notifications->create(
                    userId: $match->hr_user_id,
                    type: 'match_expired',
                    title: 'Match Expired',
                    body: 'The applicant did not respond within the 24-hour window.',
                    data: ['match_id' => $match->id],
                );

                $expiredCount++;
            } catch (Throwable $e) {
                $failedCount++;
                Log::error("Failed to expire match {$match->id}: {$e->getMessage()}");
            }
        }

        if ($expiredCount > 0 || $failedCount > 0) {
            Log::info("ExpireMatchesJob completed: {$expiredCount} expired, {$failedCount} failed");
        }
    }

    public function failed(Throwable $exception): void
    {
        Log::critical("ExpireMatchesJob failed permanently: {$exception->getMessage()}");
    }
}
