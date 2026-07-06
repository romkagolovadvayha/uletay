// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      'dist-web/**',
      'dist-web-check/**',
      '.expo/**',
      '**/_expo/**',
      'node_modules/**',
      'cms/.next/**',
      'cms/node_modules/**',
      'uploads/**',
      'scripts/**',
      'cms/scripts/**',
    ],
  },
  {
    files: ['cms/**/*.ts', 'cms/**/*.tsx'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
]);
