<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchTypingIndicator implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $matchId,
        public string $userId,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('match.'.$this->matchId);
    }

    public function broadcastAs(): string
    {
        return 'typing';
    }

    public function broadcastWith(): array
    {
        return [
            'match_id' => $this->matchId,
            'user_id' => $this->userId,
        ];
    }
}
