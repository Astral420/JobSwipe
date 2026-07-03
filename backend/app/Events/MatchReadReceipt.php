<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchReadReceipt implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $matchId,
        public string $readerId,
        public int $count,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('match.'.$this->matchId);
    }

    public function broadcastAs(): string
    {
        return 'read.receipt';
    }

    public function broadcastWith(): array
    {
        return [
            'match_id' => $this->matchId,
            'reader_id' => $this->readerId,
            'count' => $this->count,
            'read_at' => now()->toIso8601String(),
        ];
    }
}
