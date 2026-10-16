# УЛЕТАЙ

Приложение для посетителей фестиваля: программа выступлений, артисты, автограф-сессии, карта территории, фудкорт, избранное, радио и уведомления. Работает в браузере, на Android и iOS. Содержание редактируется в отдельной админке.

## Структура

| Папка | Назначение |
| --- | --- |
| `src/screens` | Экраны приложения |
| `src/components` | Компоненты интерфейса; карта — в `components/map` |
| `src/navigation` | Навигация и ссылки на экраны |
| `src/context`, `src/hooks` | Состояние приложения и поведение экранов |
| `src/api`, `src/config` | Получение данных и настройки интеграций |
| `src/data` | Исходные данные и снимок для работы без сети |
| `src/theme`, `src/utils`, `src/types` | Оформление, вспомогательные функции и типы |
| `cms/src/app/admin` | Админка Next.js: страницы, формы, действия сервера и стили |
| `cms/src/app/api` | HTTP API приложения |
| `cms/src/lib` | БД, контент, авторизация, изображения и push |
| `cms/scripts`, `cms/seed`, `cms/data` | Установка и миграции БД, импорт, исходный контент, справочники |
| `shared` | Общая проверка данных приложения и CMS |
| `assets`, `public` | Изображения, шрифты и статические файлы |
| `scripts`, `plugins`, `patches` | Сборка, проверки и настройка нативных модулей |
| `deploy`, `docs` | Конфигурация сервера и документация поддержки |
| `.forgejo` | Проверки, сборка и выпуск на действующий сервер через Gitlub |

Стек: Expo SDK 57, React Native 0.86, React 19, Next.js 16, MySQL 8 / MariaDB 10.4+. Используйте Node.js **24 LTS**; версия разработки записана в `.nvmrc`. PHP и Apache приложению не нужны. XAMPP можно использовать локально для MySQL.

## Запустить на своём компьютере

1. Установите Node.js и запустите MySQL.
2. Установите зависимости обеих частей:

   ```sh
   npm ci
   npm ci --prefix cms
   ```

3. Скопируйте `.env.example` в `.env.local`, а `cms/.env.example` — в `cms/.env`. На Windows файлы можно скопировать в проводнике.
4. В `cms/.env` заполните подключение к MySQL, `ADMIN_USER`, `ADMIN_PASSWORD` (от 12 символов) и `SESSION_SECRET` (от 32 символов). Готового общего пароля нет. Секрет сессии можно получить командой:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

5. Создайте таблицы, первоначальный контент и учётную запись владельца:

   ```sh
   npm run cms:install
   ```

6. Откройте два терминала:

   ```sh
   npm run cms:dev
   npm run web
   ```

Админка: **http://localhost:3000/admin**. Приложение: **http://localhost:8081**. API: **http://localhost:3000/api/data**. В `.env.local` приложения должен быть `EXPO_PUBLIC_API_URL=http://localhost:3000/api`. Для телефона в одной Wi-Fi сети вместо `localhost` укажите LAN-адрес компьютера.

## Развернуть на новом сервере

Пример для Ubuntu 24.04, домена `example.ru` и папки `/var/www/uletay`. Для сборки на сервере желательно 4 ГБ RAM. Команды настройки системы выполняются администратором сервера. Перед переключением рабочего домена перенесите данные по [инструкции](docs/OPERATIONS.md).

**1. Установите программы.** Создайте A-запись домена на IP сервера. Откройте порты 80 и 443; MySQL и порт CMS оставьте внутри сервера.

```sh
sudo apt update
sudo apt install -y nginx mysql-server git rsync cron logrotate certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

**2. Скопируйте исходники** в `/var/www/uletay` или клонируйте репозиторий. Пользователь, который запускает CMS, должен иметь права записи в `uploads`.

```sh
cd /var/www/uletay
npm ci
npm ci --prefix cms
```

**3. Создайте базу и пользователя** через `sudo mysql`. Подставьте свой пароль:

```sql
CREATE DATABASE uletay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'uletay'@'127.0.0.1' IDENTIFIED BY 'YOUR_DATABASE_PASSWORD';
GRANT ALL PRIVILEGES ON uletay.* TO 'uletay'@'127.0.0.1';
```

**4. Заполните настройки.**

```sh
cp .env.example .env.local
cp cms/.env.example cms/.env
chmod 600 .env.local cms/.env
```

В корневом `.env.local`: `EXPO_PUBLIC_API_URL=https://example.ru/api`, `EXPO_PUBLIC_SITE_URL=https://example.ru`.

В `cms/.env`: `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_NAME=uletay`, `DB_USER=uletay`, ваш `DB_PASS`, логин и пароль владельца, случайный `SESSION_SECRET`, `CORS_ORIGIN=https://example.ru`, `UPLOAD_DIR=/var/www/uletay/uploads`, `REPO_ASSETS_DIR=/var/www/uletay/assets`, `PORT=3000`, `TRUST_PROXY=1`. Не меняйте `SESSION_SECRET` при обычном обновлении. Дополнительные ключи описаны в примере файла; без них соответствующие интеграции недоступны.

