<?php
declare(strict_types=1);

/**
 * Копируется на сервер при деплое из GitHub Actions.
 * Локально можно создать api/config.deploy.php по этому образцу.
 */
return [
    'db_host' => '127.0.0.1',
    'db_name' => 'uletay',
    'db_user' => 'uletay',
    'db_pass' => 'change-me',
    'admin_username' => 'admin',
    'admin_password' => 'change-me',
    'base_path' => '',
    'cors_origin' => '*',
];
