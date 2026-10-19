// Upload the CMS artwork to the dedicated VK app collection. Never use community avatars.
// VK_WIDGET_SERVICE_TOKEN must belong to app 54834082 and is never written to disk.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const appId = 54834082;
const token = process.env.VK_WIDGET_SERVICE_TOKEN;
const dataUrl = 'https://uletayapp.ru/api/data';
const manifestPath = new URL('../../shared/vk-widget-images.json', import.meta.url);
const encoding = 'jpeg-mozjpeg-q72-420-v1';
const onlyArtists = process.argv.slice(2);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function vk(method, params = {}) {
  const response = await fetch(`https://api.vk.com/method/${method}`, {
    method: 'POST',
    body: new URLSearchParams({ ...params, v: '5.199', access_token: token }),
    signal: AbortSignal.timeout(30000),
  });
  assert(response.ok, `VK API HTTP ${response.status}`);
  const result = await response.json();
  if (result.error) throw new Error(`${method}: VK error ${result.error.error_code}`);
  assert(result.response !== undefined, `${method}: missing VK response`);
  return result.response;
}

async function upload(source, imageType) {
  const size = imageType === '160x160' ? 480 : 150;
  // Matches the center crop of the site's square mobile cards; VK needs 3x resolution.
  const jpeg = await sharp(source).rotate().resize(size, size, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 72, mozjpeg: true, progressive: true, chromaSubsampling: '4:2:0' }).toBuffer();
  const server = await vk('appWidgets.getAppImageUploadServer', { image_type: imageType });
  const uploadUrl = new URL(server.upload_url);
  assert(uploadUrl.protocol === 'https:' && !uploadUrl.username && !uploadUrl.password &&
    (uploadUrl.hostname.endsWith('.vk.com') || uploadUrl.hostname.endsWith('.vk.ru')), 'Unexpected VK upload server');
  const form = new FormData();
  form.set('file', new Blob([jpeg], { type: 'image/jpeg' }), 'artist.jpg');
  const response = await fetch(uploadUrl, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
    redirect: 'error', signal: AbortSignal.timeout(45000),
  });
  assert(response.ok, `VK image upload HTTP ${response.status}`);
  const uploaded = await response.json();
  if (uploaded.error || !uploaded.hash) {
    // Never dump the full upload response: successful responses contain secrets.
    const errorCode = Number(uploaded.error?.error_code ?? uploaded.error_code);
    const message = String(uploaded.error_msg ?? '').replaceAll(token, '[redacted]').replace(/https?:\/\/\S+/g, '[url]').slice(0, 180);
    throw new Error(`VK image upload failed (code ${Number.isFinite(errorCode) ? errorCode : 'unknown'}${message ? `: ${message}` : ''})`);
  }
  const saved = await vk('appWidgets.saveAppImage', {
    image: Buffer.from(JSON.stringify(uploaded)).toString('base64'), hash: String(uploaded.hash),
  });
  assert(/^\d+_\d+$/.test(saved.id) && saved.type === imageType, 'VK saved an unexpected image');
  await pause(400);
  return { id: saved.id, bytes: jpeg.length };
}

async function main() {
  assert(token, 'Set VK_WIDGET_SERVICE_TOKEN to the dedicated app service key');
  const app = await vk('apps.get');
  assert.equal(app.items?.[0]?.id, appId, 'Service key belongs to a different VK app');
  let manifest = { appId, images: {} };
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  assert.equal(manifest.appId, appId);
  const response = await fetch(dataUrl, { signal: AbortSignal.timeout(30000) });
  assert(response.ok, `CMS HTTP ${response.status}`);
  const data = await response.json();
  const artists = data.headliners.filter((artist) => artist.years.includes(data.festival.year) &&
    (!onlyArtists.length || onlyArtists.includes(artist.id)));
  assert(artists.length && onlyArtists.every((id) => artists.some((artist) => artist.id === id)), 'Unknown current artist ID');
  for (const artist of artists) {
    if (!artist.imageUrl) continue;
    const sourceUrl = new URL(artist.imageUrl, dataUrl);
    assert(sourceUrl.origin === new URL(dataUrl).origin && sourceUrl.pathname.startsWith('/api/uploads/'), 'Artist image must come from this CMS');
    const image = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) });
    assert(image.ok && image.headers.get('content-type')?.startsWith('image/'), 'CMS artwork is unavailable');
    assert(Number(image.headers.get('content-length') || 0) <= 10 * 1024 * 1024, 'CMS artwork is too large');
    const bytes = Buffer.from(await image.arrayBuffer());
    assert(bytes.length <= 10 * 1024 * 1024, 'CMS artwork is too large');
    const sourceSha256 = createHash('sha256').update(bytes).digest('hex');
    const old = manifest.images[artist.id];
    const entry = old?.sourceUrl === sourceUrl.href && old.sourceSha256 === sourceSha256 && old.encoding === encoding
      ? old : { sourceUrl: sourceUrl.href, sourceSha256, encoding, uploadBytes: {} };
    for (const [layout, imageType] of [['tiles', '160x160'], ['compact_list', '50x50']]) {
      if (!entry[layout]) {
        const saved = await upload(bytes, imageType);
        entry[layout] = saved.id;
        entry.uploadBytes[layout] = saved.bytes;
      }
      manifest.images[artist.id] = entry;
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
    console.log(`${artist.name}: CMS artwork ready for tiles and compact list`);
  }
  console.log(`VK app ${appId}: ${artists.length} current artists processed. Manifest contains public image IDs only.`);
}

main().catch((error) => {
  console.error(String(error.message).replaceAll(token || '\0', '[redacted]'));
  process.exitCode = 1;
});
