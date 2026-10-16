import mysql from 'mysql2/promise';
import { config } from './config';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.dbHost,
      port: config.dbPort,
      database: config.dbName,
      user: config.dbUser,
      password: config.dbPass,
      charset: 'utf8mb4',
      connectionLimit: 10,
    });
  }
  return pool;
}
