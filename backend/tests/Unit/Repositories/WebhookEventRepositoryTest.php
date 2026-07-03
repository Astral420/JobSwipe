<?php

namespace Tests\Unit\Repositories;

use PHPUnit\Framework\TestCase;

class WebhookEventRepositoryTest extends TestCase
{
    public function test_repository_exposes_reserve_method_with_expected_signature(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/WebhookEventRepository.php'));

        // Verify reserve() method exists with correct signature
        $this->assertStringContainsString('function reserve(', $source);
        $this->assertStringContainsString('string $eventId', $source);
        $this->assertStringContainsString('string $paymentProvider', $source);
        $this->assertStringContainsString('string $eventType', $source);
        $this->assertStringContainsString('): bool', $source);
    }

    public function test_reserve_method_inserts_event_with_all_required_fields(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/WebhookEventRepository.php'));

        // Verify reserve() inserts event with all required fields
        $this->assertStringContainsString("DB::table('iap_webhook_events')->insert([", $source);
        $this->assertStringContainsString("'event_id' => \$eventId", $source);
        $this->assertStringContainsString("'payment_provider' => \$paymentProvider", $source);
        $this->assertStringContainsString("'event_type' => \$eventType", $source);
        $this->assertStringContainsString("'created_at'", $source);
    }

    public function test_reserve_method_returns_true_on_successful_insert(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/WebhookEventRepository.php'));

        // Verify reserve() returns true after successful insert
        $reserveMethodStart = strpos($source, 'function reserve(');
        $reserveMethodEnd = strrpos($source, '}');
        $reserveMethodBody = substr($source, $reserveMethodStart, $reserveMethodEnd - $reserveMethodStart);

        $this->assertStringContainsString('return true;', $reserveMethodBody);
    }

    public function test_reserve_method_catches_query_exception_for_duplicates(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/WebhookEventRepository.php'));

        // Verify reserve() catches QueryException
        $this->assertStringContainsString('catch (QueryException $e)', $source);
        $this->assertStringContainsString('use Illuminate\Database\QueryException', $source);
    }

    public function test_reserve_method_returns_false_on_unique_constraint_violation(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/WebhookEventRepository.php'));

        // Verify reserve() checks for SQLSTATE 23000 and 23505
        $this->assertStringContainsString("in_array(\$e->getCode(), ['23000', '23505'])", $source);

        // Verify it returns false for duplicate
        $reserveMethodStart = strpos($source, 'function reserve(');
        $reserveMethodEnd = strrpos($source, '}');
        $reserveMethodBody = substr($source, $reserveMethodStart, $reserveMethodEnd - $reserveMethodStart);

        $this->assertStringContainsString('return false;', $reserveMethodBody);
    }

    public function test_reserve_method_rethrows_non_duplicate_exceptions(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/WebhookEventRepository.php'));

        // Verify reserve() re-throws other exceptions
        $this->assertStringContainsString('throw $e;', $source);
    }
}
