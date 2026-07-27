# Деплой на VPS (GitHub Actions)

Автодеплой при push в `master`. Переменные и секреты — из GitHub Environment **`production`**.

Стек на сервере: **nginx** (Expo web + reverse proxy) + **Next.js CMS** (PM2) + **MySQL**.

## 1. GitHub Environment

**Settings → Environments → `production`**

Несекретные параметры задаются в **Variables**, пароли и ключи — в **Secrets**.

### Обязательные

| Имя | Пример | Описание |
|-----|--------|----------|
| `DOMAIN` | `uletayapp.ru` | Основное зеркало **без www** |
| `LE_EMAIL` | `you@mail.ru` | Email для Let's Encrypt |
| `SSH_HOST` | `185.x.x.x` | IP VPS |
| `SSH_USER` | `root` | SSH-пользователь |
| `SSH_PRIVATE_KEY_B64` | `base64 -w0 uletay_deploy` | **Secret**, приватный ключ без passphrase |
| `SSH_KNOWN_HOSTS` | результат `ssh-keyscan` | **Secret**, закреплённый host key сервера |
| `DB_HOST` | `127.0.0.1` | MySQL host |
| `DB_NAME` | `uletay` | Имя БД |
| `DB_USER` | `uletay` | Пользователь MySQL |
| `DB_PASS` | `***` | **Secret**, пароль MySQL |
| `ADMIN_PASSWORD` | `***` | **Secret**, пароль админки |
| `SESSION_SECRET` | случайная строка 32+ символа | **Secret**, постоянный секрет сессии CMS |
| `EXPO_PUBLIC_YANDEX_MAPS_API_KEY` | UUID ключа | Публичный ключ JS API Яндекс Карт |

### Опциональные (есть значения по умолчанию)

| Имя | По умолчанию | Описание |
|-----|--------------|----------|
| `DEPLOY_PATH` | `/var/www/uletay` | Путь на сервере |
| `SSH_PORT` | `22` | SSH-порт |
| `CMS_PORT` | `3000` | Порт Next.js CMS |
| `ADMIN_USER` | `admin` | Логин админки |
| `LASTFM_API_KEY` | пусто | **Secret**, нужен scheduled sync |
| `LASTFM_PROXY_URL` | пусто | **Secret**, если URL содержит логин/пароль |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | генерируются один раз | Web Push; private key — **Secret** |
| `VAPID_SUBJECT` | `mailto:admin@DOMAIN` | Контакт Web Push |
| `EXPO_PUSH_ACCESS_TOKEN` | пусто | **Secret**, если включена enhanced push security |

> `DB_PASS`, `ADMIN_PASSWORD`, `SESSION_SECRET`, SSH-ключ, Last.fm/proxy,
> VAPID private key и push token хранятся **только в Secrets**. Workflow намеренно
> не читает эти значения из Variables.

> Альтернатива `SSH_PRIVATE_KEY_B64` — Secret `SSH_PRIVATE_KEY` с полным
> приватным ключом. Ключ с passphrase в неинтерактивном CI не поддерживается.

**Рекомендуется `SSH_PRIVATE_KEY_B64`** — на сервере:
```bash
# проверка ключа
ssh-keygen -y -f ~/.ssh/uletay_deploy

# публичный ключ в authorized_keys
grep -qxF "$(cat ~/.ssh/uletay_deploy.pub)" ~/.ssh/authorized_keys || cat ~/.ssh/uletay_deploy.pub >> ~/.ssh/authorized_keys

# одна строка для GitHub Secret SSH_PRIVATE_KEY_B64
base64 -w0 ~/.ssh/uletay_deploy && echo
```
Скопируй вывод в Secret `SSH_PRIVATE_KEY_B64`.

Закрепи host key сервера отдельным Secret `SSH_KNOWN_HOSTS` (сверь fingerprint
по независимому каналу, прежде чем сохранять):

```bash
ssh-keyscan -H -p 22 ВАШ_IP
```

## SSH: Permission denied (publickey)

1. На сервере проверь ключ:
   ```bash
   cat /root/.ssh/authorized_keys
   ```
2. На компьютере сравни публичный ключ:
   ```bash
   ssh-keygen -y -f ~/.ssh/uletay_deploy
   ```
   Вывод должен совпадать со строкой в `authorized_keys`.
3. Проверь вход вручную:
   ```bash
   ssh -i ~/.ssh/uletay_deploy root@212.193.26.91
   ```
4. В GitHub → Secrets вставь **весь** приватный ключ:
   ```
   -----BEGIN OPENSSH PRIVATE KEY-----
   ...
   -----END OPENSSH PRIVATE KEY-----
   ```
5. `SSH_USER` должен совпадать с пользователем на сервере (`root`).