**5. Подготовьте данные.** Для нового пустого проекта:

```sh
npm run cms:install
```

Для переноса существующего приложения сначала восстановите MySQL и `uploads`, затем выполните `npm run cms:migrate`. Миграция сохраняет контент и пароли. `cms:install` при повторном запуске обновляет пароль указанного владельца — это не команда обычного обновления.

**6. Соберите и запустите.**

```sh
npm run build:web
npm run cms:build
pm2 start deploy/ecosystem.manual.cjs
pm2 save
pm2 startup
```

Последняя команда напечатает команду для включения автозапуска — выполните её. Перед nginx проверьте `curl -f http://127.0.0.1:3000/api/health`.

**7. Включите сайт и HTTPS.** На выделенном сервере приложения:

```sh
sudo bash deploy/setup-manual-nginx.sh example.ru /var/www/uletay
sudo certbot --nginx -d example.ru
sudo bash deploy/setup-manual-nginx.sh example.ru /var/www/uletay --https
sudo systemctl enable --now nginx mysql cron
```

Если сервер уже обслуживает другие сайты, сначала согласуйте nginx-конфигурацию: скрипт заменяет сайт `uletay` и отключает стандартный `default`.

**8. Проверьте результат.** Откройте `https://example.ru`, `https://example.ru/admin` и `https://example.ru/api/health`. Войдите, сохраните пробную правку, загрузите изображение и проверьте его в приложении. Для напоминаний по избранному подключите cron по [инструкции эксплуатации](docs/OPERATIONS.md). Публикация мобильных сборок выполняется отдельно.

## Админка и вход через VK

Владелец входит по логину и паролю из первоначальной установки. В разделе **«Доступы»** он добавляет числовой VK ID участника команды. Участник входит кнопкой **«Войти через VK ID»**, редактирует контент и отправляет уведомления. Управлять доступами может владелец. Отзыв доступа закрывает все сессии пользователя; повторная выдача требует нового входа.

Для VK укажите в `cms/.env` ID приложения `VK_APP_ID` и адрес `VK_REDIRECT_URI=https://example.ru/admin/auth/vk/callback`. В кабинете VK ID того же приложения добавьте домен и этот точный адрес возврата, сохранив существующие адреса такси. Для localhost нужен отдельный разрешённый адрес. Подробности: [настройка авторизации](docs/AUTH.md).

В верхней панели и на странице входа есть переключатель светлой/тёмной темы. На телефоне разделы открываются кнопкой меню.

## Проверки и передача

Для браузерных помощников доступны WebMCP-инструменты чтения публичного каталога. Обзор сайта — `/llms.txt`, каталог ресурсов — `/ai-catalog.json` и `/.well-known/ai-catalog.json`, описание инструментов — `/webmcp.json`. Эти файлы обновляются при web-сборке. Подробнее: [интеграция и проверка](docs/AI-DISCOVERY.md).

```sh
npm run check          # TypeScript обеих частей и lint
npm test               # Контент, кеш, API, админка, VK и выдача изображений
npm run test:ai        # WebMCP, параметры, актуальность и файлы обнаружения
npm run test:compat    # Контракт выпущенных мобильных клиентов
npm run build:web      # Web и проверки SEO
npm run cms:build      # Production CMS
npm run handover       # Архив исходников без ключей и локальных файлов
```

Архив создаётся в `tmp/handover/uletay-source.tar.gz`. Рабочие `.env`, дамп БД, `uploads`, ключи подписи и доступы к внешним сервисам передаются ответственному сотруднику отдельно защищённым способом. Не передавайте всю рабочую папку: в ней могут оставаться локальные секреты и старые сборки.

Для Android/iOS нужен development/production build; Expo Go не содержит используемые нативные модули. Проверки JavaScript не заменяют запуск release-сборки на устройствах. Сборки и патчи описаны в [руководстве разработчика](docs/DEVELOPMENT.md).

Действующий сервер обновляется после push в `master` через [Gitlub](docs/gitlub-deployment.md). Ручная установка выше предназначена для нового сервера. Настройки `.github` сохранены для прежнего процесса выпуска.

Подробнее: [архитектура](docs/ARCHITECTURE.md) · [эксплуатация и резервные копии](docs/OPERATIONS.md) · [API](docs/API.md) · [выпуск и откат](deploy/README.md) · [результаты подготовки](docs/HANDOVER.md).

При обновлении действующего сервера сохраняйте БД, uploads и push-ключи; не заполняйте рабочую БД повторно из seed. [Проверка обратной совместимости с установленными приложениями](docs/COMPATIBILITY.md).
