<?php
declare(strict_types=1);
require __DIR__ . '/../api/lib/bootstrap.php';
api_admin_require_web();

$tab = $_GET['tab'] ?? 'festival';
$message = '';
$error = '';

try {
    $data = api_get_app_data();
} catch (Throwable $e) {
    $error = $e->getMessage();
    $data = [
        'festival' => [],
        'stages' => [],
        'schedule' => [],
        'autographs' => [],
        'foodcourt' => [],
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $action = $_POST['action'] ?? 'save_json';

        if ($action === 'upload') {
            $target = $_POST['target'] ?? '';
            $id = $_POST['id'] ?? '';
            $url = isset($_FILES['file']) ? api_upload_file($_FILES['file'], 'images') : null;
            if (!$url) {
                throw new RuntimeException('Не удалось загрузить файл');
            }

            if ($target === 'festival_hero') {
                $data['festival']['heroImageUrl'] = $url;
            } elseif ($target === 'schedule' && $id !== '') {
                foreach ($data['schedule'] as &$item) {
                    if ($item['id'] === $id) {
                        $item['imageUrl'] = $url;
                    }
                }
                unset($item);
            } elseif ($target === 'autograph' && $id !== '') {
                foreach ($data['autographs'] as &$item) {
                    if ($item['id'] === $id) {
                        $item['imageUrl'] = $url;
                    }
                }
                unset($item);
            } elseif ($target === 'foodcourt' && $id !== '') {
                foreach ($data['foodcourt'] as &$item) {
                    if ($item['id'] === $id) {
                        $item['imageUrl'] = $url;
                    }
                }
                unset($item);
            }

            api_save_app_data($data);
            $message = 'Изображение загружено';
        } else {
            if ($tab === 'festival') {
                $data['festival'] = array_merge($data['festival'], [
                    'name' => trim((string) ($_POST['name'] ?? '')),
                    'year' => (int) ($_POST['year'] ?? 2026),
                    'startDate' => trim((string) ($_POST['startDate'] ?? '')),
                    'endDate' => trim((string) ($_POST['endDate'] ?? '')),
                    'location' => trim((string) ($_POST['location'] ?? '')),
                    'locationShort' => trim((string) ($_POST['locationShort'] ?? '')),
                    'ageRating' => trim((string) ($_POST['ageRating'] ?? '')),
                    'heroImageUrl' => trim((string) ($_POST['heroImageUrl'] ?? '')) ?: null,
                ]);
            } elseif ($tab === 'stages') {
                $ids = $_POST['stage_id'] ?? [];
                $names = $_POST['stage_name'] ?? [];
                $shorts = $_POST['stage_short'] ?? [];
                $colors = $_POST['stage_color'] ?? [];
                $stages = [];
                foreach ($ids as $i => $id) {
                    $stages[] = [
                        'id' => trim((string) $id),
                        'name' => trim((string) ($names[$i] ?? '')),
                        'shortName' => trim((string) ($shorts[$i] ?? '')),
                        'color' => trim((string) ($colors[$i] ?? '#FFFFFF')),
                    ];
                }
                $data['stages'] = $stages;
            } else {
                $json = trim((string) ($_POST['json'] ?? ''));
                $decoded = json_decode($json, true);
                if (!is_array($decoded)) {
                    throw new RuntimeException('Некорректный JSON');
                }
                if ($tab === 'schedule') {
                    $data['schedule'] = $decoded;
                } elseif ($tab === 'autographs') {
                    $data['autographs'] = $decoded;
                } elseif ($tab === 'foodcourt') {
                    $data['foodcourt'] = $decoded;
                }
            }

            api_save_app_data($data);
            $message = 'Сохранено';
        }
    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

$tabs = [
    'festival' => 'Фестиваль',
    'stages' => 'Сцены',
    'schedule' => 'Расписание',
    'autographs' => 'Автографы',
    'foodcourt' => 'Фудкорт',
];
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>УЛЕТАЙ — админка</title>
  <link rel="stylesheet" href="<?= htmlspecialchars(api_path('/admin/assets/admin.css'), ENT_QUOTES) ?>" />
</head>
<body>
  <header class="topbar">
    <h1>УЛЕТАЙ — админка</h1>
    <a href="<?= htmlspecialchars(api_path('/admin/logout.php'), ENT_QUOTES) ?>">Выйти</a>
  </header>

  <nav class="tabs">
    <?php foreach ($tabs as $key => $label): ?>
      <a class="<?= $tab === $key ? 'active' : '' ?>" href="?tab=<?= h($key) ?>"><?= h($label) ?></a>
    <?php endforeach; ?>
  </nav>

  <main class="container">
    <?php if ($message): ?><p class="ok"><?= h($message) ?></p><?php endif; ?>
    <?php if ($error): ?><p class="error"><?= h($error) ?></p><?php endif; ?>

    <?php if ($tab === 'festival'): ?>
      <form method="post" class="panel">
        <input type="hidden" name="action" value="save" />
        <div class="grid">
          <label>Название<input name="name" value="<?= h((string) ($data['festival']['name'] ?? '')) ?>" /></label>
          <label>Год<input name="year" type="number" value="<?= h((string) ($data['festival']['year'] ?? '')) ?>" /></label>
          <label>Начало<input name="startDate" value="<?= h((string) ($data['festival']['startDate'] ?? '')) ?>" /></label>
          <label>Конец<input name="endDate" value="<?= h((string) ($data['festival']['endDate'] ?? '')) ?>" /></label>
          <label>Локация<input name="location" value="<?= h((string) ($data['festival']['location'] ?? '')) ?>" /></label>
          <label>Локация (коротко)<input name="locationShort" value="<?= h((string) ($data['festival']['locationShort'] ?? '')) ?>" /></label>
          <label>Возраст<input name="ageRating" value="<?= h((string) ($data['festival']['ageRating'] ?? '')) ?>" /></label>
          <label>Hero image URL<input name="heroImageUrl" value="<?= h((string) ($data['festival']['heroImageUrl'] ?? '')) ?>" /></label>
        </div>
        <?php if (!empty($data['festival']['heroImageUrl'])): ?>
          <img class="preview" src="<?= h((string) $data['festival']['heroImageUrl']) ?>" alt="hero" />
        <?php endif; ?>
        <button type="submit">Сохранить фестиваль</button>
      </form>
      <form method="post" enctype="multipart/form-data" class="panel">
        <input type="hidden" name="action" value="upload" />
        <input type="hidden" name="target" value="festival_hero" />
        <label>Загрузить hero-картинку<input type="file" name="file" accept="image/*" required /></label>
        <button type="submit">Загрузить</button>
      </form>
    <?php elseif ($tab === 'stages'): ?>
      <form method="post" class="panel">
        <input type="hidden" name="action" value="save" />
        <?php foreach ($data['stages'] as $stage): ?>
          <div class="stage-row">
            <input type="hidden" name="stage_id[]" value="<?= h((string) $stage['id']) ?>" />
            <label>ID<input value="<?= h((string) $stage['id']) ?>" disabled /></label>
            <label>Название<input name="stage_name[]" value="<?= h((string) $stage['name']) ?>" /></label>
            <label>Короткое<input name="stage_short[]" value="<?= h((string) $stage['shortName']) ?>" /></label>
            <label>Цвет<input name="stage_color[]" type="color" value="<?= h((string) ($stage['color'] ?? '#FFFFFF')) ?>" /></label>
          </div>
        <?php endforeach; ?>
        <button type="submit">Сохранить сцены</button>
      </form>
    <?php else: ?>
      <?php
        $jsonKey = $tab;
        $jsonValue = json_encode($data[$jsonKey] ?? [], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
      ?>
      <form method="post" class="panel">
        <input type="hidden" name="action" value="save" />
        <p class="hint">JSON-массив. Для картинок исполнителей добавьте поле <code>imageUrl</code>.</p>
        <textarea name="json" rows="24"><?= h((string) $jsonValue) ?></textarea>
        <button type="submit">Сохранить <?= h($tabs[$tab] ?? '') ?></button>
      </form>
      <section class="panel">
        <h2>Загрузка картинки</h2>
        <form method="post" enctype="multipart/form-data">
          <input type="hidden" name="action" value="upload" />
          <input type="hidden" name="target" value="<?= h($tab === 'schedule' ? 'schedule' : ($tab === 'autographs' ? 'autograph' : 'foodcourt')) ?>" />
          <label>ID записи<input name="id" required placeholder="например south-2026-07-08-15:00-NADИ" /></label>
          <label>Файл<input type="file" name="file" accept="image/*" required /></label>
          <button type="submit">Загрузить картинку</button>
        </form>
      </section>
    <?php endif; ?>
  </main>
</body>
</html>
