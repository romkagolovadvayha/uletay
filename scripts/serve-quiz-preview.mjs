// Local/LAN preview with the repository's public festival snapshot.
// No database connection, login or production API mutations are needed.
process.env.PORT ??= '4174';
process.env.PREVIEW_DATA_FILE ??= 'cms/seed/content.json';
process.env.PREVIEW_MEDIA_ORIGIN ??= 'https://uletayapp.ru';
await import('./serve-local.mjs');
