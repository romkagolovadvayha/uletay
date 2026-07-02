<?php
declare(strict_types=1);
require __DIR__ . '/../api/lib/bootstrap.php';
api_admin_session_start();

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');
    try {
        $stmt = api_pdo()->prepare('SELECT id, password_hash FROM admin_users WHERE username = :username LIMIT 1');
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch();
        if ($user && password_verify($password, (string) $user['password_hash'])) {
            $_SESSION['admin_user_id'] = (int) $user['id'];
            header('Location: ' . api_path('/admin/'));
            exit;
        }
        $error = 'Неверный логин или пароль';
    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>УЛЕТАЙ — вход</title>
  <link rel="stylesheet" href="<?= htmlspecialchars(api_path('/admin/assets/admin.css'), ENT_QUOTES) ?>" />
</head>
<body class="auth-page">
  <form class="auth-card" method="post">
    <h1>Админ-панель УЛЕТАЙ</h1>
    <?php if ($error): ?><p class="error"><?= htmlspecialchars($error) ?></p><?php endif; ?>
    <label>Логин<input name="username" autocomplete="username" required /></label>
    <label>Пароль<input name="password" type="password" autocomplete="current-password" required /></label>
    <button type="submit">Войти</button>
  </form>
</body>
</html>
