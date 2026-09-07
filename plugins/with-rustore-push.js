const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

function upsertMetaData(application, name, value) {
  const metaData = application['meta-data'] || [];
  const existing = metaData.find((item) => item.$?.['android:name'] === name);

  if (existing) {
    existing.$['android:value'] = value;
  } else {
    metaData.push({
      $: {
        'android:name': name,
        'android:value': value,
      },
    });
  }

  application['meta-data'] = metaData;
}

module.exports = function withRuStorePush(config, options = {}) {
  const projectId = String(options.projectId || '').trim();
  const channelId = String(options.channelId || 'broadcasts').trim();

  if (!projectId) {
    throw new Error('RuStore Push projectId is required for a RuStore build');
  }

  return withAndroidManifest(config, (androidConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      androidConfig.modResults,
    );

    upsertMetaData(
      application,
      'ru.rustore.sdk.pushclient.project_id',
      projectId,
    );
    upsertMetaData(
      application,
      'ru.rustore.sdk.pushclient.default_notification_channel_id',
      channelId,
    );

    return androidConfig;
  });
};
