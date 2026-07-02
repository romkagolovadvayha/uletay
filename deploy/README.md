# Деплой на VPS (GitHub Actions)

Автодеплой при push в `main` / `master`. Переменные и секреты берутся из GitHub Environment **`production`**.

## 1. GitHub Environment

**Settings → Environments → New environment → `production`**

### Variables

| Имя | Пример | Описание |
|-----|--------|----------|
| `DOMAIN` | `uletay.example.com` | Домен сайта (HTTPS выдаётся автоматически) |
| `LE_EMAIL` | `admin@example.com` | Email для Let's Encrypt |
| `DEPLOY_PATH` | `/var/www/uletay` | Путь на сервере (опционально) |
| `SSH_PORT` | `22` | SSH-порт (опционально) |
| `PHP_FPM_SOCKET` | `/run/php/php8.2-fpm.sock` | Сокет PHP-FPM (опционально) |
| `ADMIN_USER` | `admin` | Логин админки (опционально) |

### Secrets

| Имя | Описание |
|-----|----------|
| `SSH_HOST` | IP или hostname сервера |
| `SSH_USER` | SSH-пользователь |
| `SSH_PRIVATE_KEY` | Приватный ключ (полностью, с `-----BEGIN...`) |
| `DB_HOST` | MySQL host (обычно `127.0.0.1`) |
| `DB_NAME` | Имя БД |
| `DB_USER` | Пользователь MySQL |
| `DB_PASS` | Пароль MySQL |
| `ADMIN_PASSWORD` | Пароль админ-панели |

## 2. Подготовка сервера (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx php-fpm php-mysql php-mbstring php-xml mysql-server rsync

# Пользователь deploy с sudo только для nginx/certbot (рекомендуется настроить sudoers)
sudo mkdir -p /var/www/uletay
sudo chown -R $USER:www-data /var/www/uletay
```

Создайте БД и пользователя MySQL:

```sql
CREATE DATABASE uletay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'uletay'@'localhost' IDENTIFIED BY 'strong-password';
GRANT ALL ON uletay.* TO 'uletay'@'localhost';
FLUSH PRIVILEGES;
```

Пользователь SSH должен иметь право:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot ...
```

## 3. Что делает деплой

1. `npm ci` + `npm run build` с `EXPO_PUBLIC_API_URL=https://DOMAIN/api`
2. `rsync` файлов на сервер (`dist/`, `api/`, `admin/`, `deploy/`)
3. Генерация `api/config.deploy.php` на сервере
4. `php api/install.php` (схема БД + сид)
5. Nginx-конфиг из `deploy/nginx.site.conf.template`
6. **Certbot**: если сертификата нет — выпускает HTTPS и редирект с HTTP

## 4. URL после деплоя

| Сервис | URL |
|--------|-----|
| Приложение | `https://DOMAIN/` |
| API | `https://DOMAIN/api/data.php` |
| Админка | `https://DOMAIN/admin/` |

## 5. Локальная разработка

Локально по-прежнему `/uletay/` (см. `api/config.php`). На продакшене `base_path` пустой — приложение в корне домена.

## 6. Ручной запуск

**Actions → Deploy → Run workflow**
