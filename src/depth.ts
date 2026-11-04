import type { Depth } from './story';

/**
 * Paint a scene's hand-traced depth layers into a small, soft grayscale map.
 * Black = the plate itself, brighter = nearer to the viewer. The blur is what
 * hides the polygon edges and turns the cut-outs into a smooth 2.5D displacement.
 */
export function rasterizeDepth(depth: Depth, aspect: number, width = 512): HTMLCanvasElement {
  const w = width;
  const h = Math.round(width / aspect);
  const draw = document.createElement('canvas');
  draw.width = w;
  draw.height = h;
  const g = draw.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);

  if (depth.gradient) {
    const [y0, y1, d0, d1] = depth.gradient;
    const grad = g.createLinearGradient(0, y0 * h, 0, y1 * h);
    const v = (d: number) => `rgb(${Math.round(d * 255)},${Math.round(d * 255)},${Math.round(d * 255)})`;
    grad.addColorStop(0, v(d0));
    grad.addColorStop(1, v(d1));
    g.fillStyle = grad;
    g.fillRect(0, y0 * h, w, h - y0 * h);
  }

  // nearest wins where layers overlap
  g.globalCompositeOperation = 'lighten';
  for (const layer of depth.layers) {
    const c = Math.round(Math.min(Math.max(layer.depth, 0), 1) * 255);
    g.fillStyle = `rgb(${c},${c},${c})`;
    g.beginPath();
    layer.poly.forEach(([x, y], k) => (k ? g.lineTo(x * w, y * h) : g.moveTo(x * w, y * h)));
    g.closePath();
    g.fill();
  }

  // feather: shrink then smoothly re-enlarge (a portable blur; canvas `filter` isn't everywhere)
  const small = document.createElement('canvas');
  small.width = Math.max(8, Math.round(w / 9));
  small.height = Math.max(8, Math.round(h / 9));
  const s = small.getContext('2d')!;
  s.imageSmoothingEnabled = true;
  s.imageSmoothingQuality = 'high';
  s.drawImage(draw, 0, 0, small.width, small.height);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const o = out.getContext('2d')!;
  o.imageSmoothingEnabled = true;
  o.imageSmoothingQuality = 'high';
  o.drawImage(small, 0, 0, w, h);
  return out;
}
