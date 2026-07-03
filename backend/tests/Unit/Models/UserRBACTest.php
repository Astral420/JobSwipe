<?php

namespace Tests\Unit\Models;

use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserRBACTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_identifies_super_admin_role(): void
    {
        $user = User::factory()->create(['role' => 'super_admin']);

        $this->assertTrue($user->isSuperAdmin());
        $this->assertFalse($user->isAdmin());
        $this->assertFalse($user->isModerator());
        $this->assertTrue($user->isAdminUser());
    }

    /** @test */
    public function it_identifies_admin_role(): void
    {
        $user = User::factory()->create(['role' => 'admin']);

        $this->assertFalse($user->isSuperAdmin());
        $this->assertTrue($user->isAdmin());
        $this->assertFalse($user->isModerator());
        $this->assertTrue($user->isAdminUser());
    }

    /** @test */
    public function it_identifies_moderator_role(): void
    {
        $user = User::factory()->create(['role' => 'moderator']);

        $this->assertFalse($user->isSuperAdmin());
        $this->assertFalse($user->isAdmin());
        $this->assertTrue($user->isModerator());
        $this->assertTrue($user->isAdminUser());
    }

    /** @test */
    public function it_identifies_non_admin_roles(): void
    {
        $applicant = User::factory()->create(['role' => 'applicant']);
        $hr = User::factory()->create(['role' => 'hr']);

        $this->assertFalse($applicant->isSuperAdmin());
        $this->assertFalse($applicant->isAdmin());
        $this->assertFalse($applicant->isModerator());
        $this->assertFalse($applicant->isAdminUser());

        $this->assertFalse($hr->isSuperAdmin());
        $this->assertFalse($hr->isAdmin());
        $this->assertFalse($hr->isModerator());
        $this->assertFalse($hr->isAdminUser());
    }

    /** @test */
    public function it_checks_fillable_fields_include_role_and_is_active(): void
    {
        $user = new User;
        $fillable = $user->getFillable();

        $this->assertContains('role', $fillable);
        $this->assertContains('is_active', $fillable);
    }
}
