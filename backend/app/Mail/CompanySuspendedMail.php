<?php

namespace App\Mail;

use App\Models\PostgreSQL\CompanyProfile;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CompanySuspendedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly CompanyProfile $company,
        public readonly string $reason,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your JobSwipe Company Account Has Been Suspended',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.company_suspended',
            with: [
                'companyName' => $this->company->company_name,
                'reason' => $this->reason,
            ],
        );
    }
}
