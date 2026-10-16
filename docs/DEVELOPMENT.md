# Разработка и проверки

## Окружение

Установите зависимости через `npm ci` в корне и `npm ci --prefix cms`. Lock-файлы обеих частей нужны для воспроизводимой сборки. Настройки CLI установки и миграций читаются с тем же приоритетом `.env`, что и Next.js; переменные процесса имеют приоритет.

Корневой `npm run check` проверяет типы приложения, типы CMS и ESLint. `npm test` запускает регрессионные тесты контента, кеша, API, поиска и редакторов админки, геометрии карты, авторизации VK и выдачи файлов. Проверки push-напоминаний: `npm --prefix cms run test:push-reminders`.

Тест авторизации с настоящим MySQL создаёт и удаляет отдельную случайную БД `uletay_test_auth_*`. Он требует явно указанного порта отдельного тестового экземпляра:

```sh
TEST_DB_PORT=3319 npm --prefix cms run test:auth:db
```

PowerShell: `$env:TEST_DB_PORT='3319'`, затем та же npm-команда. Нужен тестовый пользователь с правом создания БД; можно указать `TEST_DB_USER` и `TEST_DB_PASS`. Не используйте рабочую БД для тестирования интерфейса.

## Web и CMS

`npm run build:web` создаёт `dist` и проверяет HTML маршрутов, sitemap и метаданные. Сборка берёт актуальные данные из `EXPO_PUBLIC_API_URL`; при недоступности API использует данные репозитория. После переноса данных проверьте, что сгенерированные страницы соответствуют рабочему содержимому.

`npm run cms:build` собирает standalone CMS со статическими файлами. Режим разработки использует `.next-dev`, сборка — `.next`, поэтому они не перезаписывают результаты друг друга. `cms/src/app/admin/styles/theme.css` задаёт цвета всех элементов в обеих темах. Проверяйте ширины от 320 px, клавиатурную навигацию, ошибки форм и несохранённые изменения.

## Android и iOS

Проект использует [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/). Перед изменением нативной зависимости читайте документацию именно этой версии. Проверка совместимости: `npx expo install --check`.

Expo Go не содержит MapLibre и используемые интеграции RuStore. Для разработки: `npm run android` / `npm run ios` на подходящей системе или EAS development build. Профили магазинов находятся в `eas.json`; команды: `npm run build:android`, `npm run build:ios`. Сборка не публикует приложение. Команды `submit:*` и workflow публикации выполняются только при отдельном выпуске.

`postinstall` применяет два локальных исправления: RuStore Push и обложки системного плеера `expo-audio`. Источники — `scripts/patch-rustore-push-sdk.mjs`, `scripts/patch-expo-audio-artwork.mjs`, дополнительные файлы — в `patches`. Не убирайте исправления при обновлении пакетов без проверки release-приложения.

Исправление RuStore также заменяет закрытый 30 сентября 2026 года Maven-репозиторий VK Partner на `https://nexus-external.rustore.ru/repository/maven-rustore-exposed`. Версия SDK сохраняется. Адрес указан в [официальном уведомлении RuStore](https://www.rustore.ru/help/sdk/pay/unity/history/9-0-2). После установки зависимостей запустите `npm run test:rustore-push-config`.

Для двух транзитивных зависимостей Tracer (`tracer-manifest`, `tracer-lite-crash-report`) явно выбрана версия `1.0.4`: прежняя `1.0.1` отсутствует в новых репозиториях. Это первая версия этой ветки в Maven Central; [документация Tracer по переносу](https://apptracer.ru/doc/android/migrate/). При обновлении RuStore SDK проверьте, нужны ли ещё эти зависимости.

Для Firebase нужен `google-services.json`, для публикации — ранее использованные ключи подписи и служебные учётные записи. Эти файлы в архив исходников не включаются. Проверка Android Push: `npm run push:check-android`. Запуск release APK: `npm run test:android-startup -- --serial <adb-device> --apk <release.apk> --out tmp/android-startup`.

Дополнительно проверьте карту, радио и системную обложку, возвращение из фона, push-переходы, работу без сети и повторный запуск после завершения процесса системой. Успешные TypeScript и web-сборка этого не подтверждают.

## Карта

Источник плана — `scripts/festival-map-*`, привязки — `scripts/map-site-*`. После изменения выполните `npm run map:generate`, `npm run test:map`, `npm run test:map:renderer`, `npm run test:map:layout`, `npm run test:map:routing`. Генератор обновляет seed и автономный снимок приложения. Перед переносом новой геометрии сравните её с ручными правками в CMS.
