<?php

namespace Tests\Unit\Services;

use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use App\Services\AdminService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class AdminServiceCompanyVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected AdminService $adminService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminService = app(AdminService::class);
    }

    public function test_approve_company_verification_updates_status_and_sends_notification(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $company = CompanyProfile::factory()->create([
            'owner_user_id' => $owner->id,
            'verification_status' => 'pending',
            'is_verified' => false,
        ]);
        $adminUser = User::factory()->create(['role' => 'admin']);

        // Act
        $result = $this->adminService->approveCompanyVerification($company->id, $adminUser->id);

        // Assert
        $this->assertInstanceOf(CompanyProfile::class, $result);
        $this->assertEquals('approved', $result->verification_status);
        $this->assertTrue($result->is_verified);
    }

    public function test_approve_company_verification_throws_exception_if_already_approved(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $company = CompanyProfile::factory()->create([
            'owner_user_id' => $owner->id,
            'verification_status' => 'approved',
            'is_verified' => true,
        ]);
        $adminUser = User::factory()->create(['role' => 'admin']);

        // Expect
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Company already approved');

        // Act
        $this->adminService->approveCompanyVerification($company->id, $adminUser->id);
    }

    public function test_approve_company_verification_throws_exception_for_nonexistent_company(): void
    {
        // Arrange
        $adminUser = User::factory()->create(['role' => 'admin']);

        // Expect
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Company not found');

        // Act
        $this->adminService->approveCompanyVerification(fake()->uuid(), $adminUser->id);
    }

    public function test_reject_company_verification_updates_status_and_records_reason(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $company = CompanyProfile::factory()->create([
            'owner_user_id' => $owner->id,
            'verification_status' => 'pending',
            'is_verified' => false,
        ]);
        $adminUser = User::factory()->create(['role' => 'admin']);
        $reason = 'Incomplete documentation';

        // Act
        $result = $this->adminService->rejectCompanyVerification($company->id, $adminUser->id, $reason);

        // Assert
        $this->assertInstanceOf(CompanyProfile::class, $result);
        $this->assertEquals('rejected', $result->verification_status);
        $this->assertFalse($result->is_verified);
    }

    public function test_reject_company_verification_throws_exception_if_already_rejected(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $company = CompanyProfile::factory()->create([
            'owner_user_id' => $owner->id,
            'verification_status' => 'rejected',
            'is_verified' => false,
        ]);
        $adminUser = User::factory()->create(['role' => 'admin']);

        // Expect
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Company already rejected');

        // Act
        $this->adminService->rejectCompanyVerification($company->id, $adminUser->id, 'Test reason');
    }

    public function test_reject_company_verification_throws_exception_for_nonexistent_company(): void
    {
        // Arrange
        $adminUser = User::factory()->create(['role' => 'admin']);

        // Expect
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Company not found');

        // Act
        $this->adminService->rejectCompanyVerification(fake()->uuid(), $adminUser->id, 'Test reason');
    }

    public function test_approve_company_verification_creates_audit_log(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $company = CompanyProfile::factory()->create([
            'owner_user_id' => $owner->id,
            'verification_status' => 'pending',
            'is_verified' => false,
        ]);
        $adminUser = User::factory()->create(['role' => 'admin']);

        // Act
        $this->adminService->approveCompanyVerification($company->id, $adminUser->id);

        // Assert
        $this->assertDatabaseHas('audit_logs', [
            'action_type' => 'company_verification_approve',
            'resource_type' => 'company',
            'resource_id' => $company->id,
            'actor_id' => $adminUser->id,
        ]);
    }

    public function test_reject_company_verification_creates_audit_log(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $company = CompanyProfile::factory()->create([
            'owner_user_id' => $owner->id,
            'verification_status' => 'pending',
            'is_verified' => false,
        ]);
        $adminUser = User::factory()->create(['role' => 'admin']);
        $reason = 'Incomplete documentation';

        // Act
        $this->adminService->rejectCompanyVerification($company->id, $adminUser->id, $reason);

        // Assert
        $this->assertDatabaseHas('audit_logs', [
            'action_type' => 'company_verification_reject',
            'resource_type' => 'company',
            'resource_id' => $company->id,
            'actor_id' => $adminUser->id,
        ]);
    }
}
