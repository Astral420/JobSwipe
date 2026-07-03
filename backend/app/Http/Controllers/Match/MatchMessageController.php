<?php

namespace App\Http\Controllers\Match;

use App\Events\MatchMessageSent;
use App\Events\MatchReadReceipt;
use App\Events\MatchTypingIndicator;
use App\Http\Controllers\Controller;
use App\Http\Requests\Match\SendMatchMessageRequest;
use App\Repositories\PostgreSQL\MatchMessageRepository;
use App\Repositories\PostgreSQL\MatchRepository;
use App\Services\MatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class MatchMessageController extends Controller
{
    public function __construct(
        private MatchRepository $matches,
        private MatchMessageRepository $messages,
        private MatchService $matchService,
    ) {}

    /**
     * GET /v1/matches/{matchId}/messages
     *
     * List messages for a match. Both participants can access.
     */
    public function index(Request $request, string $matchId): JsonResponse
    {
        $user = $request->user();
        $match = $this->matches->findByIdOrFail($matchId);

        $this->assertParticipant($match, $user->id);

        $messages = $this->messages->getForMatch(
            matchId: $matchId,
            perPage: $this->resolvePerPage($request, 50),
        );

        return $this->success($messages, 'Messages retrieved.');
    }

    /**
     * POST /v1/matches/{matchId}/messages
     *
     * Send a message in a match chat.
     */
    public function store(SendMatchMessageRequest $request, string $matchId): JsonResponse
    {
        $user = $request->user();
        $payload = $request->validated();

        try {
            $result = $this->matchService->sendMessage(
                matchId: $matchId,
                senderId: $user->id,
                body: $payload['body'],
                clientMessageId: $payload['client_message_id'] ?? null,
            );
        } catch (AccessDeniedHttpException) {
            return $this->error('NOT_MATCH_PARTICIPANT', 'You are not a participant in this match.', 403);
        } catch (ConflictHttpException $e) {
            if ($e->getMessage() === 'Match response deadline has passed.') {
                return $this->error('MATCH_RESPONSE_DEADLINE_PASSED', $e->getMessage(), 409);
            }

            return $this->error('MATCH_NO_LONGER_PENDING', $e->getMessage(), 409);
        } catch (UnprocessableEntityHttpException $e) {
            return $this->error('CHAT_NOT_ACTIVE', $e->getMessage(), 422);
        }

        $message = $result['message'];

        // Broadcast to WebSocket channel via Reverb only for newly created messages.
        if ($message->wasRecentlyCreated) {
            \Log::info('Broadcasting message', [
                'message_id' => $message->id,
                'match_id' => $message->match_id,
                'channel' => 'private-match.'.$message->match_id,
            ]);
            broadcast(new MatchMessageSent($message))->toOthers();
            \Log::info('Broadcast dispatched');
        }

        return $this->success(
            $message,
            'Message sent.',
            $message->wasRecentlyCreated ? 201 : 200,
            [
                'match_status' => $result['match']->status,
                'accepted_now' => $result['accepted_now'],
            ],
        );
    }

    /**
     * POST /v1/matches/{matchId}/messages/typing
     *
     * Broadcast a typing indicator to other participants.
     */
    public function typing(Request $request, string $matchId): JsonResponse
    {
        $user = $request->user();
        $match = $this->matches->findByIdOrFail($matchId);

        $this->assertParticipant($match, $user->id);

        if ($match->isChatActive()) {
            broadcast(new MatchTypingIndicator($matchId, $user->id))->toOthers();
        }

        return $this->success(null, 'Typing indicator sent.');
    }

    /**
     * PATCH /v1/matches/{matchId}/messages/read
     *
     * Mark all messages as read for the authenticated user.
     */
    public function markAsRead(Request $request, string $matchId): JsonResponse
    {
        $user = $request->user();
        $match = $this->matches->findByIdOrFail($matchId);

        $this->assertParticipant($match, $user->id);

        $count = $this->messages->markAsRead($matchId, $user->id);

        // Broadcast read receipt to other participants via Reverb
        if ($count > 0) {
            broadcast(new MatchReadReceipt($matchId, $user->id, $count))->toOthers();
        }

        return $this->success(['marked_read' => $count], "{$count} messages marked as read.");
    }

    /**
     * Validate the authenticated user is a participant of the match.
     */
    private function assertParticipant($match, string $userId): void
    {
        $applicantUserId = $match->applicant->user_id;

        if ($userId !== $applicantUserId && $userId !== $match->hr_user_id) {
            abort(403, 'You are not a participant in this match.');
        }
    }

    private function resolvePerPage(Request $request, int $default = 50, int $max = 100): int
    {
        $perPage = (int) $request->input('per_page', $default);

        if ($perPage < 1) {
            return $default;
        }

        return min($perPage, $max);
    }
}
