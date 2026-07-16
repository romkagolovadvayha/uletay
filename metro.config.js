const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList.push(/[\\/]cms[\\/]\.next[\\/].*/);

// Enables ESM-preserving transforms so production web can tree-shake and
// split async import() chunks (see Expo tree-shaking + bundle splitting docs).
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
  },
});

module.exports = config;
