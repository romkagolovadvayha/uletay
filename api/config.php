<?php
declare(strict_types=1);

$defaults = [
    'db_host' => '127.0.0.1',
    'db_name' => 'uletay',
    'db_user' => 'root',
    'db_pass' => '',
    'db_charset' => 'utf8mb4',
    'admin_username' => 'admin',
    'admin_password' => 'uletay2026',
    'upload_dir' => __DIR__ . '/uploads',
    'base_path' => '/uletay',
    'upload_url' => '/uletay/api/uploads',
    'session_name' => 'uletay_admin',
    'cors_origin' => '*',
];

$envOverrides = [
    'db_host' => getenv('ULETAY_DB_HOST') ?: null,
    'db_name' => getenv('ULETAY_DB_NAME') ?: null,
    'db_user' => getenv('ULETAY_DB_USER') ?: null,
    'db_pass' => getenv('ULETAY_DB_PASS') !== false ? getenv('ULETAY_DB_PASS') : null,
    'admin_username' => getenv('ULETAY_ADMIN_USER') ?: null,
    'admin_password' => getenv('ULETAY_ADMIN_PASSWORD') ?: null,
    'base_path' => getenv('ULETAY_BASE_PATH') !== false ? getenv('ULETAY_BASE_PATH') : null,
    'cors_origin' => getenv('ULETAY_CORS_ORIGIN') ?: null,
];

$config = $defaults;
foreach ($envOverrides as $key => $value) {
    if ($value !== null && $value !== '') {
        $config[$key] = $value;
    }
}

$deployConfigPath = __DIR__ . '/config.deploy.php';
if (file_exists($deployConfigPath)) {
    $deployConfig = require $deployConfigPath;
    if (is_array($deployConfig)) {
        $config = array_merge($config, $deployConfig);
    }
}

$basePath = rtrim((string) $config['base_path'], '/');
$config['upload_url'] = $basePath . '/api/uploads';

return $config;
