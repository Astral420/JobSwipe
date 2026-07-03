<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AdminInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $email,
        public string $role,
        public string $token,
        public string $inviterName,
    ) {}

    public function build(): self
    {
        $roleLabel = match ($this->role) {
            'admin' => 'Administrator',
            'moderator' => 'Moderator',
            default => ucfirst($this->role),
        };

        $invitationUrl = config('app.frontend_url').'/admin/accept-invitation?token='.$this->token;

        return $this->subject("You've been invited to join JobSwipe as {$roleLabel}")
            ->view('emails.admin_invitation')
            ->with([
                'email' => $this->email,
                'role' => $this->role,
                'roleLabel' => $roleLabel,
                'inviterName' => $this->inviterName,
                'invitationUrl' => $invitationUrl,
                'expiresInDays' => config('admin.invitation.token_expiration_days', 7),
            ]);
    }
}
