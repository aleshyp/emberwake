import { PALETTE } from './palette';

// Deterministic RNG so the debris looks the same on every visit.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Shard = {
  sprite: HTMLCanvasElement;
  size: number;
  z: number; // depth: <1 far, >1 near
  start: [number, number]; // offset from title center, in px
  dir: [number, number];
  dist: number;
  rot0: number;
  spin: number;
  phase: number;
};

type Mote = { x: number; y: number; vy: number; r: number; depth: number; phase: number };

export type FxState = {
  time: number;
  dt: number;
  /** 0..1 ember motes intensity */
  motes: number;
  /** 0..1 finale debris progress (scroll-scrubbed) */
  debris: number;
  /** 0..1 debris opacity (fades out before the teaser) */
  debrisFade: number;
  /** scroll velocity in px/frame */
  velocity: number;
};

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export class Fx {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = 0;
  h = 0;
  shards: Shard[] = [];
  motes: Mote[] = [];
  private dirty = false;

  constructor(private reduced: boolean) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fx';
    this.canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.buildShards();
    this.buildMotes();
  }

  private buildMotes() {
    const rand = mulberry32(7);
    const n = this.reduced ? 0 : Math.round(Math.min(90, (this.w * this.h) / 16000));
    this.motes = Array.from({ length: n }, () => ({
      x: rand() * this.w,
      y: rand() * this.h,
      vy: 14 + rand() * 46,
      r: 0.6 + rand() * 1.8,
      depth: 0.3 + rand() * 1.2,
      phase: rand() * Math.PI * 2,
    }));
  }

  private buildShards() {
    const rand = mulberry32(42);
    const vmin = Math.min(this.w, this.h);
    const count = 26;
    this.shards = [];
    for (let i = 0; i < count; i++) {
      const z = 0.45 + rand() * 1.4;
      const size = vmin * (0.03 + rand() * 0.09) * z;
      const sprite = this.drawShard(rand, size);
      // start clustered in a slab where the title sits
      const sx = (rand() * 2 - 1) * this.w * 0.3;
      const sy = (rand() * 2 - 1) * this.h * 0.1;
      let dx = sx + (rand() - 0.5) * 80;
      let dy = sy - this.h * 0.05 + (rand() - 0.5) * 80;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const near = z > 1.1;
      this.shards.push({
        sprite,
        size,
        z,
        start: [sx, sy],
        dir: [dx, dy],
        dist: (near ? 0.6 + rand() * 0.7 : 0.12 + rand() * 0.3) * Math.max(this.w, this.h) * z,
        rot0: rand() * Math.PI * 2,
        spin: (rand() - 0.5) * 4,
        phase: rand() * Math.PI * 2,
      });
    }
    this.shards.sort((a, b) => a.z - b.z);
  }

  /** a hatched stone fragment in the engraving style */
  private drawShard(rand: () => number, size: number) {
    const d = this.dpr;
    const pad = 6;
    const c = document.createElement('canvas');
    const S = Math.ceil(size * 2 * d + pad * 2);
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    g.translate(S / 2, S / 2);
    g.scale(d, d);
    const n = 5 + Math.floor(rand() * 4);
    const pts: [number, number][] = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (rand() - 0.5) * 0.6;
      const r = size * (0.55 + rand() * 0.45);
      pts.push([Math.cos(a) * r, Math.sin(a) * r * (0.6 + rand() * 0.4)]);
    }
    const path = new Path2D();
    pts.forEach(([x, y], k) => (k ? path.lineTo(x, y) : path.moveTo(x, y)));
    path.closePath();
    g.fillStyle = PALETTE.paper;
    g.fill(path);
    // hatching, denser on the shadow side
    g.save();
    g.clip(path);
    g.strokeStyle = PALETTE.ink;
    const ang = rand() * Math.PI;
    g.rotate(ang);
    for (let x = -size; x < size; x += 3.2) {
      const shade = (x + size) / (2 * size);
      g.globalAlpha = 0.2 + shade * 0.65;
      g.lineWidth = 0.5 + shade * 1.3;
      g.beginPath();
      g.moveTo(x, -size);
      g.lineTo(x + (rand() - 0.5) * 2, size);
      g.stroke();
    }
    g.restore();
    // a crack or two
    g.globalAlpha = 0.9;
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(pts[0][0] * 0.8, pts[0][1] * 0.8);
    g.lineTo((rand() - 0.5) * size * 0.4, (rand() - 0.5) * size * 0.4);
    g.lineTo(pts[2][0] * 0.7, pts[2][1] * 0.7);
    g.stroke();
    g.globalAlpha = 1;
    g.lineWidth = 2;
    g.stroke(path);
    return c;
  }

  render(s: FxState) {
    const g = this.ctx;
    const active = s.motes > 0.002 || (s.debris > 0.001 && s.debrisFade > 0.001);
    if (!active) {
      if (this.dirty) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.dirty = false;
      }
      return;
    }
    this.dirty = true;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // ---- ember motes: rise, wobble, and lag behind the scroll by depth ----
    if (s.motes > 0.002) {
      g.globalCompositeOperation = 'lighter';
      for (const m of this.motes) {
        m.y -= m.vy * s.dt * m.depth + s.velocity * 0.35 * m.depth;
        if (m.y < -10) m.y += this.h + 20;
        if (m.y > this.h + 10) m.y -= this.h + 20;
        const x = m.x + Math.sin(s.time * 0.9 + m.phase) * 14 * m.depth;
        const flicker = 0.6 + 0.4 * Math.sin(s.time * 5 + m.phase * 3);
        g.globalAlpha = 0.18 * s.motes * flicker;
        g.fillStyle = PALETTE.accent;
        g.beginPath();
        g.arc(x, m.y, m.r * 4, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 0.9 * s.motes * flicker;
        g.fillStyle = '#d9fbff';
        g.beginPath();
        g.arc(x, m.y, m.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    }

    // ---- finale debris: a slab bursts outward as the title forms ----
    if (s.debris > 0.001 && s.debrisFade > 0.001) {
      const cx = this.w / 2;
      const cy = this.h / 2;
      const e = easeOut(s.debris);
      const appear = Math.min(s.debris / 0.06, 1) * s.debrisFade;
      for (const sh of this.shards) {
        const float = Math.sin(s.time * 0.6 + sh.phase) * 6 * sh.z;
        const x = cx + sh.start[0] + sh.dir[0] * sh.dist * e;
        const y = cy + sh.start[1] + sh.dir[1] * sh.dist * e + float + e * e * 60 * sh.z;
        const rot = sh.rot0 + sh.spin * e + Math.sin(s.time * 0.3 + sh.phase) * 0.05;
        const half = sh.sprite.width / this.dpr / 2;
        g.globalAlpha = appear * (sh.z < 0.8 ? 0.85 : 1);
        g.save();
        g.translate(x, y);
        g.rotate(rot);
        g.drawImage(sh.sprite, -half, -half, half * 2, half * 2);
        g.restore();
      }
      g.globalAlpha = 1;
    }
  }
}
