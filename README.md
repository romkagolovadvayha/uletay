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

### Карта фестиваля

Как в проекте taxi, приложение использует MapLibre Native на Android/iOS и
MapLibre GL JS в браузере. Общая модель `src/components/map/map-scene.ts`
отвечает за зоны, фильтры, подписи и маршруты; платформенные компоненты управляют
только рендерером, камерой и событиями. GPS обновляет отдельный GeoJSON-источник.

Сцены и сервисные здания имеют объём (`fill-extrusion`); кнопка 2D/3D меняет
наклон камеры. Высоты условные: сцены 6 м, павильоны около 3 м. Подписи состоят
из контуров букв Montserrat, вписанных в верхнюю поверхность объекта, поэтому
они сохраняют положение и размер при наклоне, повороте и масштабировании.
Алфавит генерируется командой `node scripts/generate-map-font.mjs`; в приложение
попадают только контуры и лицензия SIL OFL, без парсера шрифтов.

Стиль поставляется с приложением, тайлы и русские подписи — OpenFreeMap.
При необходимости задайте `EXPO_PUBLIC_MAP_TILES_URL` и
`EXPO_PUBLIC_MAP_GLYPHS_URL`; для другого хоста обновите production CSP.
Веб-модули MapLibre и worker копируются из закреплённой npm-версии при запуске
Metro/сборке и обслуживаются с собственного домена, без CDN JavaScript.
Нативный движок сохраняет просмотренные тайлы в дисковом кеше до 128 МБ.

После добавления MapLibre необходима новая нативная сборка: Expo Go и OTA старого
бинарного приложения не содержат этот модуль. `npm run build` проверяет экспорт
JS всех платформ; `npx expo run:android` / EAS создаёт сам бинарный файл.
GitHub Actions деплоит веб-приложение и CMS; публикация в магазинах выполняется
отдельно. Редактор CMS и внешние ссылки на Яндекс Карты сохраняют свои настройки.

Проверки карты: `npm run test:map`, `npm run test:map:renderer`,
`npm run test:map:layout`, `npm run test:map:routing`.

План привязан к улице Центральной и дороге Ижевск — Гольяны текущей подложки
OpenFreeMap/OSM (срез 13.09.2026). Опорные точки и цвета находятся в
`scripts/map-site-registration.mjs`, объекты и проходы — в
`scripts/festival-map-plan.mjs`. Размещение по приложенной схеме приблизительное,
не геодезическое: прямоугольные строения и ряды мест сохраняют форму, дороги и
ограждения оставляют свободными, подписи вписываются внутрь объектов.

Зелёная территория и песочная подложка объединены по схеме; дороги и проходы
показаны сплошными тёмными линиями, заборы — красным пунктиром. Закрытые зоны
за тремя сценами задаются в `scripts/map-site-presentation.mjs`. Маршрутизатор
исключает пересекающие их отрезки до поиска пути, затем проверяет весь маршрут,
включая подход к объекту. WC за Южной сценой отмечен как служебный и недоступен
для построения посетительского маршрута.

После изменения схемы выполните `npm run map:generate` и проверки карты.
Генератор повторяемо обновляет CMS seed и автономный снимок нативного приложения
`src/data/festivalMapSnapshot.json`; исходные координаты сохраняются отдельно.
При деплое версия `2026-plan-v4-3d-visitor-map` переносит геометрию в CMS через
существующую миграцию карты. Перед новой миграцией сверяйте seed с картой CMS,
чтобы сохранить последующие ручные изменения редактора.

### Push-уведомления

В админке откройте вкладку **Push**: там задаются заголовок, текст, аудитория и
экран, который откроется по нажатию. Подписки создаются только после явного
включения уведомлений пользователем в настройках приложения.

- iOS/Android используют Expo Push Service. Для Android нужен development/production
  build — удалённые push не работают в Expo Go.
- Android также требует `google-services.json` для приложения
  `ru.uletay.app`. Положите файл в корень проекта: `app.config.js` подключит его
  автоматически. Проверка перед сборкой: `npm run push:check-android`.
- Web использует стандартные Service Worker + Push API. Нужен HTTPS; на iPhone
  сайт должен быть добавлен на экран «Домой».
- Для событий из избранного напоминание отправляется за 10 минут до начала:
  локально на iOS/Android и серверным Web Push в браузере, даже если вкладка закрыта.
  Production-деплой автоматически устанавливает ежеминутный cron с защитой от дублей.
- При первом production-деплое VAPID-ключи генерируются автоматически и затем
  сохраняются в `cms/.env`. Не меняйте их после появления подписчиков.

Для локальной настройки сгенерируйте ключи командой
`npx web-push generate-vapid-keys` и добавьте `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY` и `VAPID_SUBJECT` в `cms/.env`.

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

Текущие серверные скрипты управляют nginx, certbot и файлами в `/etc/cron.d`,
поэтому workflow использует отдельный SSH-ключ пользователя `root`. Не
используйте для него личный SSH-ключ.

