<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // No Inertia or web-UI middleware — API-only backend.
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Always respond with JSON.
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => true);

        // 404 — route or model not found
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            return response()->json(['message' => 'Not found.'], 404);
        });
    })->create();

