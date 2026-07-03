<?php

namespace Tests\Feature\HR;

use App\Mail\HRJoinedMail;
use App\Models\PostgreSQL\CompanyMembership;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminNotificationOnHRJoinTest extends TestCase
{
    use RefreshDatabase;

    private User $invitingAdmin;

    private User $fallbackAdmin;

    private User $hr;

    private CompanyProfile $company;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();

        $this->invitingAdmin = User::factory()->create(['role' => 'company_admin']);
        $this->fallbackAdmin = User::factory()->create(['role' => 'company_admin']);
        $this->hr = User::factory()->create(['role' => 'hr']);

        $this->company = CompanyProfile::factory()->create(['owner_user_id' => $this->fallbackAdmin->id]);

        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->invitingAdmin->id,
            'membership_role' => 'company_admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->fallbackAdmin->id,
            'membership_role' => 'company_admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->hr->id,
            'membership_role' => 'hr',
            'status' => 'active',
            'invited_by_user_id' => $this->invitingAdmin->id, // explicit inviter
            'joined_at' => now(),
        ]);
    }

    public function test_inviting_admin_is_notified()
    {
        $response = $this->actingAs($this->hr)->postJson('/api/v1/profile/hr/setup', [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'job_title' => 'HR Manager',
        ]);

        $response->assertStatus(200);

        // Only inviting admin receives the web notification
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->invitingAdmin->id,
            'type' => 'hr_joined',
        ]);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $this->fallbackAdmin->id,
            'type' => 'hr_joined',
        ]);

        Mail::assertQueued(HRJoinedMail::class, function ($mail) {
            return $mail->admin->id === $this->invitingAdmin->id;
        });
    }

    public function test_fallback_admins_are_notified_if_inviter_deleted()
    {
        // First delete the inviting admin's membership (simulate deleted user or revoked admin)
        CompanyMembership::where('user_id', $this->invitingAdmin->id)->delete();
        $this->invitingAdmin->delete();

        $response = $this->actingAs($this->hr)->postJson('/api/v1/profile/hr/setup', [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'job_title' => 'HR Manager',
        ]);

        $response->assertStatus(200);

        // Fallback admin gets notification
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->fallbackAdmin->id,
            'type' => 'hr_joined',
        ]);

        Mail::assertQueued(HRJoinedMail::class, function ($mail) {
            return $mail->admin->id === $this->fallbackAdmin->id;
        });
    }
}
