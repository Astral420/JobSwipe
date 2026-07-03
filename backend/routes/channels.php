<?php

use App\WebSocket\MatchChatHandler;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Register all event broadcasting channels that your application supports.
| Private channels require authentication to join.
|
*/

/**
 * Private channel for match messaging.
 * Both the applicant and the HR user associated with a match can join.
 */
Broadcast::channel('match.{matchId}', function ($user, string $matchId) {
    $handler = app(MatchChatHandler::class);

    return $handler->authorizeChannel($user, $matchId);
});
