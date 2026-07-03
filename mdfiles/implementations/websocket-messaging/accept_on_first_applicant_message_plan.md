# Accept On First Applicant Message - Implementation Plan

## Goal

Change the match lifecycle so a `pending` match becomes `accepted` when the applicant sends their first message before the 24-hour deadline.

This avoids split state (`accepted` but no first message) and better matches Bumble-style behavior.

---

## Current Behavior (As-Is)

1. HR creates match -> status is `pending`.
2. Applicant must call `POST /v1/applicant/matches/{id}/accept`.
3. After status becomes `accepted`, chat send is allowed.
4. If no accept before deadline, scheduler expires the match.

---

## Proposed Product Behavior

1. HR creates `pending` match as today.
2. Applicant opens match and types a reply.
3. Applicant taps Send.
4. Backend atomically does:
   - transition `pending` -> `accepted` (if before deadline)
   - insert applicant message
5. If transaction commits, match is accepted and first message exists.
6. If deadline already passed, send fails with explicit expiry error.

---

## API Strategy

## Recommendation: Keep Existing Message Endpoint, Add Auto-Accept Logic

Keep `POST /v1/matches/{matchId}/messages` unchanged at API surface.

Behavior change inside backend:
- If sender is applicant and match is `pending`, attempt acceptance inline.
- If sender is applicant and match is already `accepted`, send normally.
- If sender is HR while match is `pending`, reject (`CHAT_NOT_ACTIVE`) as today.

Why this approach:
- No frontend endpoint churn.
- One user action (Send) maps to one API call.
- Acceptance + first message can be made atomic.

---

## Backend Implementation Plan

## 1) Add Service Method For Atomic "Accept + Send"

Create a method in `MatchService` (or a dedicated chat orchestration service):

`sendMessageWithAutoAccept(matchId, senderUserId, body)`

Inside one `DB::transaction()`:
1. Load + participant check.
2. If sender is applicant:
   - If status = `pending`, run conditional update:
     - `status='accepted'`
     - `responded_at=now()`
     - where `id=? AND status='pending' AND response_deadline > now()`
   - If update count = 0, re-read current status and throw specific conflict:
     - expired/deadline passed -> `MATCH_RESPONSE_DEADLINE_PASSED`
     - declined/closed -> `MATCH_NOT_ACCEPTABLE`
   - If status = `accepted`, continue.
3. Enforce chat-active rule for all non-applicant-pending cases.
4. Insert message row.
5. Return fresh message + current match status.

Notes:
- Keep status transition and first message insert in the same transaction.
- Broadcast event only after successful commit.

## 2) Refactor Controller To Use Service Method

Update `MatchMessageController@store`:
- Replace direct repo calls with service orchestration call.
- Keep response shape stable where possible.
- Return updated match status in payload for easy frontend sync.

## 3) Improve Conflict/Error Mapping

Use explicit, stable error codes/messages:
- `MATCH_RESPONSE_DEADLINE_PASSED` (409)
- `MATCH_NO_LONGER_PENDING` (409)
- `CHAT_NOT_ACTIVE` (422)
- `NOT_MATCH_PARTICIPANT` (403)

This fixes current ambiguous near-deadline error handling.

## 4) Keep Existing Accept Endpoint (Compatibility)

Keep `POST /v1/applicant/matches/{id}/accept` for backward compatibility.

Behavior after rollout:
- Explicit Accept still works.
- First applicant message can also perform acceptance.
- Frontend can gradually stop calling explicit accept first.

---

## Frontend Behavior Plan

## Short-term (No Breaking Change)

1. Pending match UI still shows countdown.
2. Applicant can type and tap Send while pending.
3. Frontend calls existing message endpoint.
4. On success:
   - update local match status to `accepted`
   - hide decision timer UI
   - continue normal chat flow
5. On `MATCH_RESPONSE_DEADLINE_PASSED`:
   - disable composer
   - refresh match detail
   - show "Match expired" state

## Optional Transition

- Keep Accept button temporarily as fallback.
- Eventually remove or demote Accept CTA if product decides "first message = accept" is primary behavior.

---

## Edge Cases To Handle Explicitly

1. Deadline boundary (`response_deadline == now`) should fail acceptance.
2. Expire job races should yield explicit expiry code, not generic conflict.
3. Double taps/retries should not double-accept (status update is naturally idempotent).
4. Message duplicates from retry should be handled (see idempotency below).
5. HR cannot force auto-accept by sending message while pending.

---

## Idempotency Plan (Recommended)

To avoid duplicate first messages on network retries:

Option A (recommended):
- Add `client_message_id` (UUID/string) to `match_messages`.
- Unique index: `(match_id, sender_id, client_message_id)`.
- Frontend generates one UUID per send attempt and reuses it on retry.

Option B (lighter):
- Accept potential duplicates and handle client-side dedupe heuristically.

---

## Data/Migration Impact

Minimum path: no schema change required.

Recommended path: add migration for `client_message_id` + unique index for robust idempotency.

---

## Testing Plan

## Unit/Service Tests

1. Applicant sends first message before deadline -> status becomes `accepted`, message created.
2. Applicant sends first message after deadline -> 409 deadline error, no message created.
3. Applicant sends message when already accepted -> message created, status unchanged.
4. HR sends message while pending -> 422 chat not active.
5. Close race: if match closes before insert, message should not be inserted.

## Concurrency Tests

1. Two applicant sends at same time on pending match:
   - one performs acceptance
   - both may create messages (unless idempotency key same)
2. Expire job vs first send at boundary:
   - deterministic conflict response
   - no partial writes

## API Contract Tests

- Ensure response payload includes effective status and message object.
- Ensure old accept endpoint still works.

---

## Rollout Plan

1. Ship backend logic behind feature flag (optional): `MATCH_AUTO_ACCEPT_ON_FIRST_MESSAGE`.
2. Update mobile/web clients to allow send while pending.
3. Monitor errors for 409 deadline conflicts and duplicate sends.
4. Remove dependency on explicit accept action in UI once stable.

---

## Files Expected To Change

- `backend/app/Http/Controllers/Match/MatchMessageController.php`
- `backend/app/Services/MatchService.php`
- `backend/app/Repositories/PostgreSQL/MatchRepository.php`
- `backend/app/Repositories/PostgreSQL/MatchMessageRepository.php` (if idempotency support added)
- `backend/app/Http/Requests/Match/SendMatchMessageRequest.php` (if `client_message_id` added)
- `backend/routes/api.php` (only if adding a new dedicated endpoint)
- `backend/tests/...` (service + feature tests)

---

## Success Criteria

1. Applicant's first successful message on `pending` match always results in `accepted` status.
2. No state where first message exists but match remains `pending`.
3. Expired matches consistently return explicit deadline error.
4. Frontend needs only one action (Send) to both accept and initiate chat.
