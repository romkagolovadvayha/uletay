<?php
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';
api_cors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['error' => 'Method not allowed'], 405);
}

api_require_admin_token();

if (!isset($_FILES['file'])) {
    api_json_response(['error' => 'File required'], 400);
}

$subdir = preg_replace('/[^a-z0-9_-]/i', '', (string) ($_POST['subdir'] ?? 'images')) ?: 'images';
$url = api_upload_file($_FILES['file'], $subdir);

if ($url === null) {
    api_json_response(['error' => 'Upload failed'], 400);
}

api_json_response(['url' => $url]);
