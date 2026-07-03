<?php

namespace Tests\Feature\Match;

use App\Models\PostgreSQL\ApplicantProfile;
use App\Models\PostgreSQL\Application;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\JobPosting;
use App\Models\PostgreSQL\MatchMessage;
use App\Models\PostgreSQL\MatchRecord;
use App\Models\PostgreSQL\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Mockery;
use Tests\TestCase;

class MatchMessageTest extends TestCase
{
    use RefreshDatabase;

    private User $applicantUser;

    private ApplicantProfile $applicantProfile;

    private User $hrUser;

    private MatchRecord $acceptedMatch;

    protected function setUp(): void
    {
        parent::setUp();

        // Stub notifications
        $notifMock = Mockery::mock(NotificationService::class);
        $notifMock->shouldReceive('create')->andReturn(
            Mockery::mock(\App\Models\PostgreSQL\Notification::class)
        );
        $notifMock->shouldReceive('sendPush')->andReturnNull();
        $this->app->instance(NotificationService::class, $notifMock);

        // Prevent real broadcasting
        Event::fake();

        $this->applicantUser = User::factory()->applicant()->create();
        $this->applicantProfile = ApplicantProfile::factory()->create([
            'user_id' => $this->applicantUser->id,
        ]);
        $this->hrUser = User::factory()->hr()->create();

        $company = CompanyProfile::factory()->verified()->create([
            'user_id' => $this->hrUser->id,
            'owner_user_id' => $this->hrUser->id,
        ]);
        $job = JobPosting::factory()->create(['company_id' => $company->id]);
        $app = Application::factory()->matched()->create([
            'applicant_id' => $this->applicantProfile->id,
            'job_posting_id' => $job->id,
        ]);

        $this->acceptedMatch = MatchRecord::factory()->accepted()->create([
            'application_id' => $app->id,
            'applicant_id' => $this->applicantProfile->id,
            'job_posting_id' => $job->id,
            'hr_user_id' => $this->hrUser->id,
        ]);
    }

    // ─── Send Message ────────────────────────────────────────────────────

    public function test_participant_can_send_message_on_accepted_match(): void
    {
        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/matches/{$this->acceptedMatch->id}/messages", [
                'body' => 'Hello! I am interested in this role.',
            ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('match_messages', [
            'match_id' => $this->acceptedMatch->id,
            'sender_id' => $this->applicantUser->id,
            'body' => 'Hello! I am interested in this role.',
        ]);
    }

    public function test_hr_can_send_message_on_accepted_match(): void
    {
        $response = $this->actingAs($this->hrUser)
            ->postJson("/api/v1/matches/{$this->acceptedMatch->id}/messages", [
                'body' => 'Welcome! Let us discuss the role.',
            ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);
    }

    public function test_duplicate_client_message_id_returns_existing_message(): void
    {
        $clientId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID

        // First message
        $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/matches/{$this->acceptedMatch->id}/messages", [
                'body' => 'Hello!',
                'client_message_id' => $clientId,
            ]);

        // Duplicate with same client_message_id
        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/matches/{$this->acceptedMatch->id}/messages", [
                'body' => 'Hello!',
                'client_message_id' => $clientId,
            ]);

        // Should return 200 (not 201) for idempotent replay
        $response->assertOk()
            ->assertJson(['success' => true]);

        // Should only have one message in DB
        $count = MatchMessage::where('match_id', $this->acceptedMatch->id)
            ->where('client_message_id', $clientId)
            ->count();
        $this->assertEquals(1, $count);
    }

    public function test_cannot_send_message_on_closed_match(): void
    {
        $this->acceptedMatch->update(['status' => 'closed', 'closed_at' => now()]);

        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/matches/{$this->acceptedMatch->id}/messages", [
                'body' => 'Are you still there?',
            ]);

        $response->assertStatus(422)
            ->assertJson(['code' => 'CHAT_NOT_ACTIVE']);
    }

    public function test_cannot_send_message_on_expired_match(): void
    {
        $this->acceptedMatch->update([
            'status' => 'expired',
            'response_deadline' => now()->subHour(),
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/matches/{$this->acceptedMatch->id}/messages", [
                'body' => 'Hello?',
            ]);

        $response->assertStatus(422)
            ->assertJson(['code' => 'CHAT_NOT_ACTIVE']);
    }

    public function test_non_participant_cannot_send_message(): void
    {
        $otherUser = User::factory()->applicant()->create();
        ApplicantProfile::factory()->create(['user_id' => $otherUser->id]);

        $response = $this->actingAs($otherUser)
            ->postJson("/api/v1/matches/{$this->acceptedMatch->id}/messages", [
                'body' => 'I should not be here.',
            ]);

        $response->assertStatus(403)
            ->assertJson(['code' => 'NOT_MATCH_PARTICIPANT']);
    }

    // ─── Auto-Accept on First Message ────────────────────────────────────

    public function test_applicant_first_message_auto_accepts_pending_match(): void
    {
        // Create a NEW job posting for this test to avoid unique constraint violation
        $newJob = JobPosting::factory()->create([
            'company_id' => $this->acceptedMatch->jobPosting->company_id,
        ]);

        // Create a pending match (not accepted yet)
        $app = Application::factory()->matched()->create([
            'applicant_id' => $this->applicantProfile->id,
            'job_posting_id' => $newJob->id,
        ]);
        $pendingMatch = MatchRecord::factory()->create([
            'application_id' => $app->id,
            'applicant_id' => $this->applicantProfile->id,
            'job_posting_id' => $newJob->id,
            'hr_user_id' => $this->hrUser->id,
            'status' => 'pending',
            'response_deadline' => now()->addHours(23),
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/matches/{$pendingMatch->id}/messages", [
                'body' => 'Hi! I accept by messaging you.',
            ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true])
            ->assertJsonPath('meta.accepted_now', true)
            ->assertJsonPath('meta.match_status', 'accepted');

        $this->assertDatabaseHas('matches', [
            'id' => $pendingMatch->id,
            'status' => 'accepted',
        ]);
    }

    // ─── Get Messages ────────────────────────────────────────────────────

    public function test_participant_can_retrieve_message_history(): void
    {
        MatchMessage::factory()->count(3)->create([
            'match_id' => $this->acceptedMatch->id,
            'sender_id' => $this->hrUser->id,
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->getJson("/api/v1/matches/{$this->acceptedMatch->id}/messages");

        $response->assertOk()
            ->assertJson(['success' => true]);
    }

    // ─── Mark as Read ────────────────────────────────────────────────────

    public function test_participant_can_mark_messages_as_read(): void
    {
        MatchMessage::factory()->count(3)->create([
            'match_id' => $this->acceptedMatch->id,
            'sender_id' => $this->hrUser->id,
            'read_at' => null,
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->patchJson("/api/v1/matches/{$this->acceptedMatch->id}/messages/read");

        $response->assertOk()
            ->assertJsonPath('data.marked_read', 3);
    }

    // ─── Typing Indicator ────────────────────────────────────────────────

    public function test_participant_can_send_typing_indicator(): void
    {
        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/matches/{$this->acceptedMatch->id}/messages/typing");

        $response->assertOk()
            ->assertJson(['message' => 'Typing indicator sent.']);
    }

    // ─── Validation ──────────────────────────────────────────────────────

    public function test_send_message_requires_body(): void
    {
        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/matches/{$this->acceptedMatch->id}/messages", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['body']);
    }
}
