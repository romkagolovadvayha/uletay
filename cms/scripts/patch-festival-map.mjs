import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
import { supplementFestivalMap } from '../../scripts/festival-map-plan.mjs';

const cmsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(cmsRoot, '..');
const apply = process.argv.includes('--apply-local');
nextEnv.loadEnvConfig(cmsRoot, true);
const host = process.env.DB_HOST ?? '127.0.0.1';
if (!['localhost', '127.0.0.1', '::1'].includes(host)) throw new Error('This command only patches the local development database.');
const connection = await mysql.createConnection({host, user:process.env.DB_USER ?? 'root',
  password:process.env.DB_PASS ?? '', database:process.env.DB_NAME ?? 'uletay'});
try {
  await connection.beginTransaction();
  const [rows] = await connection.query('SELECT content FROM app_content WHERE id = 1 FOR UPDATE');
  if (!rows.length) throw new Error('Local app_content is empty.');
  const before = JSON.parse(rows[0].content);
  const after = supplementFestivalMap(before);
  const report = { before:{zones:before.mapZones?.features.length,pois:before.mapPois?.features.length},
    after:{zones:after.mapZones.features.length,pois:after.mapPois.features.length}, apply };
  const dir = path.join(root,'artifacts','map-audit');
  await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,'proposed-map.json'),JSON.stringify({festivalMap:after.festivalMap,mapZones:after.mapZones,mapPois:after.mapPois,mapPaths:after.mapPaths},null,2));
  if (apply) {
    await fs.writeFile(path.join(dir,`database-backup-${Date.now()}.json`),JSON.stringify(before,null,2));
    await connection.query('UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1',[JSON.stringify(after)]);
    await connection.commit();
    const seedFile = path.join(cmsRoot,'seed','content.json');
    const seed = JSON.parse(await fs.readFile(seedFile,'utf8'));
    await fs.writeFile(seedFile,JSON.stringify(supplementFestivalMap(seed),null,2)+'\n');
  } else await connection.rollback();
  console.log(JSON.stringify(report,null,2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally { await connection.end(); }
