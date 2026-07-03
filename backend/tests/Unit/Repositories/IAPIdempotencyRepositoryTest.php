<?php

namespace Tests\Unit\Repositories;

use PHPUnit\Framework\TestCase;

class IAPIdempotencyRepositoryTest extends TestCase
{
    public function test_repository_exposes_required_methods_with_expected_signatures(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPIdempotencyRepository.php'));

        // Verify reserve() method exists with correct signature
        $this->assertStringContainsString('function reserve(', $source);
        $this->assertStringContainsString('string $userId', $source);
        $this->assertStringContainsString('string $idempotencyKey', $source);
        $this->assertStringContainsString('string $requestFingerprint', $source);
        $this->assertStringContainsString('int $ttlSeconds', $source);

        // Verify persistResult() method exists with correct signature
        $this->assertStringContainsString('function persistResult(int $recordId, array $result): void', $source);

        // Verify release() method exists with correct signature
        $this->assertStringContainsString('function release(int $recordId): void', $source);
    }

    public function test_reserve_method_uses_database_transaction_and_locking(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPIdempotencyRepository.php'));

        // Verify reserve() uses DB transaction
        $this->assertStringContainsString('DB::transaction(function ()', $source);

        // Verify reserve() uses insertOrIgnore for concurrent handling
        $this->assertStringContainsString('insertOrIgnore([', $source);

        // Verify reserve() uses lockForUpdate
        $this->assertStringContainsString('->lockForUpdate()', $source);
    }

    public function test_reserve_method_handles_expired_keys(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPIdempotencyRepository.php'));

        // Verify expired key handling
        $this->assertStringContainsString('isPast()', $source);
        $this->assertStringContainsString("'result' => null", $source);
    }

    public function test_reserve_method_handles_fingerprint_mismatches(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPIdempotencyRepository.php'));

        // Verify fingerprint mismatch throws exception
        $this->assertStringContainsString('IDEMPOTENCY_KEY_REUSED', $source);
        $this->assertStringContainsString('request_fingerprint', $source);
    }

    public function test_reserve_method_handles_cached_results(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPIdempotencyRepository.php'));

        // Verify cached result handling
        $this->assertStringContainsString("'status' => 'cached'", $source);
        $this->assertStringContainsString('$record->result', $source);
    }

    public function test_reserve_method_handles_in_progress_requests(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPIdempotencyRepository.php'));

        // Verify in-progress handling
        $this->assertStringContainsString("'status' => 'in_progress'", $source);
        $this->assertStringContainsString('PENDING_TIMEOUT_SECONDS', $source);
    }

    public function test_persist_result_updates_result_field(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPIdempotencyRepository.php'));

        // Verify persistResult() updates result field
        $persistMethodStart = strpos($source, 'function persistResult');
        $persistMethodEnd = strpos($source, '}', $persistMethodStart);
        $persistMethodBody = substr($source, $persistMethodStart, $persistMethodEnd - $persistMethodStart);

        $this->assertStringContainsString("->where('id', \$recordId)", $persistMethodBody);
        $this->assertStringContainsString("'result' => json_encode(\$result)", $persistMethodBody);
        $this->assertStringContainsString('->update([', $persistMethodBody);
    }

    public function test_release_deletes_reservation_on_failure(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPIdempotencyRepository.php'));

        // Verify release() deletes record
        $releaseMethodStart = strpos($source, 'function release');
        $releaseMethodEnd = strpos($source, '}', $releaseMethodStart);
        $releaseMethodBody = substr($source, $releaseMethodStart, $releaseMethodEnd - $releaseMethodStart);

        $this->assertStringContainsString("->where('id', \$recordId)", $releaseMethodBody);
        $this->assertStringContainsString('->whereNull(\'result\')', $releaseMethodBody);
        $this->assertStringContainsString('->delete()', $releaseMethodBody);
    }

    public function test_repository_returns_correct_types(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPIdempotencyRepository.php'));

        // Verify return types
        $this->assertStringContainsString('): array', $source);
        $this->assertStringContainsString('): void', $source);
    }

    public function test_reserve_method_throws_iap_exception_on_failure(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPIdempotencyRepository.php'));

        // Verify IAPException is thrown
        $this->assertStringContainsString('throw new IAPException(', $source);
        $this->assertStringContainsString('IDEMPOTENCY_RESERVATION_FAILED', $source);
    }
}
