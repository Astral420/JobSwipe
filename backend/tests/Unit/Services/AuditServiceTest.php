<?php

namespace Tests\Unit\Services;

use App\Models\PostgreSQL\AuditLog;
use App\Models\PostgreSQL\User;
use App\Services\AuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditServiceTest extends TestCase
{
    use RefreshDatabase;

    private AuditService $auditService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->auditService = new AuditService;
    }

    public function test_log_creates_audit_log_with_all_fields(): void
    {
        // Arrange
        $actor = User::factory()->create([
            'role' => 'super_admin',
            'email' => 'admin@example.com',
        ]);

        $targetUser = User::factory()->create();
        $metadata = ['reason' => 'Violation of terms'];
        $beforeState = ['is_banned' => false];
        $afterState = ['is_banned' => true];

        // Act
        $log = $this->auditService->log(
            actionType: 'user_ban',
            resourceType: 'user',
            resourceId: $targetUser->id,
            actor: $actor,
            metadata: $metadata,
            beforeState: $beforeState,
            afterState: $afterState
        );

        // Assert
        $this->assertInstanceOf(AuditLog::class, $log);
        $this->assertEquals('user_ban', $log->action_type);
        $this->assertEquals('user', $log->resource_type);
        $this->assertEquals($targetUser->id, $log->resource_id);
        $this->assertEquals($actor->id, $log->actor_id);
        $this->assertEquals('super_admin', $log->actor_role);
        $this->assertEquals($metadata, $log->metadata);
        $this->assertEquals($beforeState, $log->before_state);
        $this->assertEquals($afterState, $log->after_state);
        $this->assertNotNull($log->created_at);
    }

    public function test_log_creates_audit_log_with_minimal_fields(): void
    {
        // Arrange
        $actor = User::factory()->create(['role' => 'admin']);
        $targetUser = User::factory()->create();

        // Act
        $log = $this->auditService->log(
            actionType: 'company_verify',
            resourceType: 'company',
            resourceId: $targetUser->id,
            actor: $actor
        );

        // Assert
        $this->assertInstanceOf(AuditLog::class, $log);
        $this->assertEquals('company_verify', $log->action_type);
        $this->assertEquals('company', $log->resource_type);
        $this->assertEquals($targetUser->id, $log->resource_id);
        $this->assertNull($log->metadata);
        $this->assertNull($log->before_state);
        $this->assertNull($log->after_state);
    }

    public function test_query_returns_paginated_results(): void
    {
        // Arrange
        $actor = User::factory()->create(['role' => 'super_admin']);
        $targetUsers = User::factory()->count(5)->create();

        // Create multiple audit logs
        foreach ($targetUsers as $targetUser) {
            $this->auditService->log(
                actionType: 'user_ban',
                resourceType: 'user',
                resourceId: $targetUser->id,
                actor: $actor
            );
        }

        // Act
        $results = $this->auditService->query(['per_page' => 3]);

        // Assert
        $this->assertCount(3, $results->items());
        $this->assertEquals(5, $results->total());
    }

    public function test_query_filters_by_actor_id(): void
    {
        // Arrange
        $actor1 = User::factory()->create(['role' => 'super_admin']);
        $actor2 = User::factory()->create(['role' => 'admin']);
        $targetUsers = User::factory()->count(3)->create();

        $this->auditService->log('user_ban', 'user', $targetUsers[0]->id, $actor1);
        $this->auditService->log('user_ban', 'user', $targetUsers[1]->id, $actor2);
        $this->auditService->log('user_ban', 'user', $targetUsers[2]->id, $actor1);

        // Act
        $results = $this->auditService->query(['actor_id' => $actor1->id]);

        // Assert
        $this->assertCount(2, $results->items());
        foreach ($results->items() as $log) {
            $this->assertEquals($actor1->id, $log->actor_id);
        }
    }

    public function test_query_filters_by_action_type(): void
    {
        // Arrange
        $actor = User::factory()->create(['role' => 'super_admin']);
        $targetUsers = User::factory()->count(3)->create();

        $this->auditService->log('user_ban', 'user', $targetUsers[0]->id, $actor);
        $this->auditService->log('company_suspend', 'company', $targetUsers[1]->id, $actor);
        $this->auditService->log('user_ban', 'user', $targetUsers[2]->id, $actor);

        // Act
        $results = $this->auditService->query(['action_type' => 'user_ban']);

        // Assert
        $this->assertCount(2, $results->items());
        foreach ($results->items() as $log) {
            $this->assertEquals('user_ban', $log->action_type);
        }
    }

    public function test_query_filters_by_resource_type(): void
    {
        // Arrange
        $actor = User::factory()->create(['role' => 'super_admin']);
        $targetUsers = User::factory()->count(3)->create();

        $this->auditService->log('user_ban', 'user', $targetUsers[0]->id, $actor);
        $this->auditService->log('company_suspend', 'company', $targetUsers[1]->id, $actor);
        $this->auditService->log('user_unban', 'user', $targetUsers[2]->id, $actor);

        // Act
        $results = $this->auditService->query(['resource_type' => 'user']);

        // Assert
        $this->assertCount(2, $results->items());
        foreach ($results->items() as $log) {
            $this->assertEquals('user', $log->resource_type);
        }
    }

    public function test_query_filters_by_date_range(): void
    {
        // Arrange
        $actor = User::factory()->create(['role' => 'super_admin']);
        $targetUsers = User::factory()->count(3)->create();

        // Create logs with different dates by manipulating timestamps directly in DB
        $log1 = $this->auditService->log('user_ban', 'user', $targetUsers[0]->id, $actor);
        \DB::table('audit_logs')->where('id', $log1->id)->update(['created_at' => now()->subDays(5)]);

        $log2 = $this->auditService->log('user_ban', 'user', $targetUsers[1]->id, $actor);
        \DB::table('audit_logs')->where('id', $log2->id)->update(['created_at' => now()->subDays(2)]);

        $log3 = $this->auditService->log('user_ban', 'user', $targetUsers[2]->id, $actor);

        // Act
        $results = $this->auditService->query([
            'date_from' => now()->subDays(3)->format('Y-m-d'),
            'date_to' => now()->format('Y-m-d'),
        ]);

        // Assert
        $this->assertCount(2, $results->items());
    }

    public function test_export_generates_csv_file(): void
    {
        // Arrange
        $actor = User::factory()->create([
            'role' => 'super_admin',
            'email' => 'admin@example.com',
        ]);
        $targetUser = User::factory()->create();

        $this->auditService->log(
            actionType: 'user_ban',
            resourceType: 'user',
            resourceId: $targetUser->id,
            actor: $actor,
            metadata: ['reason' => 'Test'],
            beforeState: ['is_banned' => false],
            afterState: ['is_banned' => true]
        );

        // Act
        $path = $this->auditService->export([]);

        // Assert
        $this->assertFileExists($path);
        $content = file_get_contents($path);
        $this->assertStringContainsString('Action Type', $content);
        $this->assertStringContainsString('user_ban', $content);
        $this->assertStringContainsString('admin@example.com', $content);

        // Cleanup
        if (file_exists($path)) {
            unlink($path);
        }
    }

    public function test_get_action_types_returns_configured_types(): void
    {
        // Act
        $actionTypes = $this->auditService->getActionTypes();

        // Assert
        $this->assertIsArray($actionTypes);
        $this->assertContains('user_ban', $actionTypes);
        $this->assertContains('company_suspend', $actionTypes);
    }

    public function test_audit_log_is_immutable_cannot_update(): void
    {
        // Arrange
        $actor = User::factory()->create(['role' => 'super_admin']);
        $targetUser = User::factory()->create();
        $log = $this->auditService->log('user_ban', 'user', $targetUser->id, $actor);

        // Act & Assert
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Audit logs cannot be modified');
        $log->action_type = 'user_unban';
        $log->save();
    }

    public function test_audit_log_is_immutable_cannot_delete(): void
    {
        // Arrange
        $actor = User::factory()->create(['role' => 'super_admin']);
        $targetUser = User::factory()->create();
        $log = $this->auditService->log('user_ban', 'user', $targetUser->id, $actor);

        // Act & Assert
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Audit logs cannot be deleted');
        $log->delete();
    }
}
