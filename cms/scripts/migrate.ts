import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { schemaForDatabase } from './database-schema';

async function main() {
  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbName = process.env.DB_NAME || 'uletay';
  const dbUser = process.env.DB_USER || 'root';
  const dbPass = process.env.DB_PASS || '';
  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || '../uploads');

  const root = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPass,
    multipleStatements: true,
  });

  const schema = await schemaForDatabase(dbName);
  await root.query(schema);
  await root.end();

  await mkdir(path.join(uploadDir, 'images'), { recursive: true });

  console.log('OK');
  console.log(`Database schema: ${dbName}`);
  console.log('app_content, push subscriptions, foodcourt URLs and uploads were not modified');
}

main().catch((error) => {
  console.error('Migrate failed:', error);
  process.exit(1);
});
