# API и админка (Next.js)

CMS на **Next.js** в папке `cms/`: REST API + web-админка.

## Локальный запуск

```bash
# 1. MySQL (XAMPP) + сид
cp cms/.env.example cms/.env   # при необходимости отредактируйте
npm run cms:install

# 2. CMS (API + админка)
npm run cms:dev
```

| Сервис | URL |
|--------|-----|
| API | `http://localhost:3000/api/data` |
| Админка | `http://localhost:3000/admin` |
| Логин по умолчанию | `admin` / `uletay2026` |

## Expo-приложение

```bash
# .env
EXPO_PUBLIC_API_URL=http://localhost:3000/api

npm run web
```

## API

### `GET /api/data`

Публичный endpoint. Возвращает полный JSON `AppData`.

### `PUT /api/data`

Требует заголовок `Authorization: Bearer <token>`.

### `POST /api/auth`

```json
{ "username": "admin", "password": "..." }
```

Ответ: `{ "token": "..." }` (7 дней).

### `POST /api/upload`

`multipart/form-data`: `file`, опционально `subdir`.

Ответ: `{ "url": "/api/uploads/images/..." }`.

### `GET /api/uploads/...`

Отдача загруженных файлов.

## Переменные окружения (`cms/.env`)

| Переменная | Описание |
|------------|----------|
| `DB_HOST` | MySQL host |
| `DB_NAME` | Имя БД |
| `DB_USER` | Пользователь |
| `DB_PASS` | Пароль |
| `ADMIN_USER` | Логин админки |
| `ADMIN_PASSWORD` | Пароль админки |
| `SESSION_SECRET` | Секрет сессии (32+ символов) |
| `CORS_ORIGIN` | CORS (`*` локально) |
| `UPLOAD_DIR` | Папка загрузок (`../uploads` локально) |
| `PORT` | Порт (3000) |

## Сид

```bash
npm run seed:api      # экспорт в cms/seed/content.json
npm run cms:install   # применить схему + сид в MySQL
```

## Деплой

См. [README.md](README.md) и [deploy/README.md](deploy/README.md).
