<?php
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';

header('Content-Type: text/plain; charset=utf-8');

$config = api_config();

try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;charset=%s', $config['db_host'], $config['db_charset']),
        $config['db_user'],
        $config['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
    );

    $schema = file_get_contents(__DIR__ . '/schema.sql');
    if ($schema === false) {
        throw new RuntimeException('schema.sql not found');
    }

    foreach (array_filter(array_map('trim', explode(';', $schema))) as $statement) {
        if ($statement !== '') {
            $pdo->exec($statement);
        }
    }

    $pdo = api_pdo();

    $seedPath = __DIR__ . '/seed/content.json';
    if (!file_exists($seedPath)) {
        throw new RuntimeException('Missing api/seed/content.json. Run: npx tsx scripts/export-seed.ts');
    }

    $content = file_get_contents($seedPath);
    if ($content === false) {
        throw new RuntimeException('Cannot read seed file');
    }

    $stmt = $pdo->prepare('INSERT INTO app_content (id, content) VALUES (1, :content)
        ON DUPLICATE KEY UPDATE content = VALUES(content), updated_at = NOW()');
    $stmt->execute(['content' => $content]);

    $passwordHash = password_hash($config['admin_password'], PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO admin_users (username, password_hash) VALUES (:username, :password_hash)
        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)');
    $stmt->execute([
        'username' => $config['admin_username'],
        'password_hash' => $passwordHash,
    ]);

    $uploadDir = $config['upload_dir'];
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir . '/images', 0775, true);
    }

    echo "OK\n";
    echo "Database: {$config['db_name']}\n";
    echo "Admin: {$config['admin_username']} / {$config['admin_password']}\n";
    $base = api_base_path();
    echo "API: {$base}/api/data.php\n";
    echo "Admin panel: {$base}/admin/\n";
} catch (Throwable $e) {
    http_response_code(500);
    echo 'Install failed: ' . $e->getMessage();
}
