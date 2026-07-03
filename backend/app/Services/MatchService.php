<?php

namespace App\Services;

use App\Jobs\SendMatchNotification;
use App\Models\PostgreSQL\Application;
use App\Models\PostgreSQL\MatchRecord;
use App\Repositories\PostgreSQL\MatchMessageRepository;
use App\Repositories\PostgreSQL\MatchRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class MatchService
{
    public function __construct(
        private MatchRepository $matches,
        private MatchMessageRepository $messages,
        private NotificationService $notifications,
    ) {}

    /**
     * Create a new match when HR swipes right and the applicant has already applied.
     */
    public function createMatch(
        string $applicationId,
        string $applicantId,
        string $jobId,
        string $hrUserId,
        string $initialMessage,
    ): MatchRecord {
        $normalizedInitialMessage = trim($initialMessage);

        return DB::transaction(function () use ($applicationId, $applicantId, $jobId, $hrUserId, $normalizedInitialMessage) {
            // Update application status to 'matched'
            Application::where('id', $applicationId)->update(['status' => 'matched']);

            $now = now();

            $match = $this->matches->create([
                'application_id' => $applicationId,
                'applicant_id' => $applicantId,
                'job_posting_id' => $jobId,
                'hr_user_id' => $hrUserId,
                'initial_message' => $normalizedInitialMessage,
                'status' => 'pending',
                'matched_at' => $now,
                'response_deadline' => $now->copy()->addHours(24),
            ]);

            if ($normalizedInitialMessage !== '') {
                $this->messages->create(
                    matchId: $match->id,
                    senderId: $hrUserId,
                    body: $normalizedInitialMessage,
                );
            }

            // Dispatch notification to applicant
            SendMatchNotification::dispatch($applicantId, $jobId)
                ->onQueue('notifications')
                ->afterCommit();

            return $match;
        });
    }

    /**
     * Applicant accepts a pending match.
     */
    public function acceptMatch(string $matchId, string $userId): MatchRecord
    {
        $result = DB::transaction(function () use ($matchId, $userId): array {
            $match = $this->matches->findByIdOrFailForUpdate($matchId);
            $this->assertApplicantOwnership($match, $userId);

            // Idempotent accept: repeated accepts return success.
            if ($match->isAccepted()) {
                return [
                    'match' => $match->fresh(),
                    'accepted_now' => false,
                ];
            }

            if ($match->isPending()) {
                $updated = $this->matches->acceptIfPendingBeforeDeadline($matchId);
                if ($updated === 1) {
                    return [
                        'match' => $this->matches->findByIdOrFailForUpdate($matchId)->fresh(),
                        'accepted_now' => true,
                    ];
                }
            }

            $current = $this->matches->findByIdOrFailForUpdate($matchId);
            if ($current->isAccepted()) {
                return [
                    'match' => $current->fresh(),
                    'accepted_now' => false,
                ];
            }

            if ($current->isExpired() || ($current->isPending() && $current->hasDeadlinePassed())) {
                $this->matches->expireIfPendingAndDeadlinePassed($matchId);
                throw new ConflictHttpException('Match response deadline has passed.');
            }

            if ($current->isDeclined()) {
                throw new ConflictHttpException('Match was already declined.');
            }

            throw new ConflictHttpException('Match is no longer pending.');
        });

        if ($result['accepted_now'] === true) {
            $this->sendMatchAcceptedNotification($result['match']->hr_user_id, $matchId);
        }

        return $result['match'];
    }

    /**
     * Send a message, with automatic pending->accepted transition when the applicant
     * sends their first reply before deadline.
     *
     * @return array{message: \App\Models\PostgreSQL\MatchMessage, match: MatchRecord, accepted_now: bool}
     */
    public function sendMessage(
        string $matchId,
        string $senderId,
        string $body,
        ?string $clientMessageId = null,
    ): array {
        $result = DB::transaction(function () use ($matchId, $senderId, $body, $clientMessageId): array {
            $match = $this->matches->findByIdOrFailForUpdate($matchId);

            $applicantUserId = $match->applicant->user_id;
            $isApplicantSender = $senderId === $applicantUserId;
            $isHrSender = $senderId === $match->hr_user_id;

            if (! $isApplicantSender && ! $isHrSender) {
                throw new AccessDeniedHttpException('You are not a participant in this match.');
            }

            if ($clientMessageId !== null) {
                $existing = $this->messages->findByClientMessageId($matchId, $senderId, $clientMessageId);
                if ($existing !== null) {
                    return [
                        'message' => $existing,
                        'match' => $match->fresh(),
                        'accepted_now' => false,
                    ];
                }
            }

            $acceptedNow = false;

            // Auto-accept when applicant sends first message on a pending match.
            if ($isApplicantSender && $match->isPending()) {
                $updated = $this->matches->acceptIfPendingBeforeDeadline($matchId);

                if ($updated === 0) {
                    $current = $this->matches->findByIdOrFailForUpdate($matchId);

                    if ($current->isAccepted()) {
                        $match = $current;
                    } elseif ($current->isExpired() || ($current->isPending() && $current->hasDeadlinePassed())) {
                        $this->matches->expireIfPendingAndDeadlinePassed($matchId);
                        throw new ConflictHttpException('Match response deadline has passed.');
                    } else {
                        throw new ConflictHttpException('Match is no longer pending.');
                    }
                } else {
                    $acceptedNow = true;
                    $match = $this->matches->findByIdOrFailForUpdate($matchId);
                }
            }

            if (! $match->isChatActive()) {
                throw new UnprocessableEntityHttpException(
                    'This match chat is not active. It may be pending, closed, or expired.'
                );
            }

            $message = $this->messages->create(
                matchId: $matchId,
                senderId: $senderId,
                body: $body,
                clientMessageId: $clientMessageId,
            );

            return [
                'message' => $message,
                'match' => $match->fresh(),
                'accepted_now' => $acceptedNow,
            ];
        });

        if ($result['accepted_now'] === true) {
            $this->sendMatchAcceptedNotification($result['match']->hr_user_id, $matchId);
        }

        return $result;
    }

    /**
     * Applicant declines a pending match.
     */
    public function declineMatch(string $matchId, string $userId): MatchRecord
    {
        $result = DB::transaction(function () use ($matchId, $userId): array {
            $match = $this->matches->findByIdOrFailForUpdate($matchId);
            $this->assertApplicantOwnership($match, $userId);

            // Idempotent decline: repeated declines return success.
            if ($match->isDeclined()) {
                return [
                    'match' => $match->fresh(),
                    'declined_now' => false,
                ];
            }

            if ($match->isPending()) {
                $updated = $this->matches->declineIfPendingBeforeDeadline($matchId);
                if ($updated === 1) {
                    return [
                        'match' => $this->matches->findByIdOrFailForUpdate($matchId)->fresh(),
                        'declined_now' => true,
                    ];
                }
            }

            $current = $this->matches->findByIdOrFailForUpdate($matchId);
            if ($current->isDeclined()) {
                return [
                    'match' => $current->fresh(),
                    'declined_now' => false,
                ];
            }

            if ($current->isExpired() || ($current->isPending() && $current->hasDeadlinePassed())) {
                $this->matches->expireIfPendingAndDeadlinePassed($matchId);
                throw new ConflictHttpException('Match response deadline has passed.');
            }

            if ($current->isAccepted()) {
                throw new ConflictHttpException('Match was already accepted.');
            }

            throw new ConflictHttpException('Match is no longer pending.');
        });

        if ($result['declined_now'] === true) {
            $this->notifications->create(
                userId: $result['match']->hr_user_id,
                type: 'match_declined',
                title: 'Match Declined',
                body: 'An applicant has declined your match.',
                data: ['match_id' => $matchId],
            );
        }

        return $result['match'];
    }

    /**
     * HR closes an accepted match chat. Messages are preserved but no new ones allowed.
     */
    public function closeMatch(string $matchId, string $hrUserId): MatchRecord
    {
        $match = $this->matches->findByIdOrFail($matchId);

        if ($match->hr_user_id !== $hrUserId) {
            throw new AccessDeniedHttpException('You are not the HR user for this match.');
        }

        $updated = $this->matches->closeIfAccepted($matchId, $hrUserId);
        if ($updated === 0) {
            throw new ConflictHttpException('Only accepted matches can be closed.');
        }

        // Notify applicant that HR closed the chat
        $applicantUserId = $match->applicant->user_id;

        $this->notifications->create(
            userId: $applicantUserId,
            type: 'match_closed',
            title: 'Chat Closed',
            body: 'The HR representative has closed this match conversation.',
            data: ['match_id' => $matchId],
        );

        $this->notifications->sendPush(
            userId: $applicantUserId,
            type: 'match_closed',
            title: 'Chat Closed',
            body: 'The HR representative has closed this match conversation.',
            data: ['match_id' => $matchId],
        );

        return $match->fresh();
    }

    /**
     * Bulk-expire matches that have passed their response deadline.
     */
    public function expirePendingMatches(): int
    {
        $expiredMatches = $this->matches->getPendingExpired();
        $count = 0;

        foreach ($expiredMatches as $match) {
            try {
                $updated = $this->matches->expireIfPendingAndDeadlinePassed($match->id);
                if ($updated === 0) {
                    continue;
                }

                // Notify both parties
                $applicantUserId = $match->applicant->user_id;

                $this->notifications->create(
                    userId: $applicantUserId,
                    type: 'match_expired',
                    title: 'Match Expired',
                    body: 'Your match response window has expired.',
                    data: ['match_id' => $match->id],
                );

                $this->notifications->create(
                    userId: $match->hr_user_id,
                    type: 'match_expired',
                    title: 'Match Expired',
                    body: 'The applicant did not respond within the 24-hour window.',
                    data: ['match_id' => $match->id],
                );

                $count++;
            } catch (\Throwable $e) {
                Log::error("Failed to expire match {$match->id}: {$e->getMessage()}");
            }
        }

        return $count;
    }

    /**
     * Get matches for an applicant's inbox.
     */
    public function getApplicantMatches(string $applicantId, ?string $status = null, int $perPage = 20)
    {
        // Proactively expire stale pending rows so lists don't show expired decisions as pending.
        $this->matches->expirePendingForApplicant($applicantId);

        return $this->matches->getForApplicant($applicantId, $status, $perPage);
    }

    /**
     * Get matches for an HR user.
     */
    public function getHrMatches(string $hrUserId, ?string $jobId = null, ?string $status = null, int $perPage = 20)
    {
        // Keep HR list consistent even between scheduler runs.
        $this->matches->expirePendingForHrUser($hrUserId);

        return $this->matches->getForHrUser($hrUserId, $jobId, $status, $perPage);
    }

    /**
     * Get full match detail with participant validation.
     */
    public function getMatchDetail(string $matchId, string $userId): MatchRecord
    {
        $match = $this->matches->findByIdOrFail($matchId);

        // Resolve scheduler-lag edge case for detail reads.
        if ($match->isPending() && $match->hasDeadlinePassed()) {
            $this->matches->expireIfPendingAndDeadlinePassed($matchId);
            $match = $this->matches->findByIdOrFail($matchId);
        }

        // Validate the user is a participant (applicant's user_id or HR user)
        $applicantUserId = $match->applicant->user_id;

        if ($userId !== $applicantUserId && $userId !== $match->hr_user_id) {
            throw new AccessDeniedHttpException('You are not a participant in this match.');
        }

        $match->load(['application', 'jobPosting.company', 'applicant.user', 'hrUser']);

        return $match;
    }

    /**
     * Assert that the authenticated user owns the applicant profile on this match.
     */
    private function assertApplicantOwnership(MatchRecord $match, string $userId): void
    {
        $applicantUserId = $match->applicant->user_id;

        if ($userId !== $applicantUserId) {
            throw new AccessDeniedHttpException('You are not the applicant for this match.');
        }
    }

    private function sendMatchAcceptedNotification(string $hrUserId, string $matchId): void
    {
        $this->notifications->create(
            userId: $hrUserId,
            type: 'match_accepted',
            title: 'Match Accepted!',
            body: 'An applicant has accepted your match and is ready to chat.',
            data: ['match_id' => $matchId],
        );

        $this->notifications->sendPush(
            userId: $hrUserId,
            type: 'match_accepted',
            title: 'Match Accepted! 🎉',
            body: 'Your matched applicant is ready to chat.',
            data: ['match_id' => $matchId],
        );
    }
}
