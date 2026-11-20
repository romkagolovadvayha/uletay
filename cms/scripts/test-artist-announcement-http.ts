import './load-env';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RowDataPacket } from 'mysql2';
import { getPool } from '../src/lib/db';
import { config } from '../src/lib/config';
import { getSafePushPath } from '../../src/utils/pushNavigation';

async function main() {
  assert.equal(config.dbPort,3352); assert.equal(config.dbName,'uletay_web_design');
  const state=JSON.parse(await readFile(join(tmpdir(),'uletay-announcement-admin-qa.json'),'utf8'));
  const origin='http://127.0.0.1:3000',cookie=`uletay_admin=${state.cookie}`,pool=getPool();
  const target=`/headliners/${state.artistId}`;
  const current=async()=>await(await fetch(`${origin}/api/data`)).json();
  const broadcasts=async()=>{const [rows]=await pool.execute<RowDataPacket[]>('SELECT title,body,target_path,audience FROM push_broadcasts WHERE target_path=?',[target]);return rows;};
  async function submit({authenticated=true,announce=false,stale=false}={}) {
    const data=await current(),artist=data.headliners.find((item:{id:string})=>item.id===state.artistId);
    const html=await(await fetch(`${origin}/admin?tab=headliners&edit=${state.artistId}`,{headers:{Cookie:cookie}})).text();
    const editor=html.match(/<form[^>]*class="panel editor-panel"[^>]*>([\s\S]*?)<\/form>/)?.[1]; assert(editor);
    const action=editor.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1]; assert(action);
    const form=new FormData();form.set(action,'');form.set('_revision',stale?'0'.repeat(64):data.revision);form.set('_returnTo','/admin?tab=headliners');
    form.set('id',state.artistId);form.set('isNew','0');form.set('years',artist.years.join(', '));
    for(const key of ['name','description','imageTint','imageUrl'])form.set(key,artist[key]||'');
    form.set('genresPresent','1');for(const genre of artist.genres||[])form.append('genres',genre);
    if(announce)form.set('_intent','announce-artist');
    return fetch(`${origin}/admin`,{method:'POST',body:form,headers:{Origin:origin,...(authenticated?{Cookie:cookie}:{})},redirect:'manual'});
  }
  try {
    if(process.argv.includes('--after-ui')) {
      const data=await current(),artist=data.headliners.find((item:{id:string})=>item.id===state.artistId);
      assert.deepEqual(artist.years,[state.year,2026]); assert.deepEqual(artist.genres,['Рок']);
      const rows=await broadcasts();assert.equal(rows.length,1);assert.equal(rows[0].audience,'all');
      assert(rows[0].body.includes(artist.name));assert.equal(getSafePushPath(rows[0].target_path),target);
      const stale=await submit({announce:true,stale:true});assert.equal(stale.status,303);assert(stale.headers.get('location')?.includes('error='));
      const duplicate=await submit({announce:true});assert.equal(duplicate.status,303);assert(duplicate.headers.get('location')?.includes('announcement='));
      assert.equal((await broadcasts()).length,1,'The real server action prevents duplicate broadcasts');
      console.log('Announcement HTTP: UI click saved the lineup and one all-audience broadcast with the artist deep link; stale and repeated requests sent nothing else.');
    } else {
      assert.equal((await broadcasts()).length,0);
      const unauthorized=await submit({authenticated:false,announce:true});assert.equal(unauthorized.status,303);assert(unauthorized.headers.get('location')?.includes('/admin/login'));
      const ordinary=await submit();assert.equal(ordinary.status,303);assert(ordinary.headers.get('location')?.includes('ok=1'));
      assert(!(await current()).headliners.find((item:{id:string})=>item.id===state.artistId).years.includes(state.year));
      assert.equal((await broadcasts()).length,0,'Ordinary Save/Enter must never announce an artist');
      console.log('Announcement HTTP: anonymous action rejected; ordinary Save preserves years and sends no push.');
    }
  } finally { await pool.end(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
