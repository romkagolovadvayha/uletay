# УЛЕТАЙ 2026

Мобильное и web-приложение фестиваля на **Expo / React Native** с PHP API и админ-панелью.

## Локальная разработка

```bash
npm install
npm run web          # http://localhost:8081
npm run api:install  # MySQL + сид (нужен XAMPP/PHP)
```

API и админка локально: `http://localhost/uletay/api/data.php`, `http://localhost/uletay/admin/`  
Подробнее: [API_SETUP.md](API_SETUP.md)

---

## Развёртывание на Timeweb VPS

Ниже — пошаговая инструкция для VPS на Timeweb (Ubuntu). После настройки каждый push в `master` будет автоматически выкатывать обновления через GitHub Actions.

### 1. Создайте VPS в Timeweb

1. [Панель Timeweb](https://timeweb.cloud/) → **Облачные серверы** → **Создать сервер**
2. ОС: **Ubuntu 22.04** или **24.04**
3. Тариф: от 1 vCPU / 1 GB RAM (для приложения + MySQL достаточно)
4. Запишите **IP-адрес** сервера и root-пароль (или подключите SSH-ключ при создании)

### 2. Привяжите домен

1. В Timeweb: **Домены** → ваш домен → **DNS**
2. Добавьте A-запись:
   - **Имя:** `@` (или поддомен, например `app`)
   - **Значение:** IP вашего VPS
3. Дождитесь обновления DNS (обычно 5–30 минут)

### 3. Подключитесь по SSH

```bash
ssh root@ВАШ_IP
```

Рекомендуется создать отдельного пользователя для деплоя:

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Дальше работайте под `deploy` (или оставьте `root`, если так удобнее).

### 4. Установите ПО на сервере

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx \
  php-fpm php-mysql php-mbstring php-xml php-gd \
  mysql-server rsync git

sudo mkdir -p /var/www/uletay
sudo chown -R $USER:www-data /var/www/uletay
```

Проверьте сокет PHP-FPM (понадобится в GitHub):

```bash
ls /run/php/php*-fpm.sock
# обычно: /run/php/php8.3-fpm.sock или php8.2-fpm.sock
```

### 5. Настройте MySQL

```bash
sudo mysql
```

```sql
CREATE DATABASE uletay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'uletay'@'localhost' IDENTIFIED BY 'надёжный-пароль';
GRANT ALL ON uletay.* TO 'uletay'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 6. Права для автодеплоя (nginx + HTTPS)

Пользователь деплоя должен перезагружать nginx и запускать certbot без пароля:

```bash
sudo visudo
```

Добавьте в конец (замените `deploy` на вашего пользователя):

```
deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx, /bin/systemctl restart nginx, /usr/bin/certbot
```

### 7. SSH-ключ для GitHub Actions

На **своём компьютере** (если ключа ещё нет):

```bash
ssh-keygen -t ed25519 -C "github-deploy-uletay" -f ~/.ssh/uletay_deploy
```

Публичный ключ добавьте на VPS:

```bash
ssh-copy-id -i ~/.ssh/uletay_deploy.pub deploy@ВАШ_IP
```

Приватный ключ (`~/.ssh/uletay_deploy`) понадобится в GitHub Secrets.

### 8. Настройте GitHub Environment

Репозиторий: **https://github.com/romkagolovadvayha/uletay**

**Settings → Environments → New environment → `production`**

#### Variables

| Имя | Пример | Описание |
|-----|--------|----------|
| `DOMAIN` | `uletay.ru` | Ваш домен (без `https://`) |
| `LE_EMAIL` | `you@mail.ru` | Email для Let's Encrypt |
| `DEPLOY_PATH` | `/var/www/uletay` | Путь на сервере |
| `SSH_PORT` | `22` | SSH-порт Timeweb |
| `PHP_FPM_SOCKET` | `/run/php/php8.3-fpm.sock` | Сокет из шага 4 |
| `ADMIN_USER` | `admin` | Логин админки |

#### Secrets

| Имя | Значение |
|-----|----------|
| `SSH_HOST` | IP VPS из Timeweb |
| `SSH_USER` | `deploy` (или `root`) |
| `SSH_PRIVATE_KEY` | содержимое `~/.ssh/uletay_deploy` |
| `DB_HOST` | `127.0.0.1` |
| `DB_NAME` | `uletay` |
| `DB_USER` | `uletay` |
| `DB_PASS` | пароль из шага 5 |
| `ADMIN_PASSWORD` | пароль входа в админ-панель |

### 9. Первый деплой

Сделайте push в ветку `master` — workflow **Deploy** запустится автоматически.

Или вручную: **Actions → Deploy → Run workflow**

Что произойдёт:

1. Сборка web-приложения
2. Загрузка файлов на VPS по SSH
3. Создание `api/config.deploy.php` и установка БД
4. Настройка nginx
5. **Автоматический HTTPS** — если сертификата ещё нет, certbot выпустит его и включит редирект с HTTP

### 10. Проверка

| Сервис | URL |
|--------|-----|
| Приложение | `https://ВАШ_ДОМЕН/` |
| API | `https://ВАШ_ДОМЕН/api/data.php` |
| Админка | `https://ВАШ_ДОМЕН/admin/` |

Логин админки: значение `ADMIN_USER` / `ADMIN_PASSWORD` из GitHub Secrets.

### 11. Обновления

Любой push в `master` → автоматический деплой. Загруженные в админке картинки (`api/uploads/`) при деплое **не удаляются**.

### Возможные проблемы на Timeweb

**Certbot не выдаёт сертификат** — проверьте, что A-запись домена указывает на IP VPS и порт 80 открыт в файрволе Timeweb (панель → сеть → правила firewall).

**502 Bad Gateway** — неверный `PHP_FPM_SOCKET` в Variables. Проверьте `ls /run/php/` на сервере.

**Ошибка MySQL при деплое** — проверьте `DB_*` secrets и что MySQL запущен: `sudo systemctl status mysql`.

**SSH connection refused** — в Timeweb откройте порт 22 для вашего IP или для всех (0.0.0.0/0).

---

## Структура проекта

| Путь | Назначение |
|------|------------|
| `src/` | React Native / Expo приложение |
| `api/` | PHP API + MySQL |
| `admin/` | Web-админка контента |
| `deploy/` | Скрипты nginx и автодеплоя |
| `.github/workflows/deploy.yml` | GitHub Actions |

## Скрипты

```bash
npm run web          # dev-сервер
npm run build        # production-сборка web
npm run typecheck    # проверка TypeScript
npm run lint         # ESLint
npm run seed:api     # экспорт сида в api/seed/content.json
npm run api:install  # установка БД локально
```

## Репозиторий

```bash
git clone git@github.com:romkagolovadvayha/uletay.git
cd uletay
npm install
```

Дополнительно по CI/CD: [deploy/README.md](deploy/README.md)
