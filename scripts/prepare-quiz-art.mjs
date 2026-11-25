import { readFile, writeFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';

// Packaging only: slice the ImageGen transparent sprite sheets, keep alpha,
// and encode local WebPs. No synthesized/removal of image backgrounds here.
const manifest = JSON.parse((await readFile(process.argv[2] ?? 'tmp/quiz-art-manifest.json', 'utf8')).replace(/^\uFEFF/, ''));
await mkdir('assets/quiz', { recursive: true });
const musicianCells = new Map([[35, 0], [26, 1], [27, 2], [28, 3], [33, 4], [38, 5], [39, 6], [40, 7], [24, 8]]);
for (let art = 1; art <= 51; art++) {
  const cell = musicianCells.get(art) ?? ((art - 1) % 9);
  const portrait = manifest.portraits?.[art];
  const source = portrait ?? (musicianCells.has(art) ? manifest.musicians : manifest.sheets[Math.floor((art - 1) / 9)]);
  const { width, height, hasAlpha } = await sharp(source).metadata();
  if (!hasAlpha) throw new Error(`Sprite sheet needs transparent alpha: ${source}`);
  if (portrait) {
    await sharp(source).resize(600, 600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88, alphaQuality: 100 }).toFile(`assets/quiz/${String(art).padStart(2, '0')}.webp`);
    continue;
  }
  const left = Math.round((cell % 3) * width / 3);
  const top = Math.round(Math.floor(cell / 3) * height / 3);
  const right = Math.round(((cell % 3) + 1) * width / 3);
  const bottom = Math.round((Math.floor(cell / 3) + 1) * height / 3);
  await sharp(source).extract({ left, top, width: right - left, height: bottom - top }).resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 100 }).toFile(`assets/quiz/${String(art).padStart(2, '0')}.webp`);
}
await sharp(manifest.hero).resize(1100, null, { withoutEnlargement: true }).webp({ quality: 84 }).toFile('assets/quiz/hero.webp');
const mapping = Array.from({ length: 51 }, (_, i) => `  ${i + 1}: require('../../assets/quiz/${String(i + 1).padStart(2, '0')}.webp'),`).join('\n');
await writeFile('src/data/quizArtwork.ts', `// Local generated illustrations: bundled on every platform, alpha preserved.\nexport const quizArtwork: Record<number, number> = {\n${mapping}\n};\nexport const quizHero = require('../../assets/quiz/hero.webp');\n`);
console.log('Prepared 50 question illustrations, victory trophy and welcome artwork.');
