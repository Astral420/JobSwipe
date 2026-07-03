<?php

namespace Tests\Feature\Swipe;

use App\Models\PostgreSQL\ApplicantProfile;
use App\Models\PostgreSQL\User;
use App\Services\DeckService;
use App\Services\SwipeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class SwipeTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private ApplicantProfile $profile;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->applicant()->create();
        $this->profile = ApplicantProfile::factory()->create([
            'user_id' => $this->user->id,
        ]);
    }

    // ─── Swipe Right (Apply) ─────────────────────────────────────────────

    public function test_applicant_can_swipe_right_on_job(): void
    {
        $swipeMock = Mockery::mock(SwipeService::class);
        $swipeMock->shouldReceive('applicantSwipeRight')
            ->once()
            ->with($this->user->id, 'job-123')
            ->andReturn(['status' => 'applied']);
        $this->app->instance(SwipeService::class, $swipeMock);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/applicant/swipe/right/job-123');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Application submitted successfully',
            ]);
    }

    public function test_swipe_right_duplicate_returns_409(): void
    {
        $swipeMock = Mockery::mock(SwipeService::class);
        $swipeMock->shouldReceive('applicantSwipeRight')
            ->once()
            ->andReturn(['status' => 'already_swiped']);
        $this->app->instance(SwipeService::class, $swipeMock);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/applicant/swipe/right/job-123');

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'ALREADY_SWIPED',
            ]);
    }

    public function test_swipe_right_limit_reached_returns_429(): void
    {
        $swipeMock = Mockery::mock(SwipeService::class);
        $swipeMock->shouldReceive('applicantSwipeRight')
            ->once()
            ->andReturn(['status' => 'limit_reached']);
        $this->app->instance(SwipeService::class, $swipeMock);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/applicant/swipe/right/job-123');

        $response->assertStatus(429)
            ->assertJson([
                'success' => false,
                'code' => 'SWIPE_LIMIT_REACHED',
            ]);
    }

    // ─── Swipe Left (Dismiss) ────────────────────────────────────────────

    public function test_applicant_can_swipe_left_on_job(): void
    {
        $swipeMock = Mockery::mock(SwipeService::class);
        $swipeMock->shouldReceive('applicantSwipeLeft')
            ->once()
            ->with($this->user->id, 'job-456')
            ->andReturn(['status' => 'dismissed']);
        $this->app->instance(SwipeService::class, $swipeMock);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/applicant/swipe/left/job-456');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Job dismissed',
            ]);
    }

    public function test_swipe_left_duplicate_returns_409(): void
    {
        $swipeMock = Mockery::mock(SwipeService::class);
        $swipeMock->shouldReceive('applicantSwipeLeft')
            ->once()
            ->andReturn(['status' => 'already_swiped']);
        $this->app->instance(SwipeService::class, $swipeMock);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/applicant/swipe/left/job-456');

        $response->assertStatus(409)
            ->assertJson(['code' => 'ALREADY_SWIPED']);
    }

    // ─── Get Limits ──────────────────────────────────────────────────────

    public function test_get_swipe_limits_returns_current_state(): void
    {
        $this->profile->update([
            'daily_swipes_used' => 5,
            'daily_swipe_limit' => 65,
            'extra_swipe_balance' => 10,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/applicant/swipe/limits');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'daily_swipes_used' => 5,
                    'daily_swipe_limit' => 65,
                    'extra_swipe_balance' => 10,
                    'has_swipes_remaining' => true,
                ],
            ]);
    }

    public function test_get_limits_shows_no_remaining_when_exhausted(): void
    {
        $this->profile->update([
            'daily_swipes_used' => 65,
            'daily_swipe_limit' => 65,
            'extra_swipe_balance' => 0,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/applicant/swipe/limits');

        $response->assertOk()
            ->assertJsonPath('data.has_swipes_remaining', false);
    }

    public function test_get_limits_has_remaining_with_extra_swipes(): void
    {
        $this->profile->update([
            'daily_swipes_used' => 65,
            'daily_swipe_limit' => 65,
            'extra_swipe_balance' => 5,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/applicant/swipe/limits');

        $response->assertOk()
            ->assertJsonPath('data.has_swipes_remaining', true);
    }

    // ─── Get Deck ────────────────────────────────────────────────────────

    public function test_get_deck_returns_jobs_with_structure(): void
    {
        $deckMock = Mockery::mock(DeckService::class);
        $deckMock->shouldReceive('getJobDeck')
            ->once()
            ->with($this->user->id, 20, null)
            ->andReturn([
                'jobs' => [
                    ['id' => 'j1', 'title' => 'Laravel Dev', 'relevance_score' => 0.85],
                ],
                'has_more' => true,
                'total_unseen' => 42,
                'next_cursor' => 'cursor-abc',
            ]);
        $this->app->instance(DeckService::class, $deckMock);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/applicant/swipe/deck');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'jobs',
                    'has_more',
                    'total_unseen',
                    'next_cursor',
                ],
            ])
            ->assertJsonPath('data.has_more', true)
            ->assertJsonPath('data.total_unseen', 42);
    }

    public function test_get_deck_accepts_per_page_and_cursor(): void
    {
        $deckMock = Mockery::mock(DeckService::class);
        $deckMock->shouldReceive('getJobDeck')
            ->once()
            ->with($this->user->id, 10, 'my-cursor')
            ->andReturn(['jobs' => [], 'has_more' => false, 'total_unseen' => 0, 'next_cursor' => null]);
        $this->app->instance(DeckService::class, $deckMock);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/applicant/swipe/deck?per_page=10&cursor=my-cursor');

        $response->assertOk();
    }

    // ─── RBAC ────────────────────────────────────────────────────────────

    public function test_hr_user_cannot_access_swipe_endpoints(): void
    {
        $hr = User::factory()->hr()->create();

        $this->actingAs($hr)
            ->getJson('/api/v1/applicant/swipe/deck')
            ->assertStatus(403);

        $this->actingAs($hr)
            ->postJson('/api/v1/applicant/swipe/right/job-1')
            ->assertStatus(403);

        $this->actingAs($hr)
            ->getJson('/api/v1/applicant/swipe/limits')
            ->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_access_swipe_endpoints(): void
    {
        $this->getJson('/api/v1/applicant/swipe/deck')
            ->assertStatus(401);

        $this->postJson('/api/v1/applicant/swipe/right/job-1')
            ->assertStatus(401);
    }
}
