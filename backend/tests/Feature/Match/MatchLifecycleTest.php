<?php

namespace Tests\Feature\Match;

use App\Models\PostgreSQL\ApplicantProfile;
use App\Models\PostgreSQL\Application;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\JobPosting;
use App\Models\PostgreSQL\MatchRecord;
use App\Models\PostgreSQL\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class MatchLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $applicantUser;

    private ApplicantProfile $applicantProfile;

    private User $hrUser;

    private CompanyProfile $company;

    private JobPosting $job;

    protected function setUp(): void
    {
        parent::setUp();

        // Stub notifications so they don't fail on missing Push implementation
        $notifMock = Mockery::mock(NotificationService::class);
        $notifMock->shouldReceive('create')->andReturn(
            Mockery::mock(\App\Models\PostgreSQL\Notification::class)
        );
        $notifMock->shouldReceive('sendPush')->andReturnNull();
        $this->app->instance(NotificationService::class, $notifMock);

        $this->applicantUser = User::factory()->applicant()->create();
        $this->applicantProfile = ApplicantProfile::factory()->create([
            'user_id' => $this->applicantUser->id,
        ]);

        $this->hrUser = User::factory()->hr()->create();
        $this->company = CompanyProfile::factory()->verified()->create([
            'user_id' => $this->hrUser->id,
            'owner_user_id' => $this->hrUser->id,
        ]);

        // Create company membership for HR user
        \App\Models\PostgreSQL\CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->hrUser->id,
            'membership_role' => 'hr',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $this->job = JobPosting::factory()->create([
            'company_id' => $this->company->id,
        ]);
    }

    private function createMatchForApplicant(array $overrides = []): MatchRecord
    {
        $application = Application::factory()->matched()->create([
            'applicant_id' => $this->applicantProfile->id,
            'job_posting_id' => $this->job->id,
        ]);

        return MatchRecord::factory()->create(array_merge([
            'application_id' => $application->id,
            'applicant_id' => $this->applicantProfile->id,
            'job_posting_id' => $this->job->id,
            'hr_user_id' => $this->hrUser->id,
        ], $overrides));
    }

    // ─── Accept Match ────────────────────────────────────────────────────

    public function test_applicant_can_accept_pending_match(): void
    {
        $match = $this->createMatchForApplicant([
            'status' => 'pending',
            'response_deadline' => now()->addHours(23),
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/applicant/matches/{$match->id}/accept");

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('matches', [
            'id' => $match->id,
            'status' => 'accepted',
        ]);
    }

    public function test_accept_is_idempotent(): void
    {
        $match = $this->createMatchForApplicant([
            'status' => 'accepted',
            'responded_at' => now()->subHours(2),
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/applicant/matches/{$match->id}/accept");

        // Should succeed without changing state
        $response->assertOk()
            ->assertJson(['success' => true]);
    }

    public function test_cannot_accept_match_after_deadline(): void
    {
        $match = $this->createMatchForApplicant([
            'status' => 'pending',
            'response_deadline' => now()->subMinutes(5),
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/applicant/matches/{$match->id}/accept");

        $response->assertStatus(409)
            ->assertJson(['code' => 'MATCH_RESPONSE_DEADLINE_PASSED']);
    }

    public function test_cannot_accept_already_declined_match(): void
    {
        $match = $this->createMatchForApplicant([
            'status' => 'declined',
            'responded_at' => now()->subHours(1),
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/applicant/matches/{$match->id}/accept");

        $response->assertStatus(409)
            ->assertJson(['code' => 'MATCH_ALREADY_DECLINED']);
    }

    // ─── Decline Match ───────────────────────────────────────────────────

    public function test_applicant_can_decline_pending_match(): void
    {
        $match = $this->createMatchForApplicant([
            'status' => 'pending',
            'response_deadline' => now()->addHours(23),
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/applicant/matches/{$match->id}/decline");

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('matches', [
            'id' => $match->id,
            'status' => 'declined',
        ]);
    }

    public function test_decline_is_idempotent(): void
    {
        $match = $this->createMatchForApplicant([
            'status' => 'declined',
            'responded_at' => now()->subHours(2),
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/applicant/matches/{$match->id}/decline");

        $response->assertOk()
            ->assertJson(['success' => true]);
    }

    public function test_cannot_decline_match_after_deadline(): void
    {
        $match = $this->createMatchForApplicant([
            'status' => 'pending',
            'response_deadline' => now()->subMinutes(5),
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/applicant/matches/{$match->id}/decline");

        $response->assertStatus(409)
            ->assertJson(['code' => 'MATCH_RESPONSE_DEADLINE_PASSED']);
    }

    public function test_cannot_decline_already_accepted_match(): void
    {
        $match = $this->createMatchForApplicant([
            'status' => 'accepted',
            'responded_at' => now()->subHours(1),
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/applicant/matches/{$match->id}/decline");

        $response->assertStatus(409)
            ->assertJson(['code' => 'MATCH_ALREADY_ACCEPTED']);
    }

    // ─── Close Match (HR) ────────────────────────────────────────────────

    public function test_hr_can_close_accepted_match(): void
    {
        $match = $this->createMatchForApplicant([
            'status' => 'accepted',
            'responded_at' => now()->subHours(2),
        ]);

        $response = $this->actingAs($this->hrUser)
            ->postJson("/api/v1/company/matches/{$match->id}/close");

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('matches', [
            'id' => $match->id,
            'status' => 'closed',
        ]);
    }

    public function test_hr_cannot_close_pending_match(): void
    {
        $match = $this->createMatchForApplicant([
            'status' => 'pending',
            'response_deadline' => now()->addHours(12),
        ]);

        $response = $this->actingAs($this->hrUser)
            ->postJson("/api/v1/company/matches/{$match->id}/close");

        $response->assertStatus(409);
    }

    // ─── Ownership Checks ────────────────────────────────────────────────

    public function test_other_applicant_cannot_accept_match(): void
    {
        $otherUser = User::factory()->applicant()->create();
        ApplicantProfile::factory()->create(['user_id' => $otherUser->id]);

        $match = $this->createMatchForApplicant([
            'status' => 'pending',
            'response_deadline' => now()->addHours(23),
        ]);

        $response = $this->actingAs($otherUser)
            ->postJson("/api/v1/applicant/matches/{$match->id}/accept");

        $response->assertStatus(403)
            ->assertJson(['code' => 'NOT_MATCH_APPLICANT']);
    }

    public function test_other_hr_cannot_close_match(): void
    {
        $otherHr = User::factory()->hr()->create();

        $match = $this->createMatchForApplicant([
            'status' => 'accepted',
            'responded_at' => now()->subHour(),
        ]);

        $response = $this->actingAs($otherHr)
            ->postJson("/api/v1/company/matches/{$match->id}/close");

        $response->assertStatus(403);
    }

    // ─── List & Detail ───────────────────────────────────────────────────

    public function test_applicant_can_list_their_matches(): void
    {
        $this->createMatchForApplicant();

        $response = $this->actingAs($this->applicantUser)
            ->getJson('/api/v1/applicant/matches');

        $response->assertOk()
            ->assertJson(['success' => true]);
    }

    public function test_hr_can_list_their_matches(): void
    {
        $this->createMatchForApplicant();

        $response = $this->actingAs($this->hrUser)
            ->getJson('/api/v1/company/matches');

        $response->assertOk()
            ->assertJson(['success' => true]);
    }

    public function test_applicant_can_view_match_detail(): void
    {
        $match = $this->createMatchForApplicant();

        $response = $this->actingAs($this->applicantUser)
            ->getJson("/api/v1/applicant/matches/{$match->id}");

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'match',
                    'time_remaining',
                    'seconds_remaining',
                    'is_chat_active',
                ],
            ]);
    }

    public function test_non_participant_cannot_view_match_detail(): void
    {
        $otherUser = User::factory()->applicant()->create();
        ApplicantProfile::factory()->create(['user_id' => $otherUser->id]);

        $match = $this->createMatchForApplicant();

        $response = $this->actingAs($otherUser)
            ->getJson("/api/v1/applicant/matches/{$match->id}");

        $response->assertStatus(403);
    }

    // ─── RBAC ────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_matches(): void
    {
        $this->getJson('/api/v1/applicant/matches')
            ->assertStatus(401);
    }

    public function test_hr_cannot_access_applicant_match_endpoints(): void
    {
        $this->actingAs($this->hrUser)
            ->getJson('/api/v1/applicant/matches')
            ->assertStatus(403);
    }

    public function test_applicant_cannot_access_company_match_endpoints(): void
    {
        $this->actingAs($this->applicantUser)
            ->getJson('/api/v1/company/matches')
            ->assertStatus(403);
    }
}