Если ключа на сервере нет — добавь:
```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "содержимое .pub файла" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## 2. Подготовка сервера

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx mysql-server rsync cron logrotate
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

sudo mkdir -p /var/www/uletay
sudo chown -R $USER:www-data /var/www/uletay
```

MySQL:

```sql
CREATE DATABASE uletay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'uletay'@'localhost' IDENTIFIED BY 'strong-password';
GRANT ALL ON uletay.* TO 'uletay'@'localhost';
FLUSH PRIVILEGES;
```

Серверные скрипты управляют nginx, certbot и `/etc/cron.d`, поэтому текущий
workflow запускается отдельным deployment-ключом пользователя `root`.

## 3. Что делает деплой

1. Expo dependency check, TypeScript, lint, web/PWA/SEO и CMS production build
2. `rsync` только runtime-каталогов (`dist`, `assets`, `cms`, `deploy`) на VPS
3. На сервере: безопасное обновление `cms/.env` и `npm ci`
4. `npm run db:migrate` — только схема БД (`CREATE TABLE IF NOT EXISTS`). **Контент, imageUrl и uploads не трогаются.**
5. PM2 запускает Next.js standalone
6. nginx: `/` → `dist/`, `/api`, `/admin`, `/_next` → CMS
7. Let's Encrypt: `certbot certonly --webroot` для `DOMAIN` и `www.DOMAIN`, затем nginx SSL-шаблон + редирект HTTP→HTTPS и **www → без www (301)**

Файлы nginx: `deploy/nginx.site.http.conf.template` (временно), `deploy/nginx.site.ssl.conf.template` (прод).

**Первый деплой на пустой сервер** — один раз вручную на VPS:

```bash
cd /var/www/uletay/cms && npm run db:install
```

После этого обычные деплои **не перезаписывают** контент в MySQL, загруженные картинки в `uploads/` и правки в админке.

`REPO_ASSETS_DIR` и `UPLOAD_DIR` в `cms/.env` на сервере указывают абсолютные пути — картинки фудкорта из `/api/fest-assets/...` и `/api/uploads/...` не «теряются» после деплоя.

**Повторный `db:install`** тоже не затирает контент: сид применяется только если таблица `app_content` пуста.

**Добавить новые точки фудкорта из репозитория** (без затирания загруженных картинок и правок в админке) — вручную на VPS:

```bash
cd /var/www/uletay/cms && npm run foodcourt:sync-db
```

Полная замена фудкорта сидами — только осознанно: `npm run foodcourt:reset-db`.

**Применить правки расписания автограф-сессий** (добавляет недостающие, исправляет известные ошибки, переносит `imageUrl` со старых записей на новые, остальное в админке не трогает) — вручную на VPS после деплоя:

```bash
cd /var/www/uletay/cms
npm run autographs:patch-db:dry   # посмотреть, что изменится
npm run autographs:patch-db
```

**Применить правки расписания выступлений** (то же: точечные изменения, перенос `imageUrl`, остальное не трогает):

```bash
cd /var/www/uletay/cms
npm run schedule:patch-db:dry
npm run schedule:patch-db
```

**Восстановить картинки артистов с uletayfest.ru** (только где имя файла на сайте узнаваемо):

```bash
cd /var/www/uletay/cms
npm run import:fest-images
```

По умолчанию заполняет только пустые `imageUrl`, уже загруженные в админке не трогает.
Флаги: `--dry-run`, `--force`, `--external` (ссылки на tildacdn без скачивания).

## HTTPS не работает / нет редиректа

На сервере:

```bash
export DOMAIN=uletayapp.ru
export LE_EMAIL=you@mail.ru
export DEPLOY_PATH=/var/www/uletay
bash /var/www/uletay/deploy/fix-https.sh
```

Или вручную:

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d uletayapp.ru \
  --non-interactive --agree-tos -m you@mail.ru
bash /var/www/uletay/deploy/fix-https.sh
```

Проверка:

```bash
curl -I http://uletayapp.ru    # должен быть 301 → https
curl -I https://uletayapp.ru   # 200
sudo ss -tlnp | grep ':443'    # nginx слушает 443
```

Убедитесь, что DNS **A**-записи `DOMAIN` и `www.DOMAIN` указывают на IP VPS.

Проверка зеркала:

```bash
curl -I http://www.uletayapp.ru    # 301 → https://uletayapp.ru/...
curl -I https://www.uletayapp.ru   # 301 → https://uletayapp.ru/...
```

В [Яндекс.Вебмастер](https://webmaster.yandex.ru/) и Google Search Console укажите основное зеркало **без www**.

## 4. URL после деплоя

| Сервис | URL |
|--------|-----|
| Приложение | `https://DOMAIN/` |
| API | `https://DOMAIN/api/data` |
| Админка | `https://DOMAIN/admin` |

## 5. Ручной запуск

**Actions → Deploy → Run workflow**
