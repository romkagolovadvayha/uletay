const isRuStoreBuild = process.env.RUSTORE_BUILD === '1';
const rustorePlatforms = { ios: null };

if (!isRuStoreBuild) {
  rustorePlatforms.android = null;
}

module.exports = {
  dependencies: {
    'react-native-rustore-push': {
      platforms: rustorePlatforms,
    },
  },
};
