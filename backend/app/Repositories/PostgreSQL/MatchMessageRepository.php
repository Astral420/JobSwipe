<?php

namespace App\Repositories\PostgreSQL;

use App\Models\PostgreSQL\MatchMessage;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\QueryException;

class MatchMessageRepository
{
    public function create(string $matchId, string $senderId, string $body, ?string $clientMessageId = null): MatchMessage
    {
        $payload = [
            'match_id' => $matchId,
            'sender_id' => $senderId,
            'body' => $body,
        ];

        if ($clientMessageId !== null) {
            $payload['client_message_id'] = $clientMessageId;
        }

        try {
            return MatchMessage::create($payload);
        } catch (QueryException $e) {
            if (! $this->isUniqueViolation($e) || $clientMessageId === null) {
                throw $e;
            }

            $existing = $this->findByClientMessageId($matchId, $senderId, $clientMessageId);
            if ($existing instanceof MatchMessage) {
                return $existing;
            }

            throw $e;
        }
    }

    public function getForMatch(string $matchId, int $perPage = 50): LengthAwarePaginator
    {
        return MatchMessage::where('match_id', $matchId)
            ->with('sender:id,role')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    public function markAsRead(string $matchId, string $userId): int
    {
        return MatchMessage::where('match_id', $matchId)
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    public function getUnreadCount(string $matchId, string $userId): int
    {
        return MatchMessage::where('match_id', $matchId)
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->count();
    }

    public function findByClientMessageId(string $matchId, string $senderId, string $clientMessageId): ?MatchMessage
    {
        return MatchMessage::where('match_id', $matchId)
            ->where('sender_id', $senderId)
            ->where('client_message_id', $clientMessageId)
            ->first();
    }

    private function isUniqueViolation(QueryException $exception): bool
    {
        return $exception->getCode() === '23505'
            || (($exception->errorInfo[0] ?? null) === '23505');
    }
}
