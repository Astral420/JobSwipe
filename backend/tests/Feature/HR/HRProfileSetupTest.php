<?php

namespace Tests\Feature\HR;

use App\Mail\HRJoinedMail;
use App\Models\PostgreSQL\CompanyMembership;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class HRProfileSetupTest extends TestCase
{
    use RefreshDatabase;

    private User $hr;

    private User $admin;

    private CompanyProfile $company;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();

        $this->hr = User::factory()->create(['role' => 'hr']);
        $this->admin = User::factory()->create(['role' => 'company_admin']);
        $this->company = CompanyProfile::factory()->create(['owner_user_id' => $this->admin->id]);

        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->hr->id,
            'membership_role' => 'hr',
            'status' => 'active',
            'invited_by_user_id' => $this->admin->id,
            'joined_at' => now(),
        ]);

        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->admin->id,
            'membership_role' => 'company_admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);
    }

    public function test_successful_profile_setup_creates_profile_and_notifies_admin()
    {
        $response = $this->actingAs($this->hr)->postJson('/api/v1/profile/hr/setup', [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'job_title' => 'HR Manager',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.first_name', 'Jane');
        $response->assertJsonPath('data.job_title', 'HR Manager');

        $this->assertDatabaseHas('hr_profiles', [
            'user_id' => $this->hr->id,
            'first_name' => 'Jane',
            'job_title' => 'HR Manager',
        ]);

        // Verify admin notification email
        Mail::assertQueued(HRJoinedMail::class, function ($mail) {
            return $mail->admin->id === $this->admin->id &&
                   $mail->hrUser->id === $this->hr->id;
        });

        // Verify in-app notification
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->admin->id,
            'type' => 'hr_joined',
        ]);
    }

    public function test_custom_job_title_is_saved_when_other_is_selected()
    {
        $response = $this->actingAs($this->hr)->postJson('/api/v1/profile/hr/setup', [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'job_title' => 'Other',
            'custom_job_title' => 'VP of Vibe',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('hr_profiles', [
            'user_id' => $this->hr->id,
            'job_title' => 'VP of Vibe',
        ]);
    }

    public function test_invalid_job_title_is_rejected()
    {
        $response = $this->actingAs($this->hr)->postJson('/api/v1/profile/hr/setup', [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'job_title' => 'Hacker',
        ]);

        $response->assertStatus(422); // From HRProfileSetupRequest validation
    }
}
