# УЛЕТАЙ 2026

Мобильное и web-приложение фестиваля на **Expo / React Native** с **Next.js** API и админ-панелью.

## Локальная разработка 

```bash
npm install
cp cms/.env.example cms/.env
npm run cms:install   # MySQL + сид (нужен XAMPP/MySQL)

# в двух терминалах:
npm run cms:dev       # API + админка → http://localhost:3000
npm run web           # приложение → http://localhost:8081
```

В `.env` приложения: `EXPO_PUBLIC_API_URL=http://localhost:3000/api`

| Сервис | URL |
|--------|-----|
| API | `http://localhost:3000/api/data` |
| Админка | `http://localhost:3000/admin` |

Подробнее: [API_SETUP.md](API_SETUP.md)

---

## Развёртывание на Timeweb VPS

Пошаговая инструкция для VPS на Timeweb (Ubuntu). После настройки каждый push в `master` автоматически выкатывает обновления через GitHub Actions.

### 1. Создайте VPS в Timeweb

1. [Панель Timeweb](https://timeweb.cloud/) → **Облачные серверы** → **Создать сервер**
2. ОС: **Ubuntu 22.04** или **24.04**
3. Тариф: от 1 vCPU / 2 GB RAM (Next.js + MySQL)
4. Запишите **IP-адрес** и подключите SSH-ключ

### 2. Привяжите домен

1. **Домены** → ваш домен → **DNS**
2. A-запись: `@` → IP VPS
3. Подождите 5–30 минут

### 3. Подключитесь по SSH

```bash
ssh root@ВАШ_IP
```

Создайте пользователя для деплоя:

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 4. Установите ПО на сервере

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx mysql-server rsync git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

sudo mkdir -p /var/www/uletay
sudo chown -R $USER:www-data /var/www/uletay
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

### 6. Права для автодеплоя

```bash
sudo visudo
```

```
deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx, /usr/bin/certbot
```

### 7. SSH-ключ для GitHub Actions

```bash
ssh-keygen -t ed25519 -C "github-deploy-uletay" -f ~/.ssh/uletay_deploy
ssh-copy-id -i ~/.ssh/uletay_deploy.pub deploy@ВАШ_IP
```

Приватный ключ → GitHub Secret `SSH_PRIVATE_KEY`.

### 8. GitHub Environment `production`

Репозиторий: **https://github.com/romkagolovadvayha/uletay**

**Settings → Environments → `production`**

Каждый параметр можно добавить в **Variables** или **Secrets** (сначала берётся Variables, если пусто — Secrets).

| Имя | Пример | Обязательный |
|-----|--------|--------------|
| `DOMAIN` | `uletay.ru` | да |
| `LE_EMAIL` | `you@mail.ru` | да |
| `SSH_HOST` | IP VPS (`185.x.x.x`) | да |
| `SSH_USER` | `root` | да |
| `SSH_PRIVATE_KEY` | приватный ключ | да — **только Secrets** |
| `DB_HOST` | `127.0.0.1` | да |
| `DB_NAME` | `uletay` | да |
| `DB_USER` | `uletay` | да |
| `DB_PASS` | пароль MySQL | да |
| `ADMIN_PASSWORD` | пароль админки | да |
| `DEPLOY_PATH` | `/var/www/uletay` | нет |
| `SSH_PORT` | `22` | нет |
| `CMS_PORT` | `3000` | нет |
| `ADMIN_USER` | `admin` | нет |
| `SESSION_SECRET` | случайная строка | нет |

### 9. Первый деплой

Push в `master` или **Actions → Deploy → Run workflow**.

Что произойдёт:

1. Сборка Expo web → `dist/`
2. Загрузка на VPS
3. Сборка Next.js CMS, установка БД
4. PM2 запускает CMS
5. nginx + **автоматический HTTPS** (certbot)

### 10. Проверка

| Сервис | URL |
|--------|-----|
| Приложение | `https://ВАШ_ДОМЕН/` |
| API | `https://ВАШ_ДОМЕН/api/data` |
| Админка | `https://ВАШ_ДОМЕН/admin` |

### 11. Обновления

Push в `master` → автодеплой. Загруженные картинки (`uploads/`) и правки в админке **не затираются** — при деплое обновляется только схема БД, без повторного сида.

### Возможные проблемы

**Certbot** — A-запись на IP VPS, порт 80 открыт в firewall Timeweb.

**502 Bad Gateway** — `pm2 status`, проверьте логи: `pm2 logs uletay-cms`.

**MySQL** — `sudo systemctl status mysql`, проверьте `DB_*` secrets.

**SSH** — откройте порт 22 в firewall Timeweb.

---

## Структура проекта

| Путь | Назначение |
|------|------------|
| `src/` | Expo / React Native приложение |
| `cms/` | Next.js API + админка |
| `deploy/` | nginx, PM2, скрипты деплоя |
| `.github/workflows/deploy.yml` | GitHub Actions |

## Скрипты

```bash
npm run web           # dev-сервер приложения
npm run cms:dev       # API + админка (Next.js)
npm run build         # production-сборка web
npm run cms:build     # сборка CMS
npm run cms:install   # установка БД
npm run seed:api      # экспорт сида
npm run typecheck     # TypeScript
npm run lint          # ESLint
```

## Репозиторий

```bash
git clone git@github.com:romkagolovadvayha/uletay.git
cd uletay
npm install
npm install --prefix cms
```

CI/CD: [deploy/README.md](deploy/README.md)
