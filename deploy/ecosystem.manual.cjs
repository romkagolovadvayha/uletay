const path = require('node:path');
const cms = path.resolve(__dirname, '../cms');

module.exports = {
  apps: [{
    name: 'uletay-cms',
    cwd: cms,
    script: path.join(cms, '.next/standalone/server.js'),
    node_args: [`--env-file=${path.join(cms, '.env')}`],
    env: { NODE_ENV: 'production', HOSTNAME: '127.0.0.1' },
    max_memory_restart: '700M',
    time: true,
  }],
};
