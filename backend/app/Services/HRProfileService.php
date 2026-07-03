<?php

namespace App\Services;

use App\Mail\HRJoinedMail;
use App\Models\PostgreSQL\CompanyMembership;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\HRProfile;
use App\Models\PostgreSQL\User;
use App\Repositories\PostgreSQL\CompanyProfileRepository;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use InvalidArgumentException;

class HRProfileService
{
    /**
     * Accepted job title presets (Req 5 AC 1).
     */
    public const JOB_TITLES = [
        'HR Manager',
        'Recruiter',
        'Talent Acquisition Specialist',
        'People & Culture Lead',
        'Hiring Manager',
        'HR Generalist',
        'Other',
    ];

    public function __construct(
        private CompanyProfileRepository $companyProfiles,
        private NotificationService $notifications,
    ) {}

    /**
     * Create or update the HR profile for a user.
     * Validates job title, dispatches admin notification.
     * Req 4, Req 5, Req 6.
     */
    public function saveHRProfile(User $user, CompanyProfile $company, array $data): HRProfile
    {
        $jobTitle = trim($data['job_title'] ?? '');
        $customTitle = isset($data['custom_job_title']) ? trim($data['custom_job_title']) : null;

        $resolvedTitle = $this->resolveJobTitle($jobTitle, $customTitle);

        $profile = HRProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'company_id' => $company->id,
                'first_name' => trim($data['first_name']),
                'last_name' => trim($data['last_name']),
                'job_title' => $resolvedTitle,
                'photo_url' => $data['photo_url'] ?? null,
            ]
        );

        // Notify the inviting admin (Req 6)
        $this->dispatchAdminNotification($user, $company);

        return $profile->fresh();
    }

    /**
     * Retrieve the HR profile for a user.
     */
    public function getHRProfile(string $userId): ?HRProfile
    {
        return HRProfile::where('user_id', $userId)->first();
    }

    /**
     * Return the list of accepted job title presets.
     */
    public function getJobTitles(): array
    {
        return self::JOB_TITLES;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Validate and resolve the final job title string.
     * Req 5 AC 1-4.
     */
    private function resolveJobTitle(string $jobTitle, ?string $customTitle): string
    {
        if (! in_array($jobTitle, self::JOB_TITLES, true)) {
            throw new InvalidArgumentException('INVALID_JOB_TITLE');
        }

        if ($jobTitle === 'Other') {
            if ($customTitle === null || $customTitle === '') {
                throw new InvalidArgumentException('INVALID_JOB_TITLE');
            }

            return $customTitle;
        }

        return $jobTitle;
    }

    /**
     * Notify the company admin who invited this HR member.
     * Falls back to all active company admins if the original inviter no longer exists.
     * Req 6 AC 1-4.
     */
    private function dispatchAdminNotification(User $hrUser, CompanyProfile $company): void
    {
        // Find the membership to get the inviting admin's ID
        $membership = CompanyMembership::query()
            ->where('company_id', $company->id)
            ->where('user_id', $hrUser->id)
            ->first();

        $invitedByUserId = $membership?->invited_by_user_id;

        $adminUsers = collect();

        if ($invitedByUserId) {
            $invitingAdmin = User::find($invitedByUserId);
            if ($invitingAdmin) {
                $adminUsers = collect([$invitingAdmin]);
            }
        }

        // Fallback: notify all active company admins
        if ($adminUsers->isEmpty()) {
            $adminUsers = User::whereHas('companyMemberships', function ($q) use ($company) {
                $q->where('company_id', $company->id)
                    ->where('membership_role', 'company_admin')
                    ->where('status', 'active');
            })->where('id', '!=', $hrUser->id)->get();
        }

        foreach ($adminUsers as $admin) {
            try {
                // In-app notification record
                $this->notifications->create(
                    userId: $admin->id,
                    type: 'hr_joined',
                    title: 'New team member joined',
                    body: "{$hrUser->email} has joined {$company->company_name} as HR.",
                    data: ['hr_user_id' => $hrUser->id, 'company_id' => $company->id],
                );

                // Email notification
                Mail::to($admin->email)->queue(new HRJoinedMail($admin, $hrUser, $company));
            } catch (\Throwable $e) {
                Log::error('HRProfileService: Failed to notify admin of HR join', [
                    'admin_id' => $admin->id,
                    'hr_user_id' => $hrUser->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
