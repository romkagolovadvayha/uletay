<?php
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';
api_cors();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $data = api_get_app_data();
        api_json_response($data);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        api_require_admin_token();
        $body = api_read_json_body();
        if (!isset($body['festival'], $body['stages'], $body['schedule'], $body['autographs'], $body['foodcourt'])) {
            api_json_response(['error' => 'Invalid payload'], 400);
        }
        api_save_app_data($body);
        api_json_response(['ok' => true]);
    }

    api_json_response(['error' => 'Method not allowed'], 405);
} catch (Throwable $e) {
    api_json_response(['error' => $e->getMessage()], 500);
}
