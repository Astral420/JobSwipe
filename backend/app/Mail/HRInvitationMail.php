<?php

namespace App\Mail;

use App\Models\PostgreSQL\CompanyInvite;
use App\Models\PostgreSQL\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class HRInvitationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly CompanyInvite $invite,
        public readonly ?User $inviter,
        public readonly string $rawToken,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        $companyName = $this->invite->company?->company_name ?? 'a company';

        return new Envelope(
            subject: "You've been invited to join {$companyName} on JobSwipe",
        );
    }

    public function content(): Content
    {
        $webAppUrl = rtrim((string) config('app.web_app_url', config('app.url')), '/');
        $magicLink = $webAppUrl.'/invite?token='.urlencode($this->rawToken).'&email='.urlencode($this->invite->email);
        $inviterName = $this->inviter ? ($this->inviter->email) : 'Your administrator';
        $companyName = $this->invite->company?->company_name ?? 'the company';

        return new Content(
            view: 'emails.hr_invitation',
            with: [
                'magicLink' => $magicLink,
                'inviterName' => $inviterName,
                'companyName' => $companyName,
                'role' => $this->invite->invite_role,
                'expiresAt' => $this->invite->expires_at?->format('F j, Y'),
                'rawToken' => $this->rawToken,
                'email' => $this->invite->email,
            ],
        );
    }
}
