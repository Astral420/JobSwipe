<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Invitation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">Welcome to JobSwipe Admin</h1>
        
        <p>Hello,</p>
        
        <p><strong>{{ $inviterName }}</strong> has invited you to join the JobSwipe admin team as a <strong>{{ $roleLabel }}</strong>.</p>
        
        <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email:</strong> {{ $email }}</p>
            <p style="margin: 10px 0 0 0;"><strong>Role:</strong> {{ $roleLabel }}</p>
        </div>
        
        <p>To accept this invitation and set up your account, please click the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $invitationUrl }}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Accept Invitation
            </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
            <strong>Note:</strong> This invitation will expire in {{ $expiresInDays }} days. 
            If you don't accept it within this time, you'll need to request a new invitation.
        </p>
        
        <p style="color: #666; font-size: 14px;">
            If you didn't expect this invitation, you can safely ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
            © {{ date('Y') }} JobSwipe. All rights reserved.
        </p>
    </div>
</body>
</html>
