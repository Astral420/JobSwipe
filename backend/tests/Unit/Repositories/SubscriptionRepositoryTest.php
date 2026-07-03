<?php

namespace Tests\Unit\Repositories;

use PHPUnit\Framework\TestCase;

class SubscriptionRepositoryTest extends TestCase
{
    public function test_repository_exposes_required_methods_with_expected_signatures(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/SubscriptionRepository.php'));

        // Verify create() method exists with correct signature
        $this->assertStringContainsString('function create(array $data): Subscription', $source);

        // Verify findByProviderSubId() method exists with correct signature
        $this->assertStringContainsString('function findByProviderSubId(string $providerSubId, string $paymentProvider): ?Subscription', $source);

        // Verify findActiveForUser() method exists with correct signature
        $this->assertStringContainsString('function findActiveForUser(string $userId): ?Subscription', $source);

        // Verify findByTransactionId() method exists with correct signature
        $this->assertStringContainsString('function findByTransactionId(string $transactionId): ?Subscription', $source);

        // Verify update() method exists with correct signature
        $this->assertStringContainsString('function update(Subscription $subscription, array $data): void', $source);

        // Verify getAllForUser() method exists with correct signature
        $this->assertStringContainsString('function getAllForUser(string $userId): Collection', $source);
    }

    public function test_create_method_uses_subscription_model(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/SubscriptionRepository.php'));

        // Verify create() uses Subscription::create()
        $this->assertStringContainsString('Subscription::create($data)', $source);
    }

    public function test_find_by_provider_sub_id_queries_correct_fields(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/SubscriptionRepository.php'));

        // Verify findByProviderSubId() queries provider_sub_id and payment_provider
        $findMethodStart = strpos($source, 'function findByProviderSubId');
        $findMethodEnd = strpos($source, '}', $findMethodStart);
        $findMethodBody = substr($source, $findMethodStart, $findMethodEnd - $findMethodStart);

        $this->assertStringContainsString("where('provider_sub_id', \$providerSubId)", $findMethodBody);
        $this->assertStringContainsString("where('payment_provider', \$paymentProvider)", $findMethodBody);
        $this->assertStringContainsString('->first()', $findMethodBody);
    }

    public function test_find_active_for_user_queries_correct_fields(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/SubscriptionRepository.php'));

        // Verify findActiveForUser() queries user_id, subscriber_type='applicant', and status='active'
        $findMethodStart = strpos($source, 'function findActiveForUser');
        $findMethodEnd = strpos($source, '}', $findMethodStart);
        $findMethodBody = substr($source, $findMethodStart, $findMethodEnd - $findMethodStart);

        $this->assertStringContainsString("where('user_id', \$userId)", $findMethodBody);
        $this->assertStringContainsString("where('subscriber_type', 'applicant')", $findMethodBody);
        $this->assertStringContainsString("where('status', 'active')", $findMethodBody);
        $this->assertStringContainsString('->first()', $findMethodBody);
    }

    public function test_find_by_transaction_id_uses_iap_transaction_lookup(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/SubscriptionRepository.php'));

        // Verify findByTransactionId() looks up transaction first
        $findMethodStart = strpos($source, 'function findByTransactionId');
        $findMethodEnd = strpos($source, '}', $findMethodStart);
        $findMethodBody = substr($source, $findMethodStart, $findMethodEnd - $findMethodStart);

        $this->assertStringContainsString('IAPTransaction::where', $findMethodBody);
        $this->assertStringContainsString("where('transaction_id', \$transactionId)", $findMethodBody);
    }

    public function test_update_method_calls_model_update(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/SubscriptionRepository.php'));

        // Verify update() calls $subscription->update()
        $updateMethodStart = strpos($source, 'function update');
        $updateMethodEnd = strpos($source, '}', $updateMethodStart);
        $updateMethodBody = substr($source, $updateMethodStart, $updateMethodEnd - $updateMethodStart);

        $this->assertStringContainsString('$subscription->update($data)', $updateMethodBody);
    }

    public function test_get_all_for_user_orders_by_created_at_desc(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/SubscriptionRepository.php'));

        // Verify getAllForUser() queries user_id and orders by created_at DESC
        $getAllMethodStart = strpos($source, 'function getAllForUser');
        $getAllMethodEnd = strpos($source, '}', $getAllMethodStart);
        $getAllMethodBody = substr($source, $getAllMethodStart, $getAllMethodEnd - $getAllMethodStart);

        $this->assertStringContainsString("where('user_id', \$userId)", $getAllMethodBody);
        $this->assertStringContainsString("orderBy('created_at', 'desc')", $getAllMethodBody);
        $this->assertStringContainsString('->get()', $getAllMethodBody);
    }

    public function test_repository_uses_correct_namespace(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/SubscriptionRepository.php'));

        // Verify namespace
        $this->assertStringContainsString('namespace App\Repositories\PostgreSQL;', $source);

        // Verify imports
        $this->assertStringContainsString('use App\Models\PostgreSQL\Subscription;', $source);
        $this->assertStringContainsString('use Illuminate\Support\Collection;', $source);
    }
}
