const { existsSync } = require('node:fs');
const path = require('node:path');

const defaultGoogleServicesFile = './google-services.json';

module.exports = ({ config }) => {
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_FILE || defaultGoogleServicesFile;
  const hasGoogleServicesFile = existsSync(
    path.resolve(__dirname, googleServicesFile),
  );

  return {
    ...config,
    android: {
      ...config.android,
      ...(hasGoogleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
