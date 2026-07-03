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

class HRJoinedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $admin,
        public readonly User $hrUser,
        public readonly CompanyProfile $company,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->hrUser->email} has joined your team on JobSwipe",
        );
    }

    public function content(): Content
    {
        $webAppUrl = rtrim((string) config('app.web_app_url', config('app.url')), '/');
        $teamDashboard = $webAppUrl.'/dashboard/team';
        $hrProfile = $this->hrUser->hrProfile;
        $hrName = $hrProfile
            ? trim("{$hrProfile->first_name} {$hrProfile->last_name}")
            : $this->hrUser->email;

        return new Content(
            view: 'emails.hr_joined',
            with: [
                'adminName' => $this->admin->email,
                'hrName' => $hrName,
                'hrEmail' => $this->hrUser->email,
                'companyName' => $this->company->company_name,
                'role' => 'HR Member',
                'teamDashboard' => $teamDashboard,
            ],
        );
    }
}
