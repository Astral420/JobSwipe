# Initial Message as First Chat Message

## Goal

When HR swipes right on an applicant and a match is created, the HR's initial message (from the `interview_template` or custom override) should be automatically inserted as the **first message** in the `match_messages` table. This way, when the applicant opens the match chat, they immediately see the HR's message — making the experience feel like a natural conversation rather than just seeing metadata on the match card.

## Current Behavior

1. HR swipes right → `ApplicantReviewController::swipeRight` resolves the message via `processMessageTemplate()`
2. Message is passed to `SwipeService::hrSwipeRight` → `MatchService::createMatch` as `$initialMessage`
3. `MatchService::createMatch` stores it in `matches.initial_message` column (metadata only)
4. **No entry is created in `match_messages`** — the chat starts empty

## Desired Behavior

1. Same flow as above, but after the `MatchRecord` is created...
2. The `initial_message` is also inserted into `match_messages` as a real message
3. The `sender_id` should be the **HR user's ID** (`$hrUserId`)
4. The message appears as the first entry when the applicant opens the chat
5. The `matches.initial_message` column can be kept for quick access / preview without joining

---

## Proposed Changes

### [MODIFY] `app/Services/MatchService.php`

In the `createMatch()` method, after the `MatchRecord` is created and within the same DB transaction, insert the initial message into `match_messages`:

```php
// Normalize first, so metadata + first message stay consistent
$normalizedInitialMessage = trim($initialMessage);

// Inside createMatch(), after MatchRecord::create()
if ($normalizedInitialMessage !== '') {
    $this->messages->create(
        matchId: $match->id,
        senderId: $hrUserId,
        body: $normalizedInitialMessage,
    );
}
```

The insertion must be **inside the existing `DB::transaction()`** so it rolls back with the match if anything fails.

#### Key details:
- `sender_id` = `$hrUserId` (already passed as a parameter)
- `match_id` = the newly created `$match->id`
- `body` = normalized (trimmed) initial message
- `is_system_message` = not needed right now (the HR authored it)

### [MODIFY] `app/Jobs/SendMatchNotification.php` dispatch callsite

Dispatch match notification **after commit** to prevent edge cases where workers read before transaction commit.

```php
SendMatchNotification::dispatch($applicantId, $jobId)
    ->onQueue('notifications')
    ->afterCommit();
```

### [MODIFY] `app/Models/PostgreSQL/MatchMessage.php`

No changes needed — the model already supports creating messages with `match_id`, `sender_id`, and `body`.

### [MODIFY] `app/Repositories/PostgreSQL/MatchMessageRepository.php`

No changes needed — the `create()` method already accepts `matchId`, `senderId`, and `body`.

### No Migration Needed

The `match_messages` table already has the correct schema. The `matches.initial_message` column remains as-is for backward compatibility and quick-preview access.

---

## Impact Analysis

| Area | Impact |
|---|---|
| **MatchService::createMatch** | Add 1 repository call inside existing transaction |
| **Chat UX** | Applicant sees HR's message immediately when opening the match |
| **Notifications** | No product behavior change, but dispatch should run `afterCommit()` for reliability |
| **24h Timer** | No effect — deadline is independent of messages |
| **Message count** | First message will count in unread badge for applicant |
| **WebSocket** | No broadcast needed — match hasn't been accepted yet, chat channel isn't active |

## Edge Cases

1. **Whitespace-only initial message**: Guard with trim-based check (`$normalizedInitialMessage !== ''`) to avoid empty-looking chat messages
2. **Message ordering**: The `created_at` timestamp will be set at match creation time, so it's guaranteed to be the oldest message
3. **Read status**: `read_at` will be `NULL` — it shows as unread, which is correct since the applicant hasn't seen it yet
4. **Worker races on notifications**: Dispatch notification with `afterCommit()` so queued workers never observe pre-commit state

## Verification

- Create a match via HR swipe right
- Query `match_messages` for the new match — should have exactly 1 row
- Verify `sender_id` matches the HR user
- Verify `body` matches the processed template message
- Open `/v1/matches/{matchId}/messages` as applicant — first message should be the HR initial message

## Flaws Found in Previous Draft

1. `if (! empty($initialMessage))` is not strict enough (whitespace-only content can pass).
2. Verification pointed to match detail payload, but message history is exposed by the paginated messages endpoint.
3. Notification dispatch timing did not account for transaction commit ordering.
