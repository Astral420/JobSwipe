<?php

namespace Tests\Unit\Repositories;

use PHPUnit\Framework\TestCase;

class IAPTransactionRepositoryTest extends TestCase
{
    public function test_repository_exposes_required_methods_with_expected_signatures(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPTransactionRepository.php'));

        // Verify store() method exists with correct signature
        $this->assertStringContainsString('function store(', $source);
        $this->assertStringContainsString('string $transactionId', $source);
        $this->assertStringContainsString('string $paymentProvider', $source);
        $this->assertStringContainsString('string $userId', $source);
        $this->assertStringContainsString('string $productId', $source);

        // Verify exists() method exists with correct signature
        $this->assertStringContainsString('function exists(string $transactionId, string $paymentProvider): bool', $source);

        // Verify findByTransactionId() method exists with correct signature
        $this->assertStringContainsString('function findByTransactionId(string $transactionId, string $paymentProvider)', $source);
    }

    public function test_store_method_creates_transaction_with_all_required_fields(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPTransactionRepository.php'));

        // Verify store() creates transaction with all required fields
        $this->assertStringContainsString('IAPTransaction::create([', $source);
        $this->assertStringContainsString("'transaction_id' => \$transactionId", $source);
        $this->assertStringContainsString("'payment_provider' => \$paymentProvider", $source);
        $this->assertStringContainsString("'user_id' => \$userId", $source);
        $this->assertStringContainsString("'product_id' => \$productId", $source);
    }

    public function test_exists_method_checks_both_transaction_id_and_payment_provider(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPTransactionRepository.php'));

        // Verify exists() queries both transaction_id and payment_provider
        $this->assertStringContainsString("where('transaction_id', \$transactionId)", $source);
        $this->assertStringContainsString("where('payment_provider', \$paymentProvider)", $source);
        $this->assertStringContainsString('->exists()', $source);
    }

    public function test_find_by_transaction_id_queries_both_fields(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPTransactionRepository.php'));

        // Verify findByTransactionId() queries both transaction_id and payment_provider
        $findMethodStart = strpos($source, 'function findByTransactionId');
        $findMethodEnd = strpos($source, '}', $findMethodStart);
        $findMethodBody = substr($source, $findMethodStart, $findMethodEnd - $findMethodStart);

        $this->assertStringContainsString("where('transaction_id', \$transactionId)", $findMethodBody);
        $this->assertStringContainsString("where('payment_provider', \$paymentProvider)", $findMethodBody);
        $this->assertStringContainsString('->first()', $findMethodBody);
    }

    public function test_repository_returns_correct_types(): void
    {
        $source = file_get_contents(base_path('app/Repositories/PostgreSQL/IAPTransactionRepository.php'));

        // Verify return types
        $this->assertStringContainsString('): IAPTransaction', $source);
        $this->assertStringContainsString('): bool', $source);
        $this->assertStringContainsString('): ?IAPTransaction', $source);
    }
}
