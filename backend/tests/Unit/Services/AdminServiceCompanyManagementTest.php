<?php

namespace Tests\Unit\Services;

use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use App\Services\AdminService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class AdminServiceCompanyManagementTest extends TestCase
{
    use RefreshDatabase;

    protected AdminService $adminService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminService = app(AdminService::class);
    }

    public function test_list_companies_returns_paginated_results(): void
    {
        // Arrange
        for ($i = 0; $i < 5; $i++) {
            $user = User::factory()->create();
            CompanyProfile::factory()->create(['user_id' => $user->id, 'owner_user_id' => $user->id]);
        }

        // Act
        $result = $this->adminService->listCompanies([], 10);

        // Assert
        $this->assertCount(5, $result->items());
        $this->assertEquals(5, $result->total());
    }

    public function test_list_companies_filters_by_verification_status(): void
    {
        // Arrange
        for ($i = 0; $i < 3; $i++) {
            $user = User::factory()->create();
            CompanyProfile::factory()->create([
                'user_id' => $user->id,
                'owner_user_id' => $user->id,
                'verification_status' => 'pending',
            ]);
        }
        for ($i = 0; $i < 2; $i++) {
            $user = User::factory()->create();
            CompanyProfile::factory()->create([
                'user_id' => $user->id,
                'owner_user_id' => $user->id,
                'verification_status' => 'approved',
            ]);
        }

        // Act
        $result = $this->adminService->listCompanies(['verificationStatus' => 'pending'], 10);

        // Assert
        $this->assertCount(3, $result->items());
        foreach ($result->items() as $company) {
            $this->assertEquals('pending', $company->verification_status);
        }
    }

    public function test_list_companies_filters_by_trust_level(): void
    {
        // Arrange
        for ($i = 0; $i < 2; $i++) {
            $user = User::factory()->create();
            CompanyProfile::factory()->create([
                'user_id' => $user->id,
                'owner_user_id' => $user->id,
                'trust_level' => 'trusted',
            ]);
        }
        for ($i = 0; $i < 3; $i++) {
            $user = User::factory()->create();
            CompanyProfile::factory()->create([
                'user_id' => $user->id,
                'owner_user_id' => $user->id,
                'trust_level' => 'untrusted',
            ]);
        }

        // Act
        $result = $this->adminService->listCompanies(['trustLevel' => 'trusted'], 10);

        // Assert
        $this->assertCount(2, $result->items());
        foreach ($result->items() as $company) {
            $this->assertEquals('trusted', $company->trust_level);
        }
    }

    public function test_list_companies_filters_by_subscription_tier(): void
    {
        // Arrange
        for ($i = 0; $i < 2; $i++) {
            $user = User::factory()->create();
            CompanyProfile::factory()->create([
                'user_id' => $user->id,
                'owner_user_id' => $user->id,
                'subscription_tier' => 'basic',
            ]);
        }
        $user = User::factory()->create();
        CompanyProfile::factory()->create([
            'user_id' => $user->id,
            'owner_user_id' => $user->id,
            'subscription_tier' => 'pro',
        ]);

        // Act
        $result = $this->adminService->listCompanies(['subscriptionTier' => 'basic'], 10);

        // Assert
        $this->assertCount(2, $result->items());
        foreach ($result->items() as $company) {
            $this->assertEquals('basic', $company->subscription_tier);
        }
    }

    public function test_list_companies_filters_by_status(): void
    {
        // Arrange
        for ($i = 0; $i < 3; $i++) {
            $user = User::factory()->create();
            CompanyProfile::factory()->create([
                'user_id' => $user->id,
                'owner_user_id' => $user->id,
                'status' => 'active',
            ]);
        }
        for ($i = 0; $i < 2; $i++) {
            $user = User::factory()->create();
            CompanyProfile::factory()->create([
                'user_id' => $user->id,
                'owner_user_id' => $user->id,
                'status' => 'suspended',
            ]);
        }

        // Act
        $result = $this->adminService->listCompanies(['status' => 'suspended'], 10);

        // Assert
        $this->assertCount(2, $result->items());
        foreach ($result->items() as $company) {
            $this->assertEquals('suspended', $company->status);
        }
    }

    public function test_list_companies_searches_by_company_name(): void
    {
        // Arrange
        $user1 = User::factory()->create();
        CompanyProfile::factory()->create([
            'user_id' => $user1->id,
            'owner_user_id' => $user1->id,
            'company_name' => 'Acme Corporation',
        ]);
        $user2 = User::factory()->create();
        CompanyProfile::factory()->create([
            'user_id' => $user2->id,
            'owner_user_id' => $user2->id,
            'company_name' => 'Tech Innovations',
        ]);
        $user3 = User::factory()->create();
        CompanyProfile::factory()->create([
            'user_id' => $user3->id,
            'owner_user_id' => $user3->id,
            'company_name' => 'Acme Solutions',
        ]);

        // Act
        $result = $this->adminService->listCompanies(['search' => 'acme'], 10);

        // Assert
        $this->assertCount(2, $result->items());
    }

    public function test_get_company_details_returns_complete_data(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $company = CompanyProfile::factory()->create([
            'user_id' => $owner->id,
            'owner_user_id' => $owner->id,
            'trust_score' => 75,
            'trust_level' => 'established',
        ]);

        // Act
        $result = $this->adminService->getCompanyDetails($company->id);

        // Assert
        $this->assertEquals($company->id, $result['id']);
        $this->assertEquals($company->company_name, $result['company_name']);
        $this->assertEquals(75, $result['trust_score']);
        $this->assertEquals('established', $result['trust_level']);
        $this->assertArrayHasKey('owner', $result);
        $this->assertEquals($owner->id, $result['owner']['id']);
    }

    public function test_get_company_details_throws_exception_for_nonexistent_company(): void
    {
        // Expect
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Company not found');

        // Act
        $this->adminService->getCompanyDetails(fake()->uuid());
    }

    public function test_suspend_company_updates_status_and_sends_notification(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $company = CompanyProfile::factory()->create([
            'owner_user_id' => $owner->id,
            'status' => 'active',
        ]);
        $actorId = User::factory()->create(['role' => 'super_admin'])->id;

        // Act
        $result = $this->adminService->suspendCompany($company->id, 'Policy violation', $actorId);

        // Assert
        $this->assertTrue($result);
        $company->refresh();
        $this->assertEquals('suspended', $company->status);
        $this->assertEquals('Policy violation', $company->suspension_reason);
        $this->assertNotNull($company->suspended_at);
    }

    public function test_suspend_company_throws_exception_if_already_suspended(): void
    {
        // Arrange
        $user = User::factory()->create();
        $company = CompanyProfile::factory()->create([
            'user_id' => $user->id,
            'owner_user_id' => $user->id,
            'status' => 'suspended',
        ]);
        $actorId = User::factory()->create(['role' => 'super_admin'])->id;

        // Expect
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Company is already suspended');

        // Act
        $this->adminService->suspendCompany($company->id, 'Test reason', $actorId);
    }

    public function test_unsuspend_company_reactivates_account(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $company = CompanyProfile::factory()->create([
            'user_id' => $owner->id,
            'owner_user_id' => $owner->id,
            'status' => 'suspended',
            'suspension_reason' => 'Previous violation',
        ]);
        $actorId = User::factory()->create(['role' => 'super_admin'])->id;

        // Act
        $result = $this->adminService->unsuspendCompany($company->id, $actorId);

        // Assert
        $this->assertTrue($result);
        $company->refresh();
        $this->assertEquals('active', $company->status);
        $this->assertNull($company->suspension_reason);
        $this->assertNull($company->suspended_at);
    }

    public function test_unsuspend_company_throws_exception_if_not_suspended(): void
    {
        // Arrange
        $user = User::factory()->create();
        $company = CompanyProfile::factory()->create([
            'user_id' => $user->id,
            'owner_user_id' => $user->id,
            'status' => 'active',
        ]);
        $actorId = User::factory()->create(['role' => 'super_admin'])->id;

        // Expect
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Company is not suspended');

        // Act
        $this->adminService->unsuspendCompany($company->id, $actorId);
    }

    public function test_list_companies_applies_multiple_filters(): void
    {
        // Arrange
        $user1 = User::factory()->create();
        CompanyProfile::factory()->create([
            'user_id' => $user1->id,
            'owner_user_id' => $user1->id,
            'verification_status' => 'approved',
            'trust_level' => 'trusted',
            'subscription_tier' => 'pro',
            'status' => 'active',
        ]);
        $user2 = User::factory()->create();
        CompanyProfile::factory()->create([
            'user_id' => $user2->id,
            'owner_user_id' => $user2->id,
            'verification_status' => 'approved',
            'trust_level' => 'untrusted',
            'subscription_tier' => 'basic',
            'status' => 'active',
        ]);
        $user3 = User::factory()->create();
        CompanyProfile::factory()->create([
            'user_id' => $user3->id,
            'owner_user_id' => $user3->id,
            'verification_status' => 'pending',
            'trust_level' => 'trusted',
            'subscription_tier' => 'pro',
            'status' => 'active',
        ]);

        // Act
        $result = $this->adminService->listCompanies([
            'verificationStatus' => 'approved',
            'trustLevel' => 'trusted',
            'subscriptionTier' => 'pro',
            'status' => 'active',
        ], 10);

        // Assert
        $this->assertCount(1, $result->items());
        $company = $result->items()[0];
        $this->assertEquals('approved', $company->verification_status);
        $this->assertEquals('trusted', $company->trust_level);
        $this->assertEquals('pro', $company->subscription_tier);
        $this->assertEquals('active', $company->status);
    }
}
