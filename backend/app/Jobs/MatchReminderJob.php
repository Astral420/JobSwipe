<?php

namespace App\Jobs;

use App\Models\PostgreSQL\MatchRecord;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Throwable;

class MatchReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function handle(NotificationService $notifications): void
    {
        $sentCount = 0;

        // Find pending matches expiring within 6 hours
        $sixHourMatches = MatchRecord::where('status', 'pending')
            ->whereBetween('response_deadline', [now(), now()->addHours(6)])
            ->where('response_deadline', '>', now()->addHour()) // exclude 1h window (handled separately)
            ->get();

        foreach ($sixHourMatches as $match) {
            if ($this->sendReminder($match, '6 hours', $notifications)) {
                $sentCount++;
            }
        }

        // Find pending matches expiring within 1 hour
        $oneHourMatches = MatchRecord::where('status', 'pending')
            ->whereBetween('response_deadline', [now(), now()->addHour()])
            ->get();

        foreach ($oneHourMatches as $match) {
            if ($this->sendReminder($match, '1 hour', $notifications)) {
                $sentCount++;
            }
        }

        if ($sentCount > 0) {
            Log::info("MatchReminderJob: sent {$sentCount} reminders");
        }
    }

    private function sendReminder(MatchRecord $match, string $timeLeft, NotificationService $notifications): bool
    {
        // Use Redis to prevent duplicate reminders within the same window
        $redisKey = "match_reminder:{$match->id}:{$timeLeft}";

        // If we already sent this specific reminder, skip
        $alreadySent = Redis::get($redisKey);
        if ($alreadySent) {
            return false;
        }

        try {
            $applicantUserId = $match->applicant->user_id;
            $companyName = $match->jobPosting->company->company_name ?? 'a company';

            $notifications->create(
                userId: $applicantUserId,
                type: 'match_reminder',
                title: 'Match Expiring Soon',
                body: "⏰ Your match with {$companyName} expires in {$timeLeft}! Reply now to connect.",
                data: ['match_id' => $match->id, 'time_remaining' => $timeLeft],
            );

            $notifications->sendPush(
                userId: $applicantUserId,
                type: 'match_reminder',
                title: "⏰ {$timeLeft} left!",
                body: "Your match with {$companyName} is expiring soon. Don't miss out!",
                data: ['match_id' => $match->id],
            );

            // Mark as sent, expire after 7 hours (longer than any reminder window)
            Redis::setex($redisKey, 7 * 3600, '1');

            return true;
        } catch (Throwable $e) {
            Log::error("Failed to send match reminder for {$match->id}: {$e->getMessage()}");

            return false;
        }
    }

    public function failed(Throwable $exception): void
    {
        Log::critical("MatchReminderJob failed permanently: {$exception->getMessage()}");
    }
}
