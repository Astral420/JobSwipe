<?php

namespace Database\Factories;

use App\Models\PostgreSQL\MatchMessage;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<MatchMessage>
 */
class MatchMessageFactory extends Factory
{
    protected $model = MatchMessage::class;

    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'match_id' => Str::uuid()->toString(),
            'sender_id' => Str::uuid()->toString(),
            'body' => fake()->sentence(),
            'created_at' => now(),
        ];
    }

    /**
     * Indicate the message has been read.
     */
    public function read(): static
    {
        return $this->state(['read_at' => now()]);
    }

    /**
     * Set the client_message_id for idempotency.
     */
    public function withClientMessageId(?string $clientMessageId = null): static
    {
        return $this->state([
            'client_message_id' => $clientMessageId ?? Str::uuid()->toString(),
        ]);
    }
}
