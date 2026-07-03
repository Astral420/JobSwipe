<?php

$defaultFrontendWebOrigins = env('APP_ENV') === 'local'
    ? 'http://localhost:3000,http://127.0.0.1:3000'
    : env('FRONTEND_WEB_URL', 'http://localhost:3000');

$frontendWebOrigins = array_filter(array_map(
    'trim',
    explode(',', env('FRONTEND_WEB_URLS', $defaultFrontendWebOrigins))
));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_unique(array_filter([
        ...$frontendWebOrigins,
        env('FRONTEND_MOBILE_URL', 'http://localhost:8080'),
    ]))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Authorization', 'Accept', 'Idempotency-Key'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => true,
];
