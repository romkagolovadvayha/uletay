const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('C:/Users/rom_i/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = process.cwd();
const dist = path.join(root, 'tmp/audit-web-20260909');
const out = path.join(root, 'artifacts/project-audit-2026-09-09');
const seed = fs.readFileSync(path.join(root, 'cms/seed/content.json'));
const mime = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.css':'text/css', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.ttf':'font/ttf', '.webm':'video/webm' };
function contentFor(url) {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  if (pathname === '/__audit__/blank') return { type:'text/html', data:Buffer.from('<!doctype html><title>Isolated worker audit</title><p>Audit fixture</p>') };
  if (pathname === '/api/data') return { type:'application/json', data:seed };
  let base = dist;
  let relative = pathname;
  if (pathname.startsWith('/api/uploads/')) { base = path.join(root,'uploads'); relative = pathname.slice('/api/uploads'.length); }
  if (pathname.startsWith('/api/fest-assets/')) { base = path.join(root,'assets'); relative = pathname.slice('/api/fest-assets'.length); }
  let file = path.resolve(base, '.' + relative);
  if (file !== base && !file.startsWith(base + path.sep)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
  if (!fs.existsSync(file)) {
    if (path.extname(pathname) || pathname.startsWith('/api/')) return null;
    file = path.join(dist,'index.html');
  }
  return {type:mime[path.extname(file)] || 'application/octet-stream',data:fs.readFileSync(file)};
}
const server = http.createServer((req,res) => {
  try {
    const item = contentFor(req.url);
    if (!item) return res.writeHead(404).end('Not found');
    res.writeHead(200, {'Content-Type':item.type,'Cache-Control':'no-store','Service-Worker-Allowed':'/'}).end(item.data);
  } catch { res.writeHead(500).end('Fixture error'); }
});
const report = { screenshots:[], pages:[], worker:{}, cacheReset:{}, offlineLazy:{} };
let browser;
async function inspectPage(page,label) {
  const file = path.join(out, `${label}.png`);
  await page.screenshot({path:file,fullPage:false});
  const info = await page.evaluate(() => ({
    url:location.href,title:document.title,width:innerWidth,
    horizontalOverflow:document.documentElement.scrollWidth > innerWidth,
    text:document.body.innerText.slice(0,1500),
    controls:[...document.querySelectorAll('button,[role="button"],[role="tab"],a')].filter(el=>el.getBoundingClientRect().width>0).map(el=>({role:el.getAttribute('role')||el.tagName, label:el.getAttribute('aria-label')||el.textContent?.trim(),href:el.getAttribute('href')})).slice(-35),
  }));
  report.pages.push({label,...info});report.screenshots.push(file);
}
(async()=>{
  await fsp.mkdir(out,{recursive:true});
  await new Promise(resolve=>server.listen(4394,'127.0.0.1',resolve));
  try {
    browser = await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-proxy-server']});
    const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,locale:'ru-RU',reducedMotion:'reduce'});
    await context.route('**/*',async route=>{
      const url = new URL(route.request().url());
      if (/googletagmanager|google-analytics|mc\.yandex/.test(url.hostname)) return route.abort();
      if (url.hostname === 'uletayapp.ru' && url.pathname.startsWith('/api/')) {
        const item=contentFor(url.href);
        return route.fulfill({status:item?200:404,contentType:item?.type||'text/plain',body:item?.data||'Not found'});
      }
      return route.continue();
    });
    const page = await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:4394/',{waitUntil:'networkidle'});
    await inspectPage(page,'home-mobile');
    await page.goto('http://localhost:4394/settings',{waitUntil:'networkidle'});
    await inspectPage(page,'settings-mobile');
    let dialogs=0;page.on('dialog',async d=>{dialogs++;await d.dismiss()});
    const reset=page.getByRole('button',{name:/Сбросить кэш/});
    report.cacheReset.buttonCount=await reset.count();
    if(await reset.count()){
      await reset.first().click();
      report.cacheReset.dialogs=dialogs;
      report.cacheReset.visibleConfirmation=await page.getByText('Отмена',{exact:true}).count();
    }
    await page.goto('http://localhost:4394/headliners',{waitUntil:'networkidle'});
    await inspectPage(page,'headliners-mobile');
    await page.setViewportSize({width:1440,height:1000});
    await page.goto('http://localhost:4394/',{waitUntil:'networkidle'});
    await inspectPage(page,'home-desktop');
    const scheduleLink=page.getByRole('link',{name:'Расписание',exact:true});
    await scheduleLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    report.scheduleLink={url:page.url(),text:(await page.locator('body').innerText()).slice(0,750)};
    report.appErrors=errors;

    const offlineContext=await browser.newContext({viewport:{width:390,height:844},locale:'ru-RU',reducedMotion:'reduce'});
    await offlineContext.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if (/googletagmanager|google-analytics|mc\.yandex/.test(url.hostname)) return route.abort();
      if (url.hostname==='uletayapp.ru' && url.pathname.startsWith('/api/')) {
        const item=contentFor(url.href);
        return route.fulfill({status:item?200:404,contentType:item?.type||'text/plain',body:item?.data||'Not found'});
      }
      return route.continue();
    });
    const offlinePage=await offlineContext.newPage();
    const offlineErrors=[];offlinePage.on('pageerror',e=>offlineErrors.push(e.message));
    await offlinePage.goto('http://audit.localhost:4394/__audit__/blank');
    await offlinePage.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js',{scope:'/'});await navigator.serviceWorker.ready});
    await offlinePage.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/sw.js'));
    await offlinePage.goto('http://audit.localhost:4394/',{waitUntil:'networkidle'});
    await offlinePage.waitForLoadState('networkidle');
    report.offlineLazy.worker=await offlinePage.evaluate(()=>navigator.serviceWorker.controller?.scriptURL);
    await offlineContext.setOffline(true);
    await offlinePage.getByRole('link',{name:'Правила',exact:true}).click();
    await offlinePage.waitForFunction(()=>document.body.innerText.length===0,{},{timeout:5000}).catch(()=>{});
    report.offlineLazy.url=offlinePage.url();
    report.offlineLazy.errors=offlineErrors;
    report.offlineLazy.remainingText=(await offlinePage.locator('body').innerText()).slice(0,500);
    await offlinePage.screenshot({path:path.join(out,'rules-offline-mobile.png')});
    await offlineContext.close();

    const swContext=await browser.newContext();
    const swPage=await swContext.newPage();
    await swPage.goto('http://audit.localhost:4394/__audit__/blank');
    report.worker.secureContext=await swPage.evaluate(()=>isSecureContext);
    await swPage.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js',{scope:'/'});await navigator.serviceWorker.ready});
    await swPage.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/sw.js'));
    await swPage.evaluate(()=>fetch('/api/data').then(r=>r.json()));
    await swContext.setOffline(true);
    report.worker.offlineBeforePush=await swPage.evaluate(()=>fetch('/api/data').then(r=>r.ok).catch(()=>false));
    await swContext.setOffline(false);
    await swPage.evaluate(()=>navigator.serviceWorker.register('/push-sw.js',{scope:'/'}));
    await swPage.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/push-sw.js'));
    report.worker.registrations=await swPage.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,active:r.active?.scriptURL})));
    await swContext.setOffline(true);
    report.worker.offlineAfterPush=await swPage.evaluate(()=>fetch('/api/data').then(r=>r.ok).catch(()=>false));
    await swContext.close();
    await context.close();
  } catch(error) { report.error=String(error.stack||error);process.exitCode=1; }
  finally {
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
    await fsp.writeFile(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  }
})();
