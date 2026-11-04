// Picks the best encoding and size of each plate for this device.
// scripts/encode-scenes.mjs writes <name>.avif / .jpg at 2048px and <name>-1280.* for small screens.

const SMALL_W = 1280;

// a 1x1 AVIF: if it decodes, the browser can take the (much smaller) AVIF plates
const AVIF_PROBE =
  'data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAAB0AAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAlbWRhdBIACgc4AAaQENBpMhAdgmLE4AAWAACQNY48fpPA';

let avif: Promise<boolean> | undefined;
export function supportsAvif(): Promise<boolean> {
  avif ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth === 1);
    img.onerror = () => resolve(false);
    img.src = AVIF_PROBE;
  });
  return avif;
}

/**
 * Plates are portrait (~0.8) and cover-fit, so on landscape screens the width drives the size and on
 * portrait screens the height does. What matters is CSS pixels, not device pixels: the shader's line
 * screen is ~3.5 CSS px wide at any DPR, so it can't show more detail on a denser screen. With up to
 * ~1.35x camera zoom plus headroom, the 1280px set covers layouts up to ~760 CSS px (phones).
 */
export function wantsSmall() {
  return Math.max(window.innerWidth, window.innerHeight * 0.8) <= 760;
}

/** URLs to try for one plate, best first. */
export async function plateUrls(name: string): Promise<string[]> {
  const base = `${import.meta.env.BASE_URL}scenes/${name}${wantsSmall() ? `-${SMALL_W}` : ''}`;
  return (await supportsAvif()) ? [`${base}.avif`, `${base}.jpg`] : [`${base}.jpg`];
}

/** Path of a file in public/, respecting Vite's base (for hosting under a subpath). */
export const asset = (p: string) => `${import.meta.env.BASE_URL}${p.replace(/^\//, '')}`;
