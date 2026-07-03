<?php

namespace App\Events;

use App\Models\PostgreSQL\MatchMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public MatchMessage $message,
    ) {
        // Eager-load sender so broadcastWith() can access ->sender->role without a lazy query
        $this->message->loadMissing('sender:id,role');
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('match.'.$this->message->match_id);
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'match_id' => $this->message->match_id,
            'sender_id' => $this->message->sender_id,
            'sender_role' => $this->message->sender?->role,
            'body' => $this->message->body,
            'created_at' => $this->message->created_at->toIso8601String(),
            'read_at' => $this->message->read_at?->toIso8601String(),
        ];
    }
}
