<?php

namespace App\Services;

use App\Models\PostgreSQL\AdminSession;
use App\Models\PostgreSQL\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SessionManagementService
{
    /**
     * Get all active sessions for a specific user
     */
    public function getActiveSessions(string $userId): Collection
    {
        return AdminSession::where('user_id', $userId)
            ->where('expires_at', '>', now())
            ->orderBy('last_activity_at', 'desc')
            ->get();
    }

    /**
     * Get all active admin sessions across all users
     */
    public function getAllActiveSessions(): Collection
    {
        return AdminSession::with('user')
            ->where('expires_at', '>', now())
            ->orderBy('last_activity_at', 'desc')
            ->get();
    }

    /**
     * Terminate a specific session by token ID
     */
    public function terminateSession(string $tokenId, User $actor): bool
    {
        $session = AdminSession::where('token_id', $tokenId)->first();

        if (! $session) {
            return false;
        }

        // Revoke the Sanctum token
        DB::table('personal_access_tokens')
            ->where('id', $tokenId)
            ->delete();

        // Delete the session record
        $session->delete();

        return true;
    }

    /**
     * Terminate all sessions for a specific user
     */
    public function terminateAllUserSessions(string $userId): int
    {
        $sessions = AdminSession::where('user_id', $userId)->get();
        $count = $sessions->count();

        foreach ($sessions as $session) {
            // Revoke the Sanctum token
            DB::table('personal_access_tokens')
                ->where('id', $session->token_id)
                ->delete();

            // Delete the session record
            $session->delete();
        }

        return $count;
    }

    /**
     * Check if a session is inactive (exceeded inactivity timeout)
     */
    public function checkInactivity(string $tokenId): bool
    {
        $session = AdminSession::where('token_id', $tokenId)->first();

        if (! $session) {
            return true; // Session doesn't exist, consider it inactive
        }

        return $session->isInactive();
    }

    /**
     * Extend a session by updating last activity timestamp
     */
    public function extendSession(string $tokenId): bool
    {
        $session = AdminSession::where('token_id', $tokenId)->first();

        if (! $session) {
            return false;
        }

        $session->updateActivity();

        return true;
    }

    /**
     * Create a new admin session record
     */
    public function createSession(
        string $userId,
        string $tokenId,
        string $ipAddress,
        string $userAgent
    ): AdminSession {
        $expiresAt = now()->addHours(config('admin.session.token_expiration_hours', 24));

        return AdminSession::create([
            'user_id' => $userId,
            'token_id' => $tokenId,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'last_activity_at' => now(),
            'expires_at' => $expiresAt,
        ]);
    }

    /**
     * Clean up expired sessions
     */
    public function cleanupExpiredSessions(): int
    {
        $expiredSessions = AdminSession::where('expires_at', '<', now())->get();
        $count = $expiredSessions->count();

        foreach ($expiredSessions as $session) {
            // Revoke the Sanctum token if it still exists
            DB::table('personal_access_tokens')
                ->where('id', $session->token_id)
                ->delete();

            // Delete the session record
            $session->delete();
        }

        return $count;
    }
}
