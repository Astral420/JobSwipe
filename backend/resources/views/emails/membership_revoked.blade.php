<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your access to {{ $companyName }} has been updated</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f7; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: #1a1a2e; padding: 32px 40px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 22px; margin: 0; }
        .body { padding: 40px; }
        .body p { color: #4a4a5a; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
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
        <p>Hi {{ $revokedUserEmail }},</p>

        <p>
            Your access to <strong>{{ $companyName }}</strong> on JobSwipe has been removed by a company administrator.
        </p>

        <p>
            If you believe this was done in error, please contact your company administrator directly.
        </p>

        <p style="font-size: 13px; color: #8a8a9a;">
            Your JobSwipe account remains active. You may still log in but will no longer have access to {{ $companyName }}'s hiring tools.
        </p>
    </div>
    <div class="footer">
        <p>— The JobSwipe Team</p>
    </div>
</div>
</body>
</html>