### 4. Установите ПО на сервере

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx mysql-server rsync git cron logrotate
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

sudo mkdir -p /var/www/uletay
sudo chown -R root:www-data /var/www/uletay
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

### 6. Системные службы

```bash
sudo systemctl enable --now nginx mysql cron
```

### 7. SSH-ключ для GitHub Actions

```bash
ssh-keygen -t ed25519 -N "" -C "github-deploy-uletay" -f ~/.ssh/uletay_deploy
cat ~/.ssh/uletay_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Однострочный приватный ключ → GitHub Secret `SSH_PRIVATE_KEY_B64`:

```bash
base64 -w0 ~/.ssh/uletay_deploy && echo
```

После независимой проверки fingerprint добавьте вывод следующей команды в
GitHub Secret `SSH_KNOWN_HOSTS`:

```bash
ssh-keyscan -H -p 22 ВАШ_IP
```

### 8. GitHub Environment `production`

Репозиторий: **https://github.com/romkagolovadvayha/uletay**

**Settings → Environments → `production`**

Несекретные настройки добавляются в **Variables**, пароли и ключи — только в
**Secrets**.

| Имя | Пример | Обязательный |
|-----|--------|--------------|
| `DOMAIN` | `uletayapp.ru` | да |
| `LE_EMAIL` | `you@mail.ru` | да |
| `SSH_HOST` | IP VPS (`185.x.x.x`) | да |
| `SSH_USER` | `root` | да |
| `SSH_PRIVATE_KEY_B64` | приватный ключ в base64 | да — **только Secrets** |
| `SSH_KNOWN_HOSTS` | закреплённый host key VPS | да — **только Secrets** |
| `DB_HOST` | `127.0.0.1` | да |
| `DB_NAME` | `uletay` | да |
| `DB_USER` | `uletay` | да |
| `DB_PASS` | пароль MySQL | да — **только Secrets** |
| `ADMIN_PASSWORD` | пароль админки | да — **только Secrets** |
| `SESSION_SECRET` | случайная строка 32+ символа | да — **только Secrets** |
| `EXPO_PUBLIC_YANDEX_MAPS_API_KEY` | UUID ключа JS API | да |
| `DEPLOY_PATH` | `/var/www/uletay` | нет |
| `SSH_PORT` | `22` | нет |
| `CMS_PORT` | `3000` | нет |
| `ADMIN_USER` | `admin` | нет |

### 9. Первый деплой

Push в `master` или **Actions → Deploy → Run workflow**.

Что произойдёт:

1. Проверка Expo SDK 57, TypeScript и lint
2. Production-сборка и проверка Expo web/SEO/PWA и Next.js CMS
3. Загрузка только runtime-файлов на VPS
4. Миграция БД, перезапуск CMS и проверка публичного HTTPS/API
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
npm run seo:check     # проверка title, description, canonical, robots и sitemap в dist
npm run test:push-web # проверка service worker, payload и перехода по клику
npm run test:push-reminders --prefix cms # расчёт T−10 и deep links
npm run test:push-favorites --prefix cms # избранное, выбор получателей и защита от дублей
npm run cms:build     # сборка CMS
npm run cms:install   # установка БД
npm run seed:api      # экспорт сида
npm run typecheck     # TypeScript
npm run lint          # ESLint
```

`npm run build` создаёт отдельный `index.html` для каждого публичного web-маршрута
и заново генерирует `dist/sitemap.xml`. Список динамических страниц берётся из
API, указанного в `EXPO_PUBLIC_API_URL`; если API недоступен, сборка использует
данные репозитория. Файлы `robots.txt`, sitemap и HTML всех URL проверяются
автоматически до завершения сборки.

## Проверка Android перед отправкой в RuStore

Проверяйте release APK на устройстве или эмуляторе Android 15. Успешные
TypeScript, web-export и EAS Build не проверяют выполнение нативных анимаций.

```bash
npm run test:android-startup -- --serial emulator-5580 --apk tmp/releases/uletay-1.0.11-rustore-v28.apk --out tmp/android-startup
```

`--serial` обязателен: укажите идентификатор тестового устройства из `adb devices`.
`--apk` устанавливает APK поверх существующей версии; без него проверяется уже
установленное приложение. Скрипт останавливает и запускает приложение, ждёт
15 секунд, проверяет процесс и появление главной навигации. Результат, журнал
ошибок и снимок экрана сохраняются в `--out`. Данные приложения не очищаются.

Дополнительно проверьте меню «Ещё», карту, радио, возврат из фона, повторный
запуск без интернета и запуск после завершения процесса системой.

Разбор вылета версии 1.0.8: [ANDROID_CRASH_REPORT.md](ANDROID_CRASH_REPORT.md).

## Репозиторий

```bash
git clone git@github.com:romkagolovadvayha/uletay.git
cd uletay
npm install
npm install --prefix cms
```

CI/CD: [deploy/README.md](deploy/README.md)
