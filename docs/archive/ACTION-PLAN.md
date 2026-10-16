# План действий после аудита

## Готово в рабочем дереве

- [x] Убрать текст 8–11 px и обеспечить минимум 12 px.
- [x] Поднять собственные мобильные touch targets до 44 px.
- [x] Исправить переполнение дат, фильтров артистов и заголовка радио на 320 px.
- [x] Добавить viewport assertions в SEO-check.
- [x] Нормализовать `/index.html` и trailing slash.
- [x] Исправить MIME `manifest.webmanifest`.
- [x] Убрать soft-200 для неизвестных artist/vendor routes.
- [x] Разрешить индексацию публичных `/api/uploads/` без открытия остального `/api/`.
- [x] Проверить 10 ключевых маршрутов в Chrome на 320 px и основные маршруты на 375/768/1440 px.
- [x] Выполнить `typecheck`, `lint`, production web export и SEO-check 282 URL.

## Перед выкладкой — обязательно

- [ ] Просмотреть diff и сохранить резервную копию текущей production-конфигурации.
- [ ] Выполнить `nginx -t` на сервере.
- [ ] Выложить новую web-сборку и Nginx-конфигурацию атомарно.
- [ ] Проверить `/`, `/schedule`, `/headliners`, `/foodcourt`, `/playlist` на реальном телефоне.
- [ ] Проверить 301 для `/index.html`, `/map/`; 404 для вымышленных entity URL; MIME manifest; headers `/api/uploads/*`.
- [ ] Повторить Lighthouse mobile и запросить перепроверку в Яндекс Вебмастере.

## Следующая итерация — высокий эффект

- [ ] Сократить главный JS bundle и количество кода, исполняемого до первого экрана.
- [ ] Перевести используемые Montserrat начертания в subset WOFF2 и уменьшить icon font.
- [ ] Объединить дубли артистов и настроить 301/canonical.
- [ ] Исключить из sitemap/noindex слабые карточки без подтверждённых лет до наполнения.
- [ ] Добавить уникальный редакционный контент приоритетным артистам.
- [ ] Создать индивидуальные OG-изображения и исправить fallback `MusicGroup.image`.

## Полезно позже

- [ ] Добавить `SoftwareApplication`/`MobileApplication` после подтверждения официального download URL.
- [ ] Расширить entity schema проверенными `sameAs`, `genre`, `servesCuisine`, `hasMenu` и `OpeningHoursSpecification`.
- [ ] Добавить IndexNow для частых обновлений расписания после публикации production-данных.
- [ ] Улучшить H2/H3-семантику юридических, help, artist, foodcourt и radio sections.
