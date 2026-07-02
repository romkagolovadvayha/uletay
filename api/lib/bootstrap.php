<?php
declare(strict_types=1);

function api_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/../config.php';
    }
    return $config;
}

function api_base_path(): string
{
    return rtrim((string) (api_config()['base_path'] ?? ''), '/');
}

function api_path(string $path): string
{
    return api_base_path() . $path;
}

function api_json_response(mixed $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function api_cors(): void
{
    $origin = api_config()['cors_origin'] ?? '*';
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function api_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function api_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = api_config();
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $config['db_host'],
        $config['db_name'],
        $config['db_charset'],
    );

    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function api_get_app_data(): array
{
    $stmt = api_pdo()->query('SELECT content FROM app_content WHERE id = 1 LIMIT 1');
    $row = $stmt->fetch();
    if (!$row) {
        throw new RuntimeException('App content not found. Run /api/install.php');
    }

    $content = json_decode((string) $row['content'], true);
    if (!is_array($content)) {
        throw new RuntimeException('Invalid app content JSON');
    }

    return $content;
}

function api_save_app_data(array $content): void
{
    $json = json_encode($content, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $stmt = api_pdo()->prepare('UPDATE app_content SET content = :content, updated_at = NOW() WHERE id = 1');
    $stmt->execute(['content' => $json]);
}

function api_require_admin_token(): void
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        api_json_response(['error' => 'Unauthorized'], 401);
    }

    $token = trim($matches[1]);
    $stmt = api_pdo()->prepare('SELECT id FROM admin_sessions WHERE token = :token AND expires_at > NOW() LIMIT 1');
    $stmt->execute(['token' => $token]);
    if (!$stmt->fetch()) {
        api_json_response(['error' => 'Invalid token'], 401);
    }
}

function api_create_admin_session(int $userId): string
{
    $token = bin2hex(random_bytes(32));
    $stmt = api_pdo()->prepare(
        'INSERT INTO admin_sessions (user_id, token, expires_at) VALUES (:user_id, :token, DATE_ADD(NOW(), INTERVAL 7 DAY))',
    );
    $stmt->execute(['user_id' => $userId, 'token' => $token]);
    return $token;
}

function api_admin_login(string $username, string $password): ?string
{
    $stmt = api_pdo()->prepare('SELECT id, password_hash FROM admin_users WHERE username = :username LIMIT 1');
    $stmt->execute(['username' => $username]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($password, (string) $user['password_hash'])) {
        return null;
    }
    return api_create_admin_session((int) $user['id']);
}

function api_admin_session_start(): void
{
    $config = api_config();
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_name($config['session_name']);
        session_start();
    }
}

function api_admin_is_logged_in(): bool
{
    api_admin_session_start();
    return !empty($_SESSION['admin_user_id']);
}

function api_admin_require_web(): void
{
    if (!api_admin_is_logged_in()) {
        header('Location: ' . api_path('/admin/login.php'));
        exit;
    }
}

function api_upload_file(array $file, string $subdir = 'images'): ?string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return null;
    }

    $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    $mime = mime_content_type($file['tmp_name']);
    if (!in_array($mime, $allowed, true)) {
        return null;
    }

    $config = api_config();
    $targetDir = rtrim($config['upload_dir'], '/\\') . DIRECTORY_SEPARATOR . $subdir;
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0775, true);
    }

    $ext = pathinfo((string) $file['name'], PATHINFO_EXTENSION) ?: 'jpg';
    $filename = uniqid('img_', true) . '.' . strtolower($ext);
    $targetPath = $targetDir . DIRECTORY_SEPARATOR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        return null;
    }

    return rtrim($config['upload_url'], '/') . '/' . $subdir . '/' . $filename;
}
