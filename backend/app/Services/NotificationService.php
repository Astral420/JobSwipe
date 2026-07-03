<?php

namespace App\Services;

use App\Models\PostgreSQL\Notification;
use App\Models\PostgreSQL\User;
use App\Repositories\MongoDB\ApplicantProfileDocumentRepository;
use App\Repositories\MongoDB\CompanyProfileDocumentRepository;
use App\Repositories\PostgreSQL\NotificationRepository;
use Illuminate\Contracts\Mail\Mailable;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    public function __construct(
        private NotificationRepository $notifications,
        private ApplicantProfileDocumentRepository $applicantProfiles,
        private CompanyProfileDocumentRepository $companyProfiles,
    ) {}

    public function create(
        string $userId,
        string $type,
        string $title,
        string $body,
        ?array $data = null,
    ): Notification {
        return $this->notifications->create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data,
        ]);
    }

    public function sendPush(
        string $userId,
        string $type,
        string $title,
        string $body,
        ?array $data = null,

    ): void {
        // Check if user has push notifications enabled
        if (! $this->canSendPush($userId, $type)) {
            return;
        }

        // TODO: EXPO NOTIFICATION
    }

    public function sendEmail(string $userId, Mailable $mailable, ?string $type = null): void
    {
        // Check if user has email notifications enabled
        if ($type && ! $this->canSendEmail($userId, $type)) {
            return;
        }

        $user = User::findOrFail($userId);
        Mail::to($user->email)->queue($mailable);
    }

    public function markAsRead(string $notificationId): void
    {
        $this->notifications->markAsRead($notificationId);
    }

    public function markAllAsRead(string $userId): void
    {
        $this->notifications->markAllAsRead($userId);
    }

    public function getUnreadCount(string $userId): int
    {
        return $this->notifications->getUnreadCount($userId);
    }

    public function getForUser(string $userId, int $perPage = 20)
    {
        return $this->notifications->getForUser($userId, $perPage);
    }

    public function getUnread(string $userId, int $perPage = 20)
    {
        return $this->notifications->getUnread($userId, $perPage);
    }

    public function getNotificationPreferences(string $userId): array
    {
        $user = User::findOrFail($userId);

        // Check if applicant or company/HR user
        if ($user->role === 'applicant') {
            return $this->applicantProfiles->getNotificationPreferences($userId) ?? [];
        }

        // For HR/company_admin, get company profile preferences
        if (in_array($user->role, ['hr', 'company_admin'])) {
            $companyId = $user->companyProfile?->id;
            if ($companyId) {
                return $this->companyProfiles->getNotificationPreferences($companyId) ?? [];
            }
        }

        return [];
    }

    public function updateNotificationPreferences(string $userId, array $preferences): void
    {
        $user = User::findOrFail($userId);

        // Check if applicant or company/HR user
        if ($user->role === 'applicant') {
            $this->applicantProfiles->updateNotificationPreferences($userId, $preferences);

            return;
        }

        // For HR/company_admin, update company profile preferences
        if (in_array($user->role, ['hr', 'company_admin'])) {
            $companyId = $user->companyProfile?->id;
            if ($companyId) {
                $this->companyProfiles->updateNotificationPreferences($companyId, $preferences);
            }
        }
    }

    private function canSendEmail(string $userId, string $type): bool
    {
        $preferences = $this->getNotificationPreferences($userId);

        if (empty($preferences)) {
            return true; // Default to enabled if no preferences set
        }

        // Check global email toggle
        if (isset($preferences['email_enabled']) && ! $preferences['email_enabled']) {
            return false;
        }

        // Check specific channel preference
        if (isset($preferences['channels'][$type]['email'])) {
            return $preferences['channels'][$type]['email'];
        }

        return true; // Default to enabled
    }

    private function canSendPush(string $userId, string $type): bool
    {
        $preferences = $this->getNotificationPreferences($userId);

        if (empty($preferences)) {
            return true; // Default to enabled if no preferences set
        }

        // Check global push toggle
        if (isset($preferences['push_enabled']) && ! $preferences['push_enabled']) {
            return false;
        }

        // Check specific channel preference
        if (isset($preferences['channels'][$type]['push'])) {
            return $preferences['channels'][$type]['push'];
        }

        return true; // Default to enabled
    }

    /**
     * Notify company when a review is submitted
     */
    public function notifyCompanyOfReview(string $companyId, string $reviewId): void
    {
        // Get company admin/HR users
        $companyUsers = User::whereHas('companyProfile', function ($query) use ($companyId) {
            $query->where('id', $companyId);
        })->get();

        foreach ($companyUsers as $user) {
            $this->create(
                $user->id,
                'review_received',
                'New Review Received',
                'An applicant has left a review for your company.',
                ['review_id' => $reviewId, 'company_id' => $companyId]
            );
        }
    }

    /**
     * Notify moderators when a review is flagged
     */
    public function notifyModerators(string $type, string $reviewId, string $userId): void
    {
        // Get all moderators and super_admins
        $moderators = User::whereIn('role', ['moderator', 'super_admin'])->get();

        foreach ($moderators as $moderator) {
            $this->create(
                $moderator->id,
                $type,
                'Review Flagged for Moderation',
                'A review has been flagged and requires moderation.',
                ['review_id' => $reviewId, 'flagged_by' => $userId]
            );
        }
    }
}
