import path from 'node:path';

function env(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

const basePath = env('BASE_PATH').replace(/\/$/, '');

export const config = {
  dbHost: env('DB_HOST', '127.0.0.1'),
  dbName: env('DB_NAME', 'uletay'),
  dbUser: env('DB_USER', 'root'),
  dbPass: env('DB_PASS'),
  adminUser: env('ADMIN_USER', 'admin'),
  adminPassword: env('ADMIN_PASSWORD', 'uletay2026'),
  sessionSecret: env('SESSION_SECRET', 'dev-secret-change-me'),
  corsOrigin: env('CORS_ORIGIN', '*'),
  basePath,
  uploadDir: (() => {
    const raw = env('UPLOAD_DIR', path.join('..', 'uploads'));
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  })(),
  uploadUrl: `${basePath}/api/uploads`,
  port: Number(env('PORT', '3000')),
  vapidPublicKey: env('VAPID_PUBLIC_KEY'),
  vapidPrivateKey: env('VAPID_PRIVATE_KEY'),
  vapidSubject: env('VAPID_SUBJECT', 'mailto:admin@uletay.ru'),
  expoPushAccessToken: env('EXPO_PUSH_ACCESS_TOKEN'),
  rustorePushProjectId: env('RUSTORE_PUSH_PROJECT_ID'),
  rustorePushServiceToken: env('RUSTORE_PUSH_SERVICE_TOKEN'),
};
