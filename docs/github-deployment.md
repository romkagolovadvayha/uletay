# Деплой через GitHub

Основной репозиторий: https://github.com/romkagolovadvayha/uletay.
Push в `master` запускает **Deploy production**. Настройки находятся в GitHub
Environment **production**. Сборка выполняется на GitHub runner, готовый архив
передаётся на существующий production `212.193.26.91`, в `/var/www/uletay`.

## Выпуск

Workflow проверяет приложение, собирает Expo web и CMS, затем упаковывает `dist`,
`assets`, `cms`, `deploy`, `shared`, `src`. Исходники `src` нужны общим модулям
скриптов обслуживания CMS. Импорты этих скриптов проверяются в распакованном
архиве отдельно от исходного checkout. Файлы окружения, node_modules и кеш сборки
исключены. `deploy/send-release.py` передаёт архив, размер, SHA-256 и настройки
по SSH через stdin; секреты не входят в аргументы процесса или архив.

На сервере работает `deploy/restricted-production.py`, установленный как
`/usr/local/sbin/gitlub-uletay-production` (имя сохранено для совместимости).
Он проверяет целевой сервер, commit, ID релиза, контрольную сумму и содержимое
архива, затем вызывает `deploy/release-deploy.sh`. Сохраняются миграции,
проверка кандидата, переключение nginx между портами и откат при ошибке.
После активации GitHub проверяет SHA в `/api/health`, публичные ресурсы,
маршруты и `vk-headliners.uletayapp.ru`.

SSH-ключ GitHub разрешает только `deploy master COMMIT RELEASE`, `sync-lastfm`
и `sync-images`; интерактивная оболочка и перенаправление портов запрещены.
Публичный ключ установлен с `restrict,command="/usr/local/sbin/gitlub-uletay-production"`.
Ключ сервера закреплён в `SSH_KNOWN_HOSTS`. Изменения обработчика устанавливаются
администратором сервера с сохранением резервной копии.

## Окружение

Переменные: `DOMAIN`, `DEPLOY_PATH`, `CMS_PORT`, `LE_EMAIL`, `SSH_HOST`, `SSH_USER`,
`SSH_PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `ADMIN_USER`,
`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SITE_URL`, `EXPO_PUBLIC_YANDEX_MAPS_API_KEY`,
`NEXT_PUBLIC_YANDEX_MAPS_API_KEY`, `VK_APP_ID`, `VK_REDIRECT_URI`,
`RUSTORE_PUSH_PROJECT_ID`, `VAPID_SUBJECT`.

Secrets: `SSH_PRIVATE_KEY_B64`, `SSH_PRIVATE_KEY` (резервный формат),
`SSH_KNOWN_HOSTS`, `DB_PASS`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `LASTFM_API_KEY`,
`LASTFM_PROXY_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`EXPO_PUSH_ACCESS_TOKEN`, `RUSTORE_PUSH_SERVICE_TOKEN`.
Последние два значения необязательны и совпадают с настройками рабочего CMS.

При возврате на GitHub 28 октября 2026 года значения сверены с активным CMS:
перенесены прокси Last.fm от 26 октября, постоянные ключи Web Push,
`VK_APP_ID=54857258` и
`VK_REDIRECT_URI=https://uletayapp.ru/admin/auth/vk/callback`.
Секреты сессий и базы сохраняются; новые ключи Web Push не генерируются.
`LASTFM_API_KEY` хранится в Secrets, а не в Variables.

## Синхронизация

**Sync Last.fm** запускается ежедневно в 01:00 UTC (05:00 Самара) и вручную.
**Sync headliner web images** запускается вручную с `dry_run`, `force`, `limit`.
Оба задания выполняются через ограниченный SSH-вход в текущем CMS на production,
используя его актуальное `.env`, прокси и общий uploads. Общая группа GitHub
`uletay-production` и серверная блокировка исключают пересечение с деплоем.

Gitlub больше не является источником автоматических выпусков. Его удалённый
репозиторий сохранён под именем `gitlub`, GitHub — `origin`. Старый ключ Gitlub
отзывается после успешного первого выпуска с GitHub, чтобы второй планировщик
не мог снова изменить production. История прежнего переноса находится в
[gitlub-deployment.md](gitlub-deployment.md).
