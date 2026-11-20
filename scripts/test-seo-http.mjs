import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let server;
let origin=process.env.SEO_HTTP_ORIGIN || 'http://localhost:4174';
const decode=value=>value.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
const routeId=id=>encodeURIComponent(id.replaceAll('~','~7E').replaceAll('/','~2F').replaceAll('.','~2E'));
let requests=0;
async function get(pathname,headers={}) {
  requests++;
  const response=await fetch(new URL(pathname,origin),{redirect:'manual',headers,signal:AbortSignal.timeout(15000)});
  const body=await response.text();
  return {status:response.status,headers:response.headers,body};
}
try {
  if(process.argv.includes('--spawn-preview')) {
    server=spawn(process.execPath,['scripts/serve-local.mjs'],{cwd:root,windowsHide:true,env:{...process.env,PORT:'0',PREVIEW_API_ORIGIN:'http://127.0.0.1:3000'},stdio:['ignore','pipe','pipe']});
    origin=await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error('Preview did not start')),15000);
      server.once('error',error=>{clearTimeout(timeout);reject(error);});
      server.once('exit',code=>{clearTimeout(timeout);reject(Error(`Preview exited: ${code}`));});
      server.stdout.on('data',chunk=>{const match=String(chunk).match(/Local preview: (http:\/\/localhost:\d+)\//);if(match){clearTimeout(timeout);resolve(match[1]);}});
    });
  }
  const target=new URL(origin);
  assert(['localhost','127.0.0.1','[::1]'].includes(target.hostname)&&target.protocol==='http:','Only local previews may be crawled by this test');
  const sitemap=await get('/sitemap.xml');assert.equal(sitemap.status,200);assert.match(sitemap.headers.get('content-type'),/xml/);
  assert.match(sitemap.body,/<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  const urls=[...sitemap.body.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>decode(match[1]));
  assert(urls.length>0);assert.equal(new Set(urls).size,urls.length,'Duplicate sitemap URLs');
  const canonicalOrigin=new URL(urls[0]).origin;
  assert.equal(new URL(canonicalOrigin).protocol,'https:');
  for(const url of urls){const parsed=new URL(url);assert.equal(parsed.origin,canonicalOrigin);assert.equal(parsed.search+parsed.hash,'');}
  const dataResponse=await get('/api/data');assert.equal(dataResponse.status,200);
  const data=JSON.parse(dataResponse.body);
  let consolidatedAliases=0;
  for(const artist of data.headliners){
    const artistUrl=`${canonicalOrigin}/headliners/${routeId(artist.id)}`;
    if(urls.includes(artistUrl))continue;
    const alias=await get(new URL(artistUrl).pathname);assert.equal(alias.status,200,`Missing legacy artist page: ${artist.id}`);
    const canonical=decode(alias.body.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1]||'');
    assert(urls.includes(canonical),`Sitemap omits current catalog artist ${artist.id}`);consolidatedAliases++;
  }
  assert(urls.includes(`${canonicalOrigin}/wishes`));
  for(const pathname of ['/','/map','/schedule','/autographs','/foodcourt','/rules','/help',`/headliners/${data.festival.year}`])assert(urls.includes(canonicalOrigin+pathname),`Missing public section: ${pathname}`);
  const titles=new Set(),assets=new Set(),links=new Set();let cursor=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(cursor<urls.length){
      const url=urls[cursor++],pathname=new URL(url).pathname;
      const page=await get(pathname,{'User-Agent':'Googlebot'});
      assert.equal(page.status,200,pathname);assert.match(page.headers.get('content-type'),/text\/html/);
      assert(!/noindex/i.test(page.headers.get('x-robots-tag')||''),`${pathname} has a blocking response header`);
      const title=page.body.match(/<title>(.*?)<\/title>/i)?.[1];assert(title,`${pathname}: missing title`);
      assert(!titles.has(title),`Duplicate title: ${title}`);titles.add(title);
      assert.equal((page.body.match(/<h1\b/gi)||[]).length,1,`${pathname}: expected one static H1`);
      const canonical=page.body.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];assert.equal(decode(canonical||''),url,`${pathname}: static canonical`);
      const robots=page.body.match(/<meta\s+name="robots"\s+content="([^"]+)"/i)?.[1];assert.equal(robots,'index, follow',pathname);
      const description=page.body.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1];assert(description,`${pathname}: missing description`);
      const graph=JSON.parse(page.body.match(/<script\b[^>]*id="seo-jsonld"[^>]*>([\s\S]*?)<\/script>/i)?.[1]||'null')?.['@graph'];assert(Array.isArray(graph),pathname);
      assert.equal(graph.find(node=>node['@type']==='WebPage')?.url,url,`${pathname}: structured URL`);
      assert(!/http:\/\/(?:localhost|127\.0\.0\.1)/i.test(JSON.stringify(graph)),`${pathname}: local URL leaked into schema`);
      for(const match of page.body.matchAll(/<a\b[^>]*href="([^"]+)"/gi)){
        const link=new URL(decode(match[1]),url);if(link.origin===canonicalOrigin)links.add(link.pathname);
      }
      for(const match of page.body.matchAll(/<(?:script|img)\b[^>]*src="([^"]+)"/gi)){
        const asset=new URL(decode(match[1]),url);if(asset.origin===canonicalOrigin)assets.add(asset.pathname);
      }
    }
  }));
  for(const url of urls)assert(links.has(new URL(url).pathname),`Orphan sitemap page: ${url}`);
  for(const pathname of links){const result=await get(pathname);assert([200,301,302,307,308].includes(result.status),`Broken internal HTML link: ${pathname} (${result.status})`);}
  for(const pathname of assets){const result=await get(pathname);assert.equal(result.status,200,`Missing static asset ${pathname}`);assert(!/text\/html/.test(result.headers.get('content-type')||''),`Asset fell back to HTML: ${pathname}`);}
  for(const pathname of ['/chat','/settings','/favorites','/schedule/full']){
    assert(!urls.includes(canonicalOrigin+pathname));const page=await get(pathname);assert.equal(page.status,200);assert.match(page.body,/<meta name="robots" content="noindex, nofollow"/);
    assert(page.body.includes(`href="${canonicalOrigin+pathname}"`),`${pathname} has its own canonical`);
  }
  for(const pathname of ['/missing-seo-qa-page','/assets/missing-seo-qa.png','/headliners/missing-seo-qa.js'])assert.equal((await get(pathname)).status,404,pathname);
  for(const pathname of ['/wishes','/chat',new URL(urls.find(url=>/\/headliners\/hl-/.test(url))).pathname]){
    const redirect=await get(pathname+'/');assert.equal(redirect.status,301);assert.equal(redirect.headers.get('location'),pathname);
    const query=await get(pathname+'?utm_source=qa');assert.equal(query.status,200);assert(query.body.includes(`href="${canonicalOrigin+pathname}"`));
  }
  const alias=await get('/headliners');assert.equal(alias.status,301);assert.equal(alias.headers.get('location'),`/headliners/${data.festival.year}`);
  const robots=await get('/robots.txt');assert.equal(robots.status,200);assert(robots.body.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`));assert(!/^Disallow:\s*\/$/m.test(robots.body));assert.match(robots.body,/^Allow: \/api\/uploads\/$/m,'Public artist images must be crawlable');
  const report={sitemapUrls:urls.length,catalogArtists:data.headliners.length,consolidatedAliases,internalLinks:links.size,assets:assets.size,requests,uniqueTitles:titles.size,canonicalOrigin,passed:true};
  if(process.env.SEO_HTTP_REPORT)await writeFile(process.env.SEO_HTTP_REPORT,JSON.stringify(report,null,2)+'\n');
  console.log('SEO HTTP crawl:',JSON.stringify(report));
}finally{
  if(server&&server.exitCode===null){server.kill();await new Promise(resolve=>server.once('exit',resolve));}
}
