<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $error ? 'Authentication Failed' : 'Redirecting to JobSwipe...' }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .logo {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 32px;
            font-weight: bold;
            color: white;
        }
        
        h1 {
            font-size: 24px;
            color: #1a202c;
            margin-bottom: 12px;
        }
        
        p {
            color: #718096;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 24px;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            margin: 20px auto;
            border: 4px solid #e2e8f0;
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s;
        }
        
        .button:hover {
            transform: translateY(-2px);
        }
        
        .manual-link {
            margin-top: 20px;
            padding: 16px;
            background: #f7fafc;
            border-radius: 8px;
            word-break: break-all;
            font-size: 12px;
            color: #4a5568;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">J</div>
        
        @if($error)
            <div class="error-icon">⚠️</div>
            <h1>Authentication Failed</h1>
            <p>Unable to complete Google sign-in. Please try again.</p>
            <a href="#" onclick="window.close(); return false;" class="button">Close</a>
        @else
            <h1>Success!</h1>
            <p>Redirecting you back to JobSwipe...</p>
            <div class="spinner"></div>
            <p style="font-size: 14px; color: #a0aec0;">If you're not redirected automatically, tap the button below:</p>
            <a href="{!! $deepLink !!}" class="button">Open JobSwipe</a>
            
            <div class="manual-link">
                <strong>Deep Link:</strong><br>
                {!! $deepLink !!}
            </div>
        @endif
    </div>
    
    <script>
        // Attempt automatic redirect
        @if(!$error)
            window.location.href = {!! json_encode($deepLink) !!};
            
            // Fallback: try again after 1 second
            setTimeout(function() {
                window.location.href = {!! json_encode($deepLink) !!};
            }, 1000);
        @endif
    </script>
</body>
</html>
