const html = await fetch('https://uletayfest.ru/').then((r) => r.text());

const start = html.indexOf('Участники 2026');
const end = html.indexOf('РАСПИСАНИЕ', start + 20);
const block = html.slice(start, end);

// Ordered unique participant image URLs (preserve first occurrence order)
const seen = new Set();
const ordered = [];
for (const m of block.matchAll(/data-original=["'](https:\/\/static\.tildacdn\.com\/[^"']+\.(?:png|jpg|jpeg|webp))["']/gi)) {
  const url = m[1];
  if (!seen.has(url)) {
    seen.add(url);
    ordered.push(url);
  }
}

const skipFiles = new Set([
  '_-1.png', '_260x100.png', 'Uchastniki_konkursno.png', '__11.png', '__33.png', '__55.png',
]);

const artistImages = ordered.filter((url) => {
  const file = url.split('/').pop() ?? '';
  if (skipFiles.has(file)) return false;
  if (file === 'photo.png') return true;
  if (/\.(jpg|jpeg|webp)$/i.test(file)) return true;
  if (/[A-Za-z]{3,}/.test(file.replace(/\.[^.]+$/, ''))) return true;
  if (file === '7000.png' || file === '7.png' || file === '1.png' || file === '_1.png') return true;
  return false;
});

console.log('artist-like images:', artistImages.length);
artistImages.forEach((url, i) => console.log(String(i + 1).padStart(3), url.split('/').pop(), url));
