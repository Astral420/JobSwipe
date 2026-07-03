<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AdminRoleChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $userName,
        public string $oldRole,
        public string $newRole,
        public string $changedBy,
    ) {}

    public function build(): self
    {
        $oldRoleLabel = match ($this->oldRole) {
            'super_admin' => 'Super Administrator',
            'admin' => 'Administrator',
            'moderator' => 'Moderator',
            default => ucfirst($this->oldRole),
        };

        $newRoleLabel = match ($this->newRole) {
            'super_admin' => 'Super Administrator',
            'admin' => 'Administrator',
            'moderator' => 'Moderator',
            default => ucfirst($this->newRole),
        };

        $isPromotion = $this->isPromotion($this->oldRole, $this->newRole);

        return $this->subject('Your Admin Role Has Been Updated')
            ->view('emails.admin_role_changed')
            ->with([
                'userName' => $this->userName,
                'oldRole' => $this->oldRole,
                'oldRoleLabel' => $oldRoleLabel,
                'newRole' => $this->newRole,
                'newRoleLabel' => $newRoleLabel,
                'changedBy' => $this->changedBy,
                'isPromotion' => $isPromotion,
                'loginUrl' => config('app.frontend_url').'/admin/login',
            ]);
    }

    private function isPromotion(string $oldRole, string $newRole): bool
    {
        $hierarchy = ['moderator' => 1, 'admin' => 2, 'super_admin' => 3];

        return ($hierarchy[$newRole] ?? 0) > ($hierarchy[$oldRole] ?? 0);
    }
}
