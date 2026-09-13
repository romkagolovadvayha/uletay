const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const fs = require('node:fs');
require('./scripts/prepare-maplibre-web.cjs').prepareMapLibreWeb();

const config = getDefaultConfig(__dirname);

config.resolver.blockList.push(/[\\/]cms[\\/]\.next[^\\/]*(?:[\\/]|$)/);
const rootPattern = __dirname.split(/[\\/]/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\\\/]');
config.resolver.blockList.push(new RegExp(`^(?:${rootPattern}[\\\\/])?(?:dist|tmp|artifacts)(?:[\\\\/]|$)`));

// Dev and export run together locally. Keep their serialized file maps apart,
// and exclude generated files so copying a web build cannot trigger a recrawl.
const cacheMode = process.env.EXPO_UNSTABLE_TREE_SHAKING === '1' ? 'export' : 'dev';
config.fileMapCacheDirectory = path.join(__dirname, 'tmp', 'metro-cache', process.versions.node, cacheMode);
fs.mkdirSync(config.fileMapCacheDirectory, { recursive: true });
config.cacheVersion = `uletay-${cacheMode}-2`;

// Enables ESM-preserving transforms so production web can tree-shake and
// split async import() chunks (see Expo tree-shaking + bundle splitting docs).
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
  },
});

module.exports = config;
