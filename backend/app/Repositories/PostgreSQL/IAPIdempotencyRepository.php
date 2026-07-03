<?php

namespace App\Repositories\PostgreSQL;

use App\Exceptions\IAPException;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class IAPIdempotencyRepository
{
    private const PENDING_TIMEOUT_SECONDS = 30;

    /**
     * Reserve an idempotency key with database transaction and locking.
     * Returns status information about the reservation.
     *
     * @return array{status: string, record_id: int, result?: array}
     *
     * @throws IAPException
     */
    public function reserve(
        string $userId,
        string $idempotencyKey,
        string $requestFingerprint,
        int $ttlSeconds = 86400
    ): array {
        $expiresAt = now()->addSeconds($ttlSeconds);

        return DB::transaction(function () use ($userId, $idempotencyKey, $requestFingerprint, $expiresAt) {
            // Insert or ignore to handle concurrent requests
            DB::table('iap_idempotency_keys')->insertOrIgnore([
                'user_id' => $userId,
                'idempotency_key' => $idempotencyKey,
                'request_fingerprint' => $requestFingerprint,
                'expires_at' => $expiresAt,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Lock the record for update
            $record = DB::table('iap_idempotency_keys')
                ->where('idempotency_key', $idempotencyKey)
                ->lockForUpdate()
                ->first();

            if (! $record) {
                throw new IAPException(
                    'IDEMPOTENCY_RESERVATION_FAILED',
                    'Unable to reserve idempotency key.',
                    500
                );
            }

            // Check if key has expired - if so, reset it for reuse
            if ($record->expires_at !== null && Carbon::parse((string) $record->expires_at)->isPast()) {
                DB::table('iap_idempotency_keys')
                    ->where('id', $record->id)
                    ->update([
                        'user_id' => $userId,
                        'request_fingerprint' => $requestFingerprint,
                        'result' => null,
                        'expires_at' => $expiresAt,
                        'updated_at' => now(),
                    ]);

                return [
                    'status' => 'reserved',
                    'record_id' => (int) $record->id,
                ];
            }

            // Check for fingerprint mismatch - same key, different request
            if ((string) $record->user_id !== $userId || (string) $record->request_fingerprint !== $requestFingerprint) {
                throw new IAPException(
                    'IDEMPOTENCY_KEY_REUSED',
                    'Idempotency key already used with a different request payload.',
                    409
                );
            }

            // Check if we have a cached result
            if ($record->result !== null) {
                $result = is_string($record->result) ? json_decode($record->result, true) : $record->result;

                return [
                    'status' => 'cached',
                    'record_id' => (int) $record->id,
                    'result' => is_array($result) ? $result : [],
                ];
            }

            // Check if request is still in progress (updated recently but no result yet)
            if ($record->updated_at !== null && Carbon::parse((string) $record->updated_at)->gt(now()->subSeconds(self::PENDING_TIMEOUT_SECONDS))) {
                return [
                    'status' => 'in_progress',
                    'record_id' => (int) $record->id,
                ];
            }

            // Update the timestamp to mark as in-progress
            DB::table('iap_idempotency_keys')
                ->where('id', $record->id)
                ->update([
                    'expires_at' => $expiresAt,
                    'updated_at' => now(),
                ]);

            return [
                'status' => 'reserved',
                'record_id' => (int) $record->id,
            ];
        }, 3);
    }

    /**
     * Persist the purchase result to the idempotency key record.
     */
    public function persistResult(int $recordId, array $result): void
    {
        DB::table('iap_idempotency_keys')
            ->where('id', $recordId)
            ->update([
                'result' => json_encode($result),
                'updated_at' => now(),
            ]);
    }

    /**
     * Release (delete) a reservation when processing fails.
     * Only deletes if no result has been persisted yet.
     */
    public function release(int $recordId): void
    {
        DB::table('iap_idempotency_keys')
            ->where('id', $recordId)
            ->whereNull('result')
            ->delete();
    }
}
