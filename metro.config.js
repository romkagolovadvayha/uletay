const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList.push(/[\\/]cms[\\/]\.next[\\/].*/);

module.exports = config;
