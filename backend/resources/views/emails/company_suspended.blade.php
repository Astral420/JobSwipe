<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Company Account Suspended</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h1 style="color: #dc3545; margin-top: 0;">Company Account Suspended</h1>
        
        <p>Hello {{ $companyName }} Team,</p>
        
        <p>We're writing to inform you that your company account on JobSwipe has been suspended by our moderation team.</p>
        
        <div style="background-color: #fff; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
            <strong>Suspension Reason:</strong>
            <p style="margin: 10px 0 0 0;">{{ $reason }}</p>
        </div>
        
        <p><strong>What this means:</strong></p>
        <ul>
            <li>Your company profile is no longer visible to job seekers</li>
            <li>You cannot create new job postings</li>
            <li>Existing job postings have been hidden from the platform</li>
            <li>Your team members cannot access company features</li>
        </ul>
        
        <p>If you believe this suspension was made in error or would like to appeal this decision, please contact our support team at <a href="mailto:support@jobswipe.com">support@jobswipe.com</a>.</p>
        
        <p>Best regards,<br>
        The JobSwipe Team</p>
    </div>
    
    <div style="text-align: center; color: #6c757d; font-size: 12px;">
        <p>This is an automated message from JobSwipe. Please do not reply to this email.</p>
    </div>
</body>
</html>
