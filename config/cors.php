<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS)
    |--------------------------------------------------------------------------
    | Configure which origins, methods, and headers the React frontend is
    | allowed to use when calling this API.  Update FRONTEND_URL in .env
    | for your production domain.
    |
    | 'allowed_origins' accepts exact origins or wildcard patterns, e.g.:
    |   'http://localhost:5173'  ← Vite dev server
    |   'https://your-app.com'  ← production
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:5173'),
        'http://localhost:3000',
        'http://localhost:8080',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    /*
    | Set to true only when using cookie/session-based Sanctum (SPA mode).
    | For token-based auth (Authorization: Bearer …) keep this false.
    */
    'supports_credentials' => false,

];
