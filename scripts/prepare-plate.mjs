// Turns a scanned book page into a source plate in art/: finds the engraving on the page,
// crops just inside its border, converts to grayscale, auto-levels and caps the width.
//
//   node scripts/prepare-plate.mjs <scan.jpg> <name> [inset=0.012]
//
// Then run `npm run encode -- <name>` to produce the served files.
import sharp from 'sharp';
import path from 'node:path';

const [input, name, insetArg] = process.argv.slice(2);
if (!input || !name) {
  console.error('usage: node scripts/prepare-plate.mjs <scan.jpg> <name> [inset]');
  process.exit(1);
}
const INSET = Number(insetArg ?? 0.012);
const MAX_W = 2048;

const meta = await sharp(input).metadata();
const PW = 480; // analysis width
const scale = meta.width / PW;
const { data, info } = await sharp(input).grayscale().resize({ width: PW }).raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;

const paper = (() => {
  // the brightest decile is the page
  const sorted = Uint8Array.from(data).sort();
  return sorted[Math.floor(sorted.length * 0.9)];
})();

/** longest run of indices that look like engraving */
function longestRun(n, plateAt) {
  let best = [0, 0];
  let start = -1;
  for (let k = 0; k <= n; k++) {
    const on = k < n && plateAt(k);
    if (on && start < 0) start = k;
    if (!on && start >= 0) {
      if (k - start > best[1] - best[0]) best = [start, k];
      start = -1;
    }
  }
  return best;
}
// a line counts as engraving if it's dark, or busy with hatching (pale skies are still full of lines);
// blank margins are both bright and flat
const isPlate = (vals) => {
  let s = 0, s2 = 0;
  for (const v of vals) { s += v; s2 += v * v; }
  const mean = s / vals.length;
  const sd = Math.sqrt(Math.max(s2 / vals.length - mean * mean, 0));
  return mean < paper - 40 || sd > 18;
};
const col = (x, y0, y1) => { const v = []; for (let y = y0; y < y1; y++) v.push(data[y * w + x]); return v; };
const row = (y, x0, x1) => Array.from(data.subarray(y * w + x0, y * w + x1));

// rows first (over the middle columns), then columns within those rows
const [y0, y1] = longestRun(h, (y) => isPlate(row(y, Math.floor(w * 0.3), Math.floor(w * 0.7))));
const [x0, x1] = longestRun(w, (x) => isPlate(col(x, y0, y1)));
const ix = Math.round((x1 - x0) * INSET);
const iy = Math.round((y1 - y0) * INSET);
const box = {
  left: Math.round((x0 + ix) * scale),
  top: Math.round((y0 + iy) * scale),
  width: Math.round((x1 - x0 - 2 * ix) * scale),
  height: Math.round((y1 - y0 - 2 * iy) * scale),
};

const out = path.join('art', `${name}.jpg`);
const res = await sharp(input)
  .extract(box)
  .grayscale()
  .normalise({ lower: 0.5, upper: 99.5 })
  .resize({ width: MAX_W, withoutEnlargement: true })
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(out);
console.log(`${out}: crop ${box.width}x${box.height} at ${box.left},${box.top} → ${res.width}x${res.height}`);
