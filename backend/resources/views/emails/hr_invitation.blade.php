<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You've been invited to join {{ $companyName }} on JobSwipe</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f7; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: #1a1a2e; padding: 32px 40px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 22px; margin: 0; letter-spacing: -0.5px; }
        .body { padding: 40px; }
        .body p { color: #4a4a5a; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
        .cta { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; background: #6c47ff; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.2px; }
        .fallback { background: #f4f4f7; border-radius: 6px; padding: 16px; margin-top: 24px; }
        .fallback p { font-size: 13px; color: #8a8a9a; margin: 0 0 8px; }
        .fallback code { font-size: 11px; color: #555; word-break: break-all; }
        .footer { padding: 24px 40px; border-top: 1px solid #ececf0; text-align: center; }
        .footer p { font-size: 13px; color: #a0a0b0; margin: 0; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>JobSwipe</h1>
    </div>
    <div class="body">
        <p>Hi {{ $email }},</p>

        <p>
            <strong>{{ $inviterName }}</strong> has invited you to join
            <strong>{{ $companyName }}</strong> as a member of their hiring team on JobSwipe.
        </p>

        <div class="cta">
            <a href="{{ $magicLink }}" class="btn">Accept Invite &amp; Get Started</a>
        </div>

        <p style="font-size: 13px; color: #8a8a9a;">
            This invite link expires on <strong>{{ $expiresAt }}</strong>.
        </p>

        <div class="fallback">
            <p>If the button above doesn't work, copy this link into your browser:</p>
            <code>{{ $magicLink }}</code>
        </div>
    </div>
    <div class="footer">
        <p>You received this email because an admin invited you. If this was unexpected, you can safely ignore it.</p>
        <p style="margin-top: 8px;">— The JobSwipe Team</p>
    </div>
</div>
</body>
</html>
