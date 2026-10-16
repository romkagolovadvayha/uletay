import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { publicImageResponse } from '../src/lib/public-images';

async function main() {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'uletay-public-images-'));
  try {
    const root = path.join(temporary, 'images');
    await mkdir(root);
    await writeFile(path.join(root, 'photo.webp'), 'test-image');
    await writeFile(path.join(root, 'private.json'), '{"private":true}');
    await writeFile(path.join(temporary, 'outside.webp'), 'private-image');
    const good = await publicImageResponse(root, ['photo.webp']);
    assert.equal(good.status, 200);
    assert.equal(good.headers.get('content-type'), 'image/webp');
    assert.equal(good.headers.get('x-content-type-options'), 'nosniff');
    for (const segments of [
      [],
      ['missing.webp'],
      ['private.json'],
      ['..', 'outside.webp'],
      ['../outside.webp'],
      ['..\\outside.webp'],
      ['C:photo.webp'],
      ['photo.webp\0'],
    ]) {
      assert.equal(
        (await publicImageResponse(root, segments)).status,
        404,
        JSON.stringify(segments),
      );
    }
    console.log('Public images: MIME allowlist, missing files and path traversal passed.');
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
