import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const distDir = join(root, process.env.DIST_DIR ?? 'dist');
const indexPath = join(distDir, 'index.html');

const YANDEX_METRIKA_ID =
  process.env.EXPO_PUBLIC_YANDEX_METRIKA_ID ?? '111346786';
const GOOGLE_TAG_ID =
  process.env.EXPO_PUBLIC_GOOGLE_TAG_ID ?? 'G-CZN6F69VG0';

// This is only the pre-generator shell fallback. generate-web-seo.ts replaces
// it with the live festival year for every prerendered route.
const SITE_NAME = 'УЛЕТАЙ 2027';
const HOME_TITLE = `Приложение фестиваля — ${SITE_NAME}`;
const DESCRIPTION =
  'Приложение фестиваля УЛЕТАЙ в Лагуново, Удмуртия: расписание концертов, карта площадки, автограф-сессии, фудкорт и радио в эфире.';
const SITE_URL = (() => {
  const raw = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://uletayapp.ru';
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.slice(4);
    }
    return parsed.origin;
  } catch {
    return raw.replace(/\/$/, '');
  }
})();
const SOCIAL_IMAGE_URL = `${SITE_URL.replace(/\/$/, '')}/hero-video-poster.webp`;

function copyPublicFiles() {
  if (!existsSync(publicDir)) {
    return;
  }

  for (const entry of readdirSync(publicDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    copyFileSync(join(publicDir, entry.name), join(distDir, entry.name));
  }
}

function analyticsMarkup() {
  if (!/^\d+$/.test(YANDEX_METRIKA_ID)) {
    throw new Error('EXPO_PUBLIC_YANDEX_METRIKA_ID must contain digits only');
  }
  if (!/^(?:G|GT)-[A-Z0-9]+$/.test(GOOGLE_TAG_ID)) {
    throw new Error('EXPO_PUBLIC_GOOGLE_TAG_ID must be a valid Google tag ID');
  }

  return {
    head: `  <!-- Analytics queues are available immediately; vendor scripts load after first paint. -->
  <script>
    (function(){
    if(['localhost','127.0.0.1','::1'].includes(window.location.hostname)){return;}
    window.dataLayer = window.dataLayer || [];
    window.gtag=function(){window.dataLayer.push(arguments);};
    window.gtag('js', new Date());
    window.gtag('config', '${GOOGLE_TAG_ID}', {send_page_view:false});

    (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
    })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_ID}','ym');

    window.ym(${YANDEX_METRIKA_ID},'init',{ssr:true,clickmap:true,ecommerce:'dataLayer',referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true,defer:true});

    (function(){
      var load=function(){
        if(!document.querySelector('script[data-analytics="google"]')){
          var g=document.createElement('script');
          g.async=true;g.dataset.analytics='google';
          g.src='https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}';
          document.head.appendChild(g);
        }
        if(!document.querySelector('script[data-analytics="yandex"]')){
          var y=document.createElement('script');
          y.async=true;y.dataset.analytics='yandex';
          y.src='https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_ID}';
          document.head.appendChild(y);
        }
      };
      var schedule=function(){
        // Keep analytics outside the critical rendering window, while still
        // starting immediately when the visitor interacts with the page.
        var timer=window.setTimeout(load,3500);
        var events=['pointerdown','keydown','touchstart'];
        var interact=function(){
          window.clearTimeout(timer);
          events.forEach(function(event){window.removeEventListener(event,interact);});
          load();
        };
        events.forEach(function(event){window.addEventListener(event,interact,{once:true,passive:true});});
      };
      if(document.readyState==='complete'){schedule();}
      else{window.addEventListener('load',schedule,{once:true});}
    })();
    })();
  </script>
  <!-- /Yandex.Metrika counter -->`,
    body: `  <noscript><div><img src="https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>`,
  };
}

function patchIndexHtml() {
  if (!existsSync(indexPath)) {
    console.warn('copy-public-static: dist/index.html not found, skipping head patch');
    return;
  }

  let html = readFileSync(indexPath, 'utf8');
  const analytics = analyticsMarkup();

  if (!html.includes('googletagmanager.com/gtag/js')) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>\n${analytics.head}`);
  }
  if (!html.includes(`mc.yandex.ru/watch/${YANDEX_METRIKA_ID}`)) {
    html = html.replace(/<body([^>]*)>/i, `<body$1>\n${analytics.body}`);
  }
  const seoBlock = `
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="preload" as="image" href="/hero-video-poster.webp" fetchpriority="high" />
  <meta name="description" content="${DESCRIPTION}" />
  <meta name="keywords" content="УЛЕТАЙ, фестиваль, Лагуново, Удмуртия, расписание, карта, концерты" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${SITE_URL}/" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${HOME_TITLE}" />
  <meta property="og:description" content="${DESCRIPTION}" />
  <meta property="og:url" content="${SITE_URL}/" />
  <meta property="og:locale" content="ru_RU" />
  <meta property="og:image" content="${SOCIAL_IMAGE_URL}" />
  <meta property="og:image:width" content="1024" />
  <meta property="og:image:height" content="576" />
  <meta property="og:image:alt" content="${SITE_NAME} — фестиваль в Удмуртии" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${HOME_TITLE}" />
  <meta name="twitter:description" content="${DESCRIPTION}" />
  <meta name="twitter:image" content="${SOCIAL_IMAGE_URL}" />`;

  if (!html.includes('name="description"')) {
    html = html.replace('</head>', `${seoBlock}\n</head>`);
  }

  if (!html.includes('rel="manifest"')) {
    html = html.replace('</head>', '  <link rel="manifest" href="/manifest.webmanifest" />\n</head>');
  }

  if (!html.includes('<title>')) {
    html = html.replace('<head>', `<head>\n  <title>${HOME_TITLE}</title>`);
  } else {
    html = html.replace(/<title>.*?<\/title>/, `<title>${HOME_TITLE}</title>`);
  }

  html = html.replace(/<html(?:\s+lang="[^"]*")?>/, '<html lang="ru">');

  html = html.replace(
    /name="viewport" content="[^"]*"/,
    'name="viewport" content="width=device-width, initial-scale=1"',
  );

  // Match app shell so the first paint is black, not a white blank page.
  if (!html.includes('id="app-boot-style"')) {
    html = html.replace(
      '</head>',
      '  <style id="app-boot-style">html,body{overflow:hidden;overflow:clip}body{position:fixed;inset:0;width:100%}html,body,#root{background:#000;margin:0;min-height:100%}</style>\n</head>',
    );
  }

  // Landmark for screen readers / a11y audits (Expo template uses <div id="root">).
  html = html.replace(
    /<div(\s+id="root"[^>]*)>([\s\S]*?)<\/div>(\s*<\/body>)/,
    '<main$1>$2</main>$3',
  );

  writeFileSync(indexPath, html, 'utf8');
}

function patchSitemap() {
  const sitemapPath = join(distDir, 'sitemap.xml');
  if (!existsSync(sitemapPath)) {
    return;
  }

  const siteUrl = SITE_URL.replace(/\/$/, '');
  const xml = readFileSync(sitemapPath, 'utf8').replaceAll('https://uletayapp.ru', siteUrl);
  writeFileSync(sitemapPath, xml, 'utf8');
}

function patchRobots() {
  const robotsPath = join(distDir, 'robots.txt');
  if (!existsSync(robotsPath)) {
    return;
  }

  const siteUrl = SITE_URL.replace(/\/$/, '');
  const robots = readFileSync(robotsPath, 'utf8').replaceAll('https://uletayapp.ru', siteUrl);
  writeFileSync(robotsPath, robots, 'utf8');
}

if (!existsSync(distDir)) {
  console.error('copy-public-static: dist/ does not exist — run expo export first');
  process.exit(1);
}

copyPublicFiles();
patchIndexHtml();
patchSitemap();
patchRobots();
console.log('copy-public-static: robots.txt, sitemap.xml and SEO head tags updated');
