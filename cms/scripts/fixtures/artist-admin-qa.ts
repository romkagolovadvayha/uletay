import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ResultSetHeader } from 'mysql2';

async function main() {
  if (process.env.DB_NAME !== 'uletay_web_design' || process.env.DB_PORT !== '3352') throw Error('Isolated preview database required');
  const path = join(tmpdir(),'uletay-artist-admin-qa.json');
  const db = await mysql.createConnection({ host:'127.0.0.1',port:3352,user:'root',database:'uletay_web_design' });
  try {
    if (process.argv.includes('--session')) {
      const state=JSON.parse(await readFile(path,'utf8'));
      const origin='http://127.0.0.1:3000';
      const html=await (await fetch(`${origin}/admin/login`)).text();
      const action=html.match(/name="(\$ACTION_ID_[^"]+)"/);
      if(!action) throw Error('Login form action not found');
      const form=new FormData(); form.set(action[1],'');form.set('username',state.username);form.set('password',state.password);
      const response=await fetch(`${origin}/admin/login`,{method:'POST',body:form,headers:{Origin:origin},redirect:'manual'});
      if(response.status!==303||!response.headers.get('set-cookie')) throw Error(`Login failed: ${response.status} ${response.headers.get('location')}`);
      state.cookie=response.headers.get('set-cookie')!.split(';')[0].split('=').slice(1).join('=');
      await writeFile(path,JSON.stringify(state));
      console.log('Local server-action login succeeded and issued an authenticated session.');
    } else if (process.argv.includes('--cleanup')) {
      const state=JSON.parse(await readFile(path,'utf8'));
      await db.execute('DELETE FROM admin_sessions WHERE user_id=?',[state.id]);
      await db.execute('DELETE FROM admin_users WHERE id=? AND username=?',[state.id,state.username]);
      await unlink(path); console.log('Temporary local admin and sessions removed.');
    } else {
      const username=`qa-artist-${Date.now()}`,password=randomBytes(24).toString('base64url');
      const [row]=await db.execute<ResultSetHeader>('INSERT INTO admin_users(username,password_hash,role,display_name) VALUES(?,?,?,?)',[username,await bcrypt.hash(password,10),'admin','Проверка жанров']);
      await writeFile(path,JSON.stringify({id:row.insertId,username,password}),{flag:'wx'});
      console.log('Temporary local admin ready for UI verification.');
    }
  } finally { await db.end(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
