// Encodes the source plates in art/ into the served files in public/scenes/.
// Run after adding or re-cropping a plate:  npm run encode [-- name ...]
//
// Each plate gets AVIF + a grayscale mozjpeg fallback, at full size and at SMALL_W for phones.
// (WebP was tried and came out larger than JPEG on this kind of fine hatching.)
// Avoid denoising: it smears the engraved lines, which are the whole look.
import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'art';
const OUT = 'public/scenes';
const FULL_W = 2048;
const SMALL_W = 1280;

const variants = [
  { suffix: '', width: FULL_W, ext: 'avif', enc: (i) => i.avif({ quality: 45, effort: 6 }) },
  { suffix: '', width: FULL_W, ext: 'jpg', enc: (i) => i.jpeg({ quality: 72, mozjpeg: true }) },
  { suffix: `-${SMALL_W}`, width: SMALL_W, ext: 'avif', enc: (i) => i.avif({ quality: 50, effort: 6 }) },
  { suffix: `-${SMALL_W}`, width: SMALL_W, ext: 'jpg', enc: (i) => i.jpeg({ quality: 80, mozjpeg: true }) },
];

const only = process.argv.slice(2);
await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png|tiff?)$/i.test(f));
const totals = {};
let source = 0;
for (const f of files) {
  const name = path.parse(f).name;
  if (only.length && !only.includes(name)) continue;
  const src = path.join(SRC, f);
  source += (await stat(src)).size;
  const row = [name.padEnd(10)];
  for (const v of variants) {
    const img = sharp(src).resize({ width: v.width, withoutEnlargement: true }).grayscale();
    const info = await v.enc(img).toFile(path.join(OUT, `${name}${v.suffix}.${v.ext}`));
    const key = `${v.ext}${v.suffix}`;
    totals[key] = (totals[key] ?? 0) + info.size;
    row.push(`${key} ${String(Math.round(info.size / 1024)).padStart(5)} KB`);
  }
  console.log(row.join('  '));
}
const mb = (n) => (n / 1048576).toFixed(2) + ' MB';
console.log(`\nsource ${mb(source)}  →  ` + Object.entries(totals).map(([k, n]) => `${k} ${mb(n)}`).join(', '));
