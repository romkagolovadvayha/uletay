const { existsSync } = require('node:fs');
const path = require('node:path');

const defaultGoogleServicesFile = './google-services.json';

module.exports = ({ config }) => {
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_FILE || defaultGoogleServicesFile;
  const isRuStoreBuild = process.env.RUSTORE_BUILD === '1';
  const rustorePushProjectId = String(
    process.env.RUSTORE_PUSH_PROJECT_ID || '',
  ).trim();
  const hasGoogleServicesFile = existsSync(
    path.resolve(__dirname, googleServicesFile),
  );

  if (isRuStoreBuild && !rustorePushProjectId) {
    throw new Error(
      'RUSTORE_PUSH_PROJECT_ID is required when RUSTORE_BUILD=1',
    );
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      '@maplibre/maplibre-react-native',
      ...(isRuStoreBuild
        ? [
            [
              './plugins/with-rustore-push',
              {
                projectId: rustorePushProjectId,
                channelId: 'broadcasts',
              },
            ],
          ]
        : []),
    ],
    extra: {
      ...(config.extra || {}),
      ...(isRuStoreBuild
        ? { rustorePushProjectId }
        : {}),
    },
    android: {
      ...config.android,
      ...(isRuStoreBuild
        ? {
            permissions: (config.android?.permissions || []).filter(
              (permission) => permission !== 'SCHEDULE_EXACT_ALARM',
            ),
            blockedPermissions: [
              ...(config.android?.blockedPermissions || []),
              'android.permission.SCHEDULE_EXACT_ALARM',
              'android.permission.SYSTEM_ALERT_WINDOW',
              'android.permission.READ_EXTERNAL_STORAGE',
              'android.permission.WRITE_EXTERNAL_STORAGE',
            ],
          }
        : {}),
      ...(hasGoogleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
