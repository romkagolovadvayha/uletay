<?php
declare(strict_types=1);
require __DIR__ . '/../api/lib/bootstrap.php';
api_admin_session_start();
if (api_admin_is_logged_in()) {
    header('Location: ' . api_path('/admin/'));
} else {
    header('Location: ' . api_path('/admin/login.php'));
}
exit;
