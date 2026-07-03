<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Google OAuth Configuration Test ===\n\n";

echo 'GOOGLE_CLIENT_ID: '.(config('services.google.client_id') ? '✓ Set' : '✗ Missing')."\n";
echo 'GOOGLE_CLIENT_SECRET: '.(config('services.google.client_secret') ? '✓ Set' : '✗ Missing')."\n";
echo 'GOOGLE_REDIRECT_URI: '.config('services.google.redirect')."\n\n";

if (! config('services.google.client_id') || ! config('services.google.client_secret')) {
    echo "❌ Google OAuth is not properly configured!\n";
    echo "Please check your .env file.\n";
    exit(1);
}

echo "✅ Google OAuth configuration looks good!\n\n";

echo "Expected callback URL:\n";
echo '  '.config('services.google.redirect')."\n\n";

echo "Make sure this EXACT URL is added to Google Cloud Console:\n";
echo "  1. Go to https://console.cloud.google.com/\n";
echo "  2. Navigate to: APIs & Services → Credentials\n";
echo "  3. Click your OAuth 2.0 Client ID\n";
echo "  4. Add this URL to 'Authorized redirect URIs'\n";
