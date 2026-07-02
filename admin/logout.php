<?php
declare(strict_types=1);
require __DIR__ . '/../api/lib/bootstrap.php';
api_admin_session_start();
session_destroy();
header('Location: ' . api_path('/admin/login.php'));
exit;
