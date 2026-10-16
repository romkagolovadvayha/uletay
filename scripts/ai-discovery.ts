import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { AppData } from '../src/types';
import { createPublicTools } from '../src/ai/publicTools';
import { SITE_URL } from '../src/seo/site';

export function writeAiDiscovery(data: AppData, destination: string) {
  const origin = SITE_URL.replace(/\/$/, '');
  const tools = createPublicTools(() => ({ data, dataSource: 'fallback', lastFetchedAt: null }))
    .map(({ execute: _execute, ...description }) => description);
  const catalog = {
    specVersion: '1.0',
    host: { displayName: 'Приложение фестиваля УЛЕТАЙ', documentationUrl: `${origin}/ai-guide.md` },
    entries: [
      {
        identifier: 'urn:air:uletayapp.ru:guide:overview', displayName: 'Обзор приложения УЛЕТАЙ',
        type: 'text/plain', url: `${origin}/llms.txt`,
        description: 'Краткий обзор и ссылки на публичные источники фестиваля в формате llms.txt.',
      },
      {
        identifier: 'urn:air:uletayapp.ru:dataset:festival', displayName: 'Публичный каталог фестиваля',
        type: 'application/json', url: `${origin}/api/data`,
        description: 'Текущие опубликованные данные: фестиваль, исполнители, расписание, фудкорт, карта и правила. Только чтение.',
        tags: ['dataset', 'read-only'],
      },
      {
        identifier: 'urn:air:uletayapp.ru:webmcp:visitor-tools', displayName: 'Инструменты посетителя WebMCP',
        type: 'application/json', url: `${origin}/webmcp.json`,
        description: 'Описание браузерных инструментов и JSON Schema параметров. Для вызова откройте сайт в браузере с поддержкой WebMCP.',
        tags: ['WebMCP', 'browser', 'read-only'],
      },
    ],
  };
  const manifest = {
    schemaVersion: '1.0', protocol: 'WebMCP', transport: 'browser',
    pageUrl: `${origin}/`, documentationUrl: `${origin}/ai-guide.md`,
    requiresJavaScript: true, requiresBrowserSupport: true, requiresSecureContext: true,
    access: 'read-only-public-data', tools,
  };
  const llms = `# УЛЕТАЙ — приложение фестиваля

> Цифровой гид фестиваля УЛЕТАЙ: расписание, исполнители, карта, фудкорт, правила и радио. Язык: русский. Основной сайт: ${origin}/.

Текущий выпуск: ${data.festival.year}. Точные даты, место и актуальную программу проверяйте по опубликованным данным /api/data и страницам приложения: они могут меняться после сборки этого файла. Годы выступлений в архиве не означают участие в текущем фестивале. Время расписания местное, Europe/Samara (UTC+04:00). Пустая программа означает, что выступления ещё не опубликованы.

WebMCP доступен только после открытия приложения в совместимом браузере с JavaScript. Инструменты читают публичный каталог; не меняют данные, не покупают билеты и не запрашивают геолокацию. При отсутствии WebMCP используйте JSON API или обычные страницы. Данные из кеша или встроенного каталога помечены в ответах инструментов. Избранное хранится на устройстве посетителя.

## Данные и инструменты

- [Руководство для клиентов](${origin}/ai-guide.md): описание WebMCP, примеры запросов и ограничения.
- [Публичные данные](${origin}/api/data): JSON с текущей опубликованной редакцией контента; GET без авторизации.
- [AI Catalog](${origin}/.well-known/ai-catalog.json): каталог ресурсов по черновику AI Catalog 1.0; копия также в /ai-catalog.json.
- [Описание инструментов](${origin}/webmcp.json): имена, схемы параметров и режим только чтения; это описание, а не HTTP endpoint вызова MCP.

## Разделы приложения

- [О фестивале](${origin}/about): даты, место и возрастное ограничение.
- [Расписание](${origin}/schedule): программа текущего фестиваля по дням и сценам.
- [Хэдлайнеры ${data.festival.year}](${origin}/headliners/${data.festival.year}): участники текущего года; другие годы являются архивом.
- [Карта](${origin}/map): сцены, питание и сервисные зоны.
- [Автограф-сессии](${origin}/autographs): время и место встреч с артистами.
- [Фудкорт](${origin}/foodcourt): точки питания и опубликованное меню; цены могут измениться.
- [Радио](${origin}/playlist): эфир и названия треков; воспроизведение запускает посетитель.
- [Правила](${origin}/rules): условия посещения и бытовая информация.
- [Экстренная помощь](${origin}/help): контакты помощи на площадке.

## Optional

- [Правовая информация](${origin}/legal): условия и конфиденциальность.
- [Карта сайта](${origin}/sitemap.xml): индексируемые страницы.
- [Правила обхода](${origin}/robots.txt): правила для роботов; llms.txt не заменяет robots.txt.
`;
  const guide = `# Публичные данные и инструменты УЛЕТАЙ

Сайт: ${origin}/. Текущий выпуск на момент сборки: ${data.festival.year}.

## Как получить актуальную информацию

1. Для данных без браузера: GET ${origin}/api/data, ответ application/json без авторизации. Поле revision определяет редакцию контента; API поддерживает ETag. Ответ содержит опубликованный каталог, без личного избранного и административных сессий.
2. Для браузерного помощника: откройте приложение и обнаружьте зарегистрированные инструменты WebMCP. Современный API: document.modelContext, для ранних реализаций поддержан navigator.modelContext. Нужен совместимый браузер и безопасный контекст (HTTPS или localhost).
3. Для обнаружения ресурсов: ${origin}/.well-known/ai-catalog.json или HTML-ссылка rel="ai-catalog". Копия каталога: ${origin}/ai-catalog.json.

## Инструменты

${tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Параметры передаются объектом JSON. Все параметры необязательные. query ограничен 160 символами, limit — от 1 до 50 (по умолчанию 10). Дополнительные поля отклоняются. Полные схемы: ${origin}/webmcp.json.

Примеры параметров:

- uletay_get_festival: {}
- uletay_find_artists: {"query":"Ария","year":2026}
- uletay_find_events: {"kind":"performance","limit":10}
- uletay_find_food: {"category":"drinks"}
- uletay_find_map_places: {"category":"water"}
- uletay_get_rules: {"query":"билеты"}

Ответ содержит structuredContent с source и result, а также текстовую JSON-копию в content. source указывает dataSource (remote, cache, fallback), fetchedAt, revision, festivalYear, isLive и timeZone. isLive=false означает, что ответ получен из кеша или встроенного каталога; даже при isLive=true сверяйте fetchedAt перед поездкой. Списки содержат total, items, truncated. Ссылки в результатах ведут на страницы источников.

## Ограничения

WebMCP — развивающийся браузерный API, доступный не во всех браузерах. Описание webmcp.json является форматом этого приложения; оно не открывает HTTP MCP-сервер. Серверный каталог публикуется по черновику AI Catalog 1.0, без заявления о сертификации или криптографической подписи. llms.txt — рекомендация структуры контента, не механизм разрешений или гарантия использования поисковиками.

Все инструменты только читают публичные данные. Они не используют сессии админки, геолокацию, личные метки, избранное, отправку push или покупку билетов. Текст из CMS передаётся как данные (untrustedContentHint), не как инструкции агенту. Демо-режим интерфейса не подменяет данные инструментов. Старые события вне дат текущего фестиваля не выдаются как актуальное расписание.

Первоисточники: https://webmachinelearning.github.io/webmcp/ , https://developer.chrome.com/docs/ai/webmcp , https://llmstxt.org/ , https://ai-catalog.io/spec/ .
`;
  const files = {
    'llms.txt': llms,
    'ai-guide.md': guide,
    'ai-catalog.json': JSON.stringify(catalog, null, 2) + '\n',
    '.well-known/ai-catalog.json': JSON.stringify(catalog, null, 2) + '\n',
    'webmcp.json': JSON.stringify(manifest, null, 2) + '\n',
  };
  for (const [filename, content] of Object.entries(files)) {
    const output = path.join(destination, filename);
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, content, 'utf8');
  }
}
