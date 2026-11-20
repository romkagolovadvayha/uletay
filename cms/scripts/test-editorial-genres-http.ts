import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

async function main(){
 if(process.env.DB_NAME!=='uletay_web_design'||process.env.DB_PORT!=='3352')throw Error('Isolated preview required');
 const state=JSON.parse(await readFile(join(tmpdir(),'uletay-artist-admin-qa.json'),'utf8'));
 const origin='http://127.0.0.1:3000',id='hl-мураками',cookie=`uletay_admin=${state.cookie}`;
 async function current(){const p=await(await fetch(`${origin}/api/data`)).json();return p.data||p;}
 async function save(genres:string[]){
  const data=await current(),artist=data.headliners.find((a:{id:string})=>a.id===id);
  const html=await(await fetch(`${origin}/admin?tab=headliners&edit=${encodeURIComponent(id)}`,{headers:{Cookie:cookie}})).text();
  const editor=html.match(/<form[^>]*class="panel editor-panel"[^>]*>([\s\S]*?)<\/form>/)?.[1];assert.ok(editor);
  const action=editor.match(/name="(\$ACTION_ID_[^"]+)"/);assert.ok(action);
  const form=new FormData();form.set(action[1],'');form.set('_revision',data.revision);form.set('_returnTo','/admin?tab=headliners');form.set('isNew','0');form.set('id',id);
  for(const key of ['name','description','imageTint','imageUrl','vkSubtitle','vkMusicUrl'])form.set(key,artist[key]||'');
  form.set('years',artist.years.join(', '));form.set('alternateNames',(artist.alternateNames||[]).join('\n'));for(const linked of artist.linkedHeadlinerIds||[])form.append('linkedHeadlinerIds',linked);
  form.set('genresPresent','1');for(const genre of genres)form.append('genres',genre);
  const response=await fetch(`${origin}/admin`,{method:'POST',body:form,headers:{Origin:origin,Cookie:cookie},redirect:'manual'});
  assert.equal(response.status,303);assert.ok(response.headers.get('location')?.includes('ok=1'));
  assert.deepEqual((await current()).headliners.find((a:{id:string})=>a.id===id).genres,genres);
 }
 const original=(await current()).headliners.find((a:{id:string})=>a.id===id).genres;
 try{await save(['Рок','Поп-рок']);await save([]);console.log('Admin HTTP: manual genres are saved and can be cleared via the real editor server action.');}
 finally{await save(original);console.log('Original artist genres restored.');}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
