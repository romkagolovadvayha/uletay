import './load-env';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import mysql,{type RowDataPacket,type ResultSetHeader} from 'mysql2/promise';
import {formatTemperature,isFestivalWeather,parseCurrentWeather,weatherDescription} from '../../shared/festival-weather';
import {safeNotificationPath} from '../../shared/notification-feed';

async function main(){
  if(process.env.DB_NAME!=='uletay_web_design'||String(process.env.DB_PORT)!=='3352')throw Error('Dashboard tests require isolated local uletay_web_design:3352');
  const origin=process.env.DASHBOARD_TEST_ORIGIN||'http://localhost:4174';if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Local test origin required');
  const connection=await mysql.createConnection({host:'127.0.0.1',port:3352,user:'root',database:'uletay_web_design'});
  const fixtureFile=path.resolve(__dirname,'../../tmp/dashboard-ui-fixture.json');let author=0;let keep=false;const ids:number[]=[];
  async function cleanup(userId:number){await connection.execute('DELETE FROM push_broadcasts WHERE created_by=?',[userId]);await connection.execute('DELETE FROM admin_users WHERE id=? AND username LIKE ?',[userId,'qa-dashboard-%']);}
  try{
    if(process.argv.includes('--cleanup-ui')){const fixture=JSON.parse(await readFile(fixtureFile,'utf8'));await cleanup(fixture.author);await unlink(fixtureFile);console.log('Dashboard UI fixtures removed');return;}
    assert.equal(formatTemperature(-.1),'0°');assert.equal(formatTemperature(1.4),'+1°');assert.equal(formatTemperature(-12.6),'-13°');
    assert.equal(weatherDescription(0,false).label,'Ясная ночь');assert.equal(weatherDescription(71).kind,'snow');assert.equal(weatherDescription(63).kind,'rain');assert.equal(weatherDescription(96).kind,'thunder');assert.equal(weatherDescription(48).kind,'fog');
    assert.throws(()=>parseCurrentWeather({current:{temperature_2m:null}},56,53));
    assert.throws(()=>parseCurrentWeather({current:{temperature_2m:0,apparent_temperature:0,wind_speed_10m:0,weather_code:3,is_day:1,time:1}},56,53));
    for(const url of ['https://evil.invalid','//evil.invalid','/admin','/api/data','/headliners/%00test','/headliners/%5ctest'])assert.equal(safeNotificationPath(url),'/');
    assert.equal(safeNotificationPath('/schedule/live/test?day=1'),'/schedule/live/test?day=1');
    const weather=await (await fetch(origin+'/api/weather')).json();assert.ok(isFestivalWeather(weather));assert.ok(Date.now()-Date.parse(weather.observedAt)<3*60*60*1000);
    const cached=await (await fetch(origin+'/api/weather')).json();assert.equal(cached.fetchedAt,weather.fetchedAt,'Weather responses share the provider cache');
    const tag=`qa-dashboard-${Date.now()}`;
    const [user]=await connection.execute<ResultSetHeader>("INSERT INTO admin_users(username,password_hash,display_name,role,is_active) VALUES (?,'disabled-test-account','Локальная проверка','admin',FALSE)",[tag]);author=user.insertId;
    async function add(audience:string,title:string,body:string,target:string){const [result]=await connection.execute<ResultSetHeader>('INSERT INTO push_broadcasts(title,body,target_path,audience,created_by,error_message) VALUES (?,?,?,?,?,?)',[title,body,target,audience,author,'private-delivery-detail']);ids.push(result.insertId);return result.insertId;}
    await add('all','Фестиваль становится ближе','Проверка уведомлений: новости открываются отдельной лентой.','/headliners');
    await add('web','Построй свой маршрут','Карта площадки, сцены и любимые места — всё под рукой.','/map');
    await add('native','Private native test',tag+'-native','/');
    await add('all','Проверка безопасной ссылки',tag+' plain <script>text</script>','//evil.invalid');
    const response=await fetch(origin+'/api/notifications');assert.equal(response.status,200);const feed=await response.json();assert.ok(Array.isArray(feed.items));
    const rows=feed.items.filter((item:{id:string})=>ids.some(id=>item.id===`news-${id}`));assert.equal(rows.length,3);
    assert.ok(rows.every((row:Record<string,unknown>)=>Object.keys(row).sort().join(',')==='body,createdAt,id,title,url'));assert.ok(!JSON.stringify(feed).includes('private-delivery-detail'));assert.ok(!JSON.stringify(feed).includes(tag+'-native'));
    assert.equal(rows.find((row:{title:string})=>row.title==='Проверка безопасной ссылки').url,'/');
    if(process.argv.includes('--prepare-ui')){await writeFile(fixtureFile,JSON.stringify({author,ids,tag}));keep=true;}
    const [count]=await connection.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM admin_users WHERE id=? AND is_active=FALSE',[author]);assert.equal(Number(count[0].total),1);
    console.log('Dashboard HTTP: live/cached weather, WMO icons, stale rejection, public announcements, audience isolation, private-field exclusion and safe links OK');
  }finally{if(author&&!keep)await cleanup(author);await connection.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
