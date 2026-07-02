# Деплой на VPS (GitHub Actions)

Автодеплой при push в `main` / `master`. Переменные и секреты — из GitHub Environment **`production`**.

Стек на сервере: **nginx** (Expo web + reverse proxy) + **Next.js CMS** (PM2) + **MySQL**.

## 1. GitHub Environment

**Settings → Environments → `production`**

Каждый параметр можно указать в **Variables** или **Secrets** — workflow берёт значение из Variables, если пусто — из Secrets.

### Обязательные

| Имя | Пример | Описание |
|-----|--------|----------|
| `DOMAIN` | `uletay.ru` | Домен |
| `LE_EMAIL` | `you@mail.ru` | Email для Let's Encrypt |
| `SSH_HOST` | `185.x.x.x` | IP VPS |
| `SSH_USER` | `root` | SSH-пользователь |
| `SSH_PRIVATE_KEY` | `-----BEGIN...` | да — **только Secrets**, весь файл |
| `SSH_PRIVATE_KEY_B64` | `base64 -w0 uletay_deploy` | вместо `SSH_PRIVATE_KEY` (надёжнее) |
| `SSH_KEY_PASSPHRASE` | пароль от ключа | только если ключ **с паролем** |
| `DB_HOST` | `127.0.0.1` | MySQL host |
| `DB_NAME` | `uletay` | Имя БД |
| `DB_USER` | `uletay` | Пользователь MySQL |
| `DB_PASS` | `***` | Пароль MySQL |
| `ADMIN_PASSWORD` | `***` | Пароль админки |

### Опциональные (есть значения по умолчанию)

| Имя | По умолчанию | Описание |
|-----|--------------|----------|
| `DEPLOY_PATH` | `/var/www/uletay` | Путь на сервере |
| `SSH_PORT` | `22` | SSH-порт |
| `CMS_PORT` | `3000` | Порт Next.js CMS |
| `ADMIN_USER` | `admin` | Логин админки |
| `SESSION_SECRET` | генерируется на сервере | Секрет сессии CMS |

> Пароли и ключи лучше хранить в **Secrets**, но технически можно и в Variables.

> `SSH_PRIVATE_KEY` — **только в Secrets** (Variables ломают многострочный ключ).

**Рекомендуется `SSH_PRIVATE_KEY_B64`** — на сервере:
```bash
# проверка ключа
ssh-keygen -y -f ~/.ssh/uletay_deploy

# публичный ключ в authorized_keys
grep -qxF "$(cat ~/.ssh/uletay_deploy.pub)" ~/.ssh/authorized_keys || cat ~/.ssh/uletay_deploy.pub >> ~/.ssh/authorized_keys

# одна строка для GitHub Secret SSH_PRIVATE_KEY_B64
base64 -w0 ~/.ssh/uletay_deploy && echo
```
Скопируй вывод в Secret `SSH_PRIVATE_KEY_B64`. Удали `SSH_PRIVATE_KEY` и `SSH_KEY_PASSPHRASE`, если ключ без пароля.

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
sudo apt install -y nginx certbot python3-certbot-nginx mysql-server rsync
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
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

Sudoers (nginx + certbot + pm2):

```
deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx, /usr/bin/certbot
```

## 3. Что делает деплой

1. `npm run build` — Expo web → `dist/`
2. `rsync` на VPS
3. На сервере: `cms/.env`, `npm ci`, `npm run build` в `cms/`
4. `npm run db:migrate` — только схема БД (контент и картинки не трогаются)
5. PM2 запускает Next.js standalone
6. nginx: `/` → `dist/`, `/api`, `/admin`, `/_next` → CMS
7. Let's Encrypt: `certbot certonly --webroot`, затем nginx SSL-шаблон + редирект HTTP→HTTPS

Файлы nginx: `deploy/nginx.site.http.conf.template` (временно), `deploy/nginx.site.ssl.conf.template` (прод).

**Первый деплой на пустой сервер** — один раз вручную на VPS:

```bash
cd /var/www/uletay/cms && npm run db:install
```

После этого обычные деплои не перезаписывают контент и `imageUrl`.

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

Убедитесь, что DNS **A**-запись домена указывает на IP VPS.

## 4. URL после деплоя

| Сервис | URL |
|--------|-----|
| Приложение | `https://DOMAIN/` |
| API | `https://DOMAIN/api/data` |
| Админка | `https://DOMAIN/admin` |

## 5. Ручной запуск

**Actions → Deploy → Run workflow**
