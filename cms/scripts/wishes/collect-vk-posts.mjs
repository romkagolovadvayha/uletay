import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../../../',import.meta.url)));
import {readFile,writeFile} from 'node:fs/promises';
const token=process.env.VK_SERVICE_TOKEN?.trim()||(await readFile(process.env.VK_TOKEN_FILE||'tmp/vk-user-token.txt','utf8')).replace(/^\uFEFF/,'').trim();
const pause=()=>new Promise(r=>setTimeout(r,360));
async function vk(method,args){if(!['wall.get','wall.getComments','groups.getById'].includes(method))throw Error('Read-only API only');await pause();const r=await fetch('https://api.vk.com/method/'+method,{method:'POST',body:new URLSearchParams({...args,access_token:token,v:'5.199'}),signal:AbortSignal.timeout(25000)});const data=await r.json();if(data.error)throw Error(`VK API ${method}: ${data.error.error_code}`);return data.response;}
const cutoff=Date.parse('2026-07-12T00:00:00Z')/1000;const posts=new Map();let scanned=0;for(let offset=0;offset<5000;offset+=100){const p=await vk('wall.get',{domain:'uletayfest',filter:'owner',count:'100',offset:String(offset)});if(!p.items?.length)break;for(const item of p.items)if(item.owner_id===-10571147&&item.date>=cutoff)posts.set(item.id,item);scanned+=p.items.length;if(Math.min(...p.items.map(x=>x.date))<cutoff)break;}
await writeFile('artifacts/artist-wishes-2026-11-20/vk-posts-2027-cycle.json',JSON.stringify({scanned,cutoff,posts:[...posts.values()]},null,2));
const surveys=[...posts.values()].filter(p=>/кого.{0,70}(?:хот|жд|вид)|мечт.{0,60}(?:состав|лайн)|хотел.{0,40}увид/isu.test(p.text));
console.log(JSON.stringify({scanned,cyclePosts:posts.size,surveys:surveys.map(p=>({id:p.id,date:new Date(p.date*1000).toISOString().slice(0,10),comments:p.comments?.count,text:p.text.slice(0,700)}))},null,2));
