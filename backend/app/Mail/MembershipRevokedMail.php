<?php

namespace App\Mail;

use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MembershipRevokedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $revokedUser,
        public readonly CompanyProfile $company,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        $companyName = $this->company->company_name ?? 'a company';

        return new Envelope(
            subject: "Your access to {$companyName} on JobSwipe has been updated",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.membership_revoked',
            with: [
                'revokedUserEmail' => $this->revokedUser->email,
                'companyName' => $this->company->company_name,
            ],
        );
    }
}
