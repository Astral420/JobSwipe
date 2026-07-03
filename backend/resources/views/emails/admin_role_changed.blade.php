<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Role Changed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">
            Your Admin Role Has Been {{ $isPromotion ? 'Updated' : 'Changed' }}
        </h1>
        
        <p>Hello {{ $userName }},</p>
        
        <p>Your admin role has been {{ $isPromotion ? 'promoted' : 'updated' }} by <strong>{{ $changedBy }}</strong>.</p>
        
        <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Previous Role:</strong> {{ $oldRoleLabel }}</p>
            <p style="margin: 10px 0 0 0;"><strong>New Role:</strong> {{ $newRoleLabel }}</p>
        </div>
        
        @if($isPromotion)
            <p style="color: #059669;">
                🎉 Congratulations! You now have additional permissions and responsibilities.
            </p>
        @else
            <p>Your permissions have been adjusted to match your new role.</p>
        @endif
        
        <p><strong>What this means:</strong></p>
        <ul>
            @if($newRole === 'super_admin')
                <li>Full system access including destructive operations</li>
                <li>Ability to manage other admin users</li>
                <li>Access to all audit logs and system health metrics</li>
            @elseif($newRole === 'admin')
                <li>Most administrative actions except destructive operations</li>
                <li>Ability to verify companies and moderate content</li>
                <li>Access to analytics and revenue data</li>
            @else
                <li>Read-only access to most admin features</li>
                <li>Ability to view users, companies, jobs, and reviews</li>
                <li>Content moderation capabilities</li>
            @endif
        </ul>
        
        <p><strong>Important:</strong> For security reasons, all your existing sessions have been terminated. Please log in again to continue.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $loginUrl }}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Log In to Admin Dashboard
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
