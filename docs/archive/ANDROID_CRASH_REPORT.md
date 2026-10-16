# Вылет при запуске Android: RuStore, версия 1.0.8

Дата проверки: 7 сентября 2026.

## Подтверждённая причина

RuStore API возвращает `REJECTED_BY_MODERATOR` для версии **1.0.8 (21)**,
`versionId=2064794807`. Модератор указал Android 15, Xiaomi 2306EPN60G.
Проверялся сохранённый APK `tmp/releases/uletay-1.0.8-rustore-v21.apk`,
собранный в EAS как `f92a4899-23e8-47a9-91a3-d36d4bfd0903`.

Этот APK воспроизводимо закрывается на чистом эмуляторе Android 15 / API 35
(AOSP x86_64, без Google Play Services). Журнал Android:

```text
FATAL EXCEPTION: mqt_v_native
Process: ru.uletay.app
com.facebook.react.common.JavascriptException:
Error: [Reanimated] Invalid predefined timing function "cubic-bezier(0.23, 1, 0.32, 1)".
Supported values are: linear, ease, ease-in, ease-out, ease-in-out, step-start, step-end.
    at AnimatedComponent(Pressable)
    at MotionPressable
    at MoreMenuSheet
    at RootNavigator
```

`MotionPressable` передавал браузерную CSS-строку из `motion.pressEasingCss`
в `transitionTimingFunction`. Нативный нормализатор Reanimated принимает
строками только перечисленные предустановленные значения; произвольную кривую
нужно передавать объектом `cubicBezier(...)`.

`MoreMenuSheet` монтируется при старте, даже когда меню закрыто. Поэтому ошибка
возникала до взаимодействия пользователя с кнопками. Это фатальная JS-ошибка
в release-приложении. Успешные TypeScript, web-export и EAS Build её не выявляли.
Найденный стек не связан с проигрывателем видео.

## Исправление

- `src/theme/motion.ts`: координаты кривой хранятся в `motion.pressBezier`.
- `src/components/MotionPressable.tsx`: создаётся `cubicBezier(...motion.pressBezier)`
  из публичного API Reanimated и передаётся в `transitionTimingFunction`.
- Кривая, длительность и обработка уменьшения движения сохранены. Reanimated
  преобразует этот объект в CSS-строку при работе в браузере.
- Версия приложения повышена до **1.0.9**, EAS выделил **versionCode 23**.
- Добавлен `npm run test:android-startup`: проверяет готовый APK после splash,
  процесс приложения, главную навигацию и журнал ошибок. Инструкция в README.

Документация: [Reanimated: transitionTimingFunction](https://docs.swmansion.com/react-native-reanimated/docs/css-transitions/transition-timing-function/),
[Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/).

## Проверки

- Старый APK: реальный вылет при запуске; повторный запуск через новый тест
  также завершился `FAIL` с журналом той же ошибки.
- `npm run typecheck`: успешно.
- ESLint для изменённых компонентов: успешно.
- Production export для Android с Hermes и source map: успешно.
- Production export для web: успешно.
- Диагностический APK с исходными нативными библиотеками и исправленным
  JS-bundle: главная отображается, тест запуска проходит. Меню «Ещё» и переход
  в настройки работают; радио воспроизводится и переживает сворачивание и
  возврат без смены процесса. Диагностический APK подписан отдельным тестовым
  ключом и не предназначен для распространения.
- Окончательный подписанный EAS APK **1.0.9 (23)**: успешно установлен поверх
  исходного **1.0.8 (21)**. Тест запуска на Android 15 прошёл; главная и фоновое
  видео отображаются, журнал ошибок теста пуст. В JS-bundle присутствует
  `pressBezier`, старый `pressEasingCss` отсутствует.
- На окончательном APK также проверены переход «Ещё → Настройки», запуск
  радио, сворачивание/возврат во время воспроизведения и открытие карты.
  Процесс приложения сохранился во всех этих сценариях.
- Повторный холодный запуск с сохранёнными данными при отключённых Wi-Fi и
  мобильных данных: тест прошёл. Результат:
  `tmp/rustore-android15/release-offline-test/`.
- `apksigner verify` и `zipalign -c -P 16 4`: успешно.

Полный исходный стек: `tmp/rustore-android15/before-crash.log`.
Результат регрессионного теста старой версии: `tmp/rustore-android15/before-test/`.
Результат теста окончательного APK: `tmp/rustore-android15/release-test/`.
Дополнительные сценарии: `tmp/rustore-android15/release-flows/`.

## Готовая сборка

- Файл: `tmp/releases/uletay-1.0.9-rustore-v23.apk` (115 727 021 байт).
- [Сборка EAS](https://expo.dev/accounts/romkadvayhas-team/projects/romkadvayha/builds/40093963-1ad3-48d5-a0a4-1723307a37e8).
- [Скачать APK из EAS](https://expo.dev/artifacts/eas/1kEN27QkEXAI7A00iQDhzarjLxLpgb_RMsw5Y5AewvM.apk).
- SHA-256: `d561626be958efb17e4f108082c549ddc5af60bfb70e2aae49cc57bf0dec52ea`.

В `scripts/submit-rustore-release.mjs` исправлен текст для модератора — теперь
он описывает подтверждённый сбой Reanimated и укладывается в лимит RuStore
180 символов.

7 сентября 2026 версия **1.0.9 (23)** отправлена в RuStore:

- `versionId`: `2064808428`;
- статус после отправки: `AUTO_CHECK`;
- публикация после одобрения: автоматическая, 100% пользователей.

Эмулятор остановлен. Автоматическая проверка заблокировала очистку временных
каталогов `tmp/rustore-android15/toolchain` и `tmp/rustore-android15/avd`
с причиной `blocked by policy`; эти файлы остались на диске.

## Границы проверки

Физического Xiaomi 2306EPN60G в подключённых устройствах нет. Проверка
выполняется на эмуляторе Android 15 и подтверждает конкретную ошибку исходного
release APK. Успех модерации остаётся решением RuStore.

`expo install --check` также сообщил о девяти доступных patch-обновлениях Expo.
Они существовали до исправления; зависимости не менялись в рамках устранения
подтверждённой ошибки анимации.
