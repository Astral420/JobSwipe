<?php

namespace App\WebSocket;

use App\Models\PostgreSQL\MatchRecord;
use App\Models\PostgreSQL\User;
use App\Repositories\PostgreSQL\MatchMessageRepository;
use App\Repositories\PostgreSQL\MatchRepository;

/**
 * MatchChatHandler provides the WebSocket server-side logic for match messaging.
 *
 * With Laravel Reverb, the WebSocket transport layer is handled by Reverb itself.
 * This handler is called from MatchMessageController when messages are sent via
 * the REST API, and broadcasts events through Laravel's event broadcasting system.
 *
 * The WebSocket flow:
 * 1. Client connects to Reverb WebSocket server (ws://host:8080) using Pusher protocol
 * 2. Client subscribes to private channel "match.{matchId}"
 * 3. When a message is sent via REST API, the controller persists it and dispatches
 *    a broadcast event (MatchMessageSent, TypingIndicator, ReadReceipt)
 * 4. Reverb pushes the event to all subscribed clients on the channel
 *
 * This class provides channel authorization and utility methods
 * used by the BroadcastServiceProvider.
 */
class MatchChatHandler
{
    public function __construct(
        private MatchRepository $matches,
        private MatchMessageRepository $messages,
    ) {}

    /**
     * Authorize a user to join a private match channel.
     * Called from routes/channels.php for "match.{matchId}" channels.
     */
    public function authorizeChannel(User $user, string $matchId): bool
    {
        $match = $this->matches->findById($matchId);

        if (! $match) {
            return false;
        }

        return $this->isParticipant($match, $user);
    }

    /**
     * Check if a user is a participant (applicant or HR) in a match.
     */
    public function isParticipant(MatchRecord $match, User $user): bool
    {
        $applicantUserId = $match->applicant->user_id;

        return $user->id === $applicantUserId || $user->id === $match->hr_user_id;
    }
}
