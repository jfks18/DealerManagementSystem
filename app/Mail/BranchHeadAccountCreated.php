<?php

namespace App\Mail;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BranchHeadAccountCreated extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public User $branchHead,
        public Branch $branch,
        public string $plainPassword,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Branch Head Account Credentials',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.branch-head-account-created',
        );
    }
}
