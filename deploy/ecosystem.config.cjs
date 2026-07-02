module.exports = {
  apps: [
    {
      name: 'uletay-cms',
      cwd: '__DEPLOY_PATH__/cms',
      script: 'node',
      args: '.next/standalone/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: '__CMS_PORT__',
        HOSTNAME: '127.0.0.1',
      },
    },
  ],
};
