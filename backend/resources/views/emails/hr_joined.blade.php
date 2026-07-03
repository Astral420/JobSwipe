<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New team member joined</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f7; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: #1a1a2e; padding: 32px 40px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 22px; margin: 0; }
        .body { padding: 40px; }
        .body p { color: #4a4a5a; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
        .card { background: #f9f9fc; border-left: 4px solid #6c47ff; border-radius: 4px; padding: 16px 20px; margin: 24px 0; }
        .card p { margin: 4px 0; font-size: 14px; color: #4a4a5a; }
        .cta { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; background: #6c47ff; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; }
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
        <p>Hi {{ $adminName }},</p>

        <p>🎉 Great news — a new team member has joined <strong>{{ $companyName }}</strong>!</p>

        <div class="card">
            <p><strong>Name:</strong> {{ $hrName }}</p>
            <p><strong>Email:</strong> {{ $hrEmail }}</p>
            <p><strong>Role:</strong> {{ $role }}</p>
        </div>

        <div class="cta">
            <a href="{{ $teamDashboard }}" class="btn">View Team</a>
        </div>
    </div>
    <div class="footer">
        <p>— The JobSwipe Team</p>
    </div>
</div>
</body>
</html>
