import { readFile } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

export async function schemaForDatabase(name: string): Promise<string> {
  if (!/^[A-Za-z0-9_]{1,64}$/.test(name)) throw new Error('Invalid DB_NAME');
  const schema = await readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  const identifier = mysql.escapeId(name);
  return schema.replace('CREATE DATABASE IF NOT EXISTS uletay', `CREATE DATABASE IF NOT EXISTS ${identifier}`)
    .replace('USE uletay;', `USE ${identifier};`);
}
