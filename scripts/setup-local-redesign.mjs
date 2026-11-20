import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../cms/package.json',import.meta.url));
const mysql=require('mysql2/promise');
const db='uletay_web_design';
const connection=await mysql.createConnection({host:'127.0.0.1',port:3352,user:'root',multipleStatements:true});
try{
  const schema=(await readFile(new URL('../cms/scripts/schema.sql',import.meta.url),'utf8')).replace('CREATE DATABASE IF NOT EXISTS uletay',`CREATE DATABASE IF NOT EXISTS ${db}`).replace('USE uletay;',`USE ${db};`);
  await connection.query(schema);
  const data=await readFile(new URL('../public/api/data',import.meta.url),'utf8');
  await connection.execute('INSERT IGNORE INTO app_content (id,content) VALUES (1,?)',[data]);
  console.log('Local isolated database ready: '+db+' on port 3352; existing content was preserved.');
}finally{await connection.end();}
