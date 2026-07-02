<?php
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';
api_cors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['error' => 'Method not allowed'], 405);
}

$body = api_read_json_body();
$username = trim((string) ($body['username'] ?? ''));
$password = (string) ($body['password'] ?? '');

if ($username === '' || $password === '') {
    api_json_response(['error' => 'Username and password required'], 400);
}

try {
    $token = api_admin_login($username, $password);
    if ($token === null) {
        api_json_response(['error' => 'Invalid credentials'], 401);
    }
    api_json_response(['token' => $token]);
} catch (Throwable $e) {
    api_json_response(['error' => $e->getMessage()], 500);
}
