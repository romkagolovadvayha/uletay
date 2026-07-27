// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const nextPlugin = require('@next/eslint-plugin-next');

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
    plugins: {
      '@next/next': nextPlugin,
    },
    settings: {
      next: {
        rootDir: 'cms/',
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'import/no-unresolved': 'off',
    },
  },
  {
    files: ['cms/src/app/admin/components/**/*.{ts,tsx}'],
    rules: {
      // Admin previews use local uploads, object URLs and map overlays that should
      // not pass through Next.js image optimization.
      '@next/next/no-img-element': 'off',
    },
  },
]);
