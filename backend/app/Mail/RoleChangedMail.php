<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class RoleChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $userName,
        public string $oldRole,
        public string $newRole,
        public string $changedBy,
        public array $permissions,
    ) {}

    public function build(): self
    {
        $oldRoleLabel = $this->getRoleLabel($this->oldRole);
        $newRoleLabel = $this->getRoleLabel($this->newRole);

        // Determine if this is a promotion or demotion
        $roleHierarchy = ['moderator' => 1, 'admin' => 2, 'super_admin' => 3];
        $isPromotion = ($roleHierarchy[$this->newRole] ?? 0) > ($roleHierarchy[$this->oldRole] ?? 0);

        $loginUrl = config('app.frontend_url').'/login';

        return $this->subject("Your JobSwipe Admin Role Has Been Updated to {$newRoleLabel}")
            ->view('emails.role_changed')
            ->with([
                'userName' => $this->userName,
                'oldRoleLabel' => $oldRoleLabel,
                'newRoleLabel' => $newRoleLabel,
                'changedBy' => $this->changedBy,
                'permissions' => $this->permissions,
                'isPromotion' => $isPromotion,
                'loginUrl' => $loginUrl,
            ]);
    }

    private function getRoleLabel(string $role): string
    {
        return match ($role) {
            'super_admin' => 'Super Administrator',
            'admin' => 'Administrator',
            'moderator' => 'Moderator',
            default => ucfirst($role),
        };
    }
}
