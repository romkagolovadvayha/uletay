import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { hashPassword } from '../src/lib/auth';

async function main() {
  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbName = process.env.DB_NAME || 'uletay';
  const dbUser = process.env.DB_USER || 'root';
  const dbPass = process.env.DB_PASS || '';
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'uletay2026';
  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || '../uploads');

  const root = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPass,
    multipleStatements: true,
  });

  const schema = await readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await root.query(schema);
  await root.end();

  const pool = await mysql.createConnection({
    host: dbHost,
    database: dbName,
    user: dbUser,
    password: dbPass,
  });

  const [rows] = await pool.query('SELECT id FROM app_content WHERE id = 1 LIMIT 1');
  const hasContent = Array.isArray(rows) && rows.length > 0;

  if (!hasContent) {
    const seedPath = path.join(__dirname, '..', 'seed', 'content.json');
    const seed = await readFile(seedPath, 'utf8');
    await pool.query('INSERT INTO app_content (id, content) VALUES (1, ?)', [seed]);
    console.log('Seeded app_content from cms/seed/content.json');
  } else {
    console.log('app_content already exists — skipped seed (admin data preserved)');
  }

  const passwordHash = await hashPassword(adminPassword);
  await pool.query(
    `INSERT INTO admin_users (username, password_hash) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [adminUser, passwordHash],
  );

  await mkdir(path.join(uploadDir, 'images'), { recursive: true });
  await pool.end();

  console.log('OK');
  console.log(`Database: ${dbName}`);
  console.log(`Admin: ${adminUser} / ${adminPassword}`);
  console.log('API: /api/data');
  console.log('Admin: /admin');
}

main().catch((error) => {
  console.error('Install failed:', error);
  process.exit(1);
});
