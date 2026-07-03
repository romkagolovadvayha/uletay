const html = await fetch('https://uletayfest.ru/').then((r) => r.text());

const recId = '904358326';
const marker = `id="rec${recId}"`;
const start = html.indexOf(marker);
const end = html.indexOf('id="rec', start + marker.length);
const block = html.slice(start, end);

// zoom gallery items
const zoom = [...block.matchAll(/t-zoom__item[\s\S]*?(?=t-zoom__item|$)/gi)];
console.log('zoom items', zoom.length);

// links with href
const links = [...block.matchAll(/<a[^>]+href=['"]([^'"]+)['"][^>]*>[\s\S]*?data-original=['"](https:\/\/static\.tildacdn\.com\/[^'"]+)['"]/gi)];
console.log('links with images', links.length);
links.slice(0, 10).forEach((m) => console.log(m[1], m[2].split('/').pop()));

// aria-label on elements with images
const aria = [...block.matchAll(/aria-label=['"]([^'"]+)['"][\s\S]{0,500}?data-original=['"](https:\/\/static\.tildacdn\.com\/[^'"]+)['"]/gi)];
console.log('aria maps', aria.length);
aria.slice(0, 20).forEach((m) => console.log(m[1], '->', m[2].split('/').pop()));

// title attribute
const titles = [...block.matchAll(/title=['"]([^'"]+)['"][\s\S]{0,500}?data-original=['"](https:\/\/static\.tildacdn\.com\/[^'"]+)['"]/gi)];
console.log('title maps', titles.length);
titles.slice(0, 20).forEach((m) => console.log(m[1], '->', m[2].split('/').pop()));
