<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Role Changed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">Your Admin Role Has Been Updated</h1>
        
        <p>Hello {{ $userName }},</p>
        
        <p>Your admin role on JobSwipe has been updated by <strong>{{ $changedBy }}</strong>.</p>
        
        <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Previous Role:</strong> {{ $oldRoleLabel }}</p>
            <p style="margin: 10px 0 0 0;"><strong>New Role:</strong> {{ $newRoleLabel }}</p>
        </div>
        
        @if($isPromotion)
        <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #065f46;"><strong>🎉 Congratulations!</strong> You've been promoted to {{ $newRoleLabel }}.</p>
        </div>
        @else
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #92400e;"><strong>ℹ️ Notice:</strong> Your role has been changed to {{ $newRoleLabel }}.</p>
        </div>
        @endif
        
        <h3 style="color: #374151; margin-top: 30px;">Your New Permissions:</h3>
        <ul style="color: #6b7280; line-height: 1.8;">
            @foreach($permissions as $permission)
            <li>{{ $permission }}</li>
            @endforeach
        </ul>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #991b1b;"><strong>⚠️ Important:</strong> For security reasons, all your existing sessions have been terminated. You'll need to log in again to access the admin dashboard with your new permissions.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $loginUrl }}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Log In to Dashboard
            </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
            If you have any questions about your new role or permissions, please contact your administrator.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
            © {{ date('Y') }} JobSwipe. All rights reserved.
        </p>
    </div>
</body>
</html>
