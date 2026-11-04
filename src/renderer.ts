import { Renderer, Program, Mesh, Triangle, Texture } from 'ogl';
import { vertex, fragment } from './shaders';
import type { Scene, TransitionKind } from './story';
import { rasterizeDepth } from './depth';

const hex = (h: string) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const PALETTE = {
  ink: '#0b0909',
  red: '#e3140b',
  paper: '#efe8dc',
  accent: '#3fe6ff',
};

const TRANSITION_ID: Record<TransitionKind, number> = { melt: 0, panels: 1, iris: 2 };

export type FrameState = {
  a: number; // scene index A
  b: number; // scene index B
  mix: number;
  localA: number;
  localB: number;
  hold: number;
  awake: number;
  mouse: [number, number];
  time: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);
const smooth = (e0: number, e1: number, x: number) => ease(Math.min(Math.max((x - e0) / (e1 - e0), 0), 1));

export class Stage {
  renderer: Renderer;
  program: Program;
  mesh: Mesh;
  blank: Texture;
  textures: (Texture | undefined)[] = [];
  depths: (Texture | undefined)[] = [];
  flat: Texture;
  aspects: number[] = [];
  private loading = new Map<number, Promise<void>>();
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  constructor(private scenes: Scene[], private reduced: boolean) {
    this.renderer = new Renderer({ dpr: this.dpr, antialias: false, powerPreference: 'high-performance' });
    const gl = this.renderer.gl;
    gl.canvas.classList.add('stage');
    gl.canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(gl.canvas);

    // 1x1 ink texture shown if a scene is reached before its image arrives
    this.blank = new Texture(gl, { image: new Uint8Array([11, 9, 9, 255]), width: 1, height: 1, generateMipmaps: false });
    // depth 0 everywhere: scenes without traced layers stay flat
    this.flat = new Texture(gl, { image: new Uint8Array([0, 0, 0, 255]), width: 1, height: 1, generateMipmaps: false });
    this.program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTexA: { value: this.blank },
        uTexB: { value: this.blank },
        uAspA: { value: 1 },
        uAspB: { value: 1 },
        uCamA: { value: [1, 0.5, 0.5] },
        uCamB: { value: [1, 0.5, 0.5] },
        uToneA: { value: [0.25, 0.6] },
        uToneB: { value: [0.25, 0.6] },
        uPowA: { value: 0 },
        uPowB: { value: 0 },
        uEmberA: { value: [0, 0, 0] },
        uEmberB: { value: [0, 0, 0] },
        uDepthA: { value: this.flat },
        uDepthB: { value: this.flat },
        uParA: { value: [0, 0] },
        uParB: { value: [0, 0] },
        uMix: { value: 0 },
        uTransType: { value: 0 },
        uIris: { value: [0.5, 0.5] },
        uInsetRect: { value: [0, 0, 0, 0] },
        uInsetCam: { value: [1, 0.5, 0.5] },
        uInsetReveal: { value: 0 },
        uTime: { value: 0 },
        uRes: { value: [1, 1] },
        uDpr: { value: this.dpr },
        uMouse: { value: [0, 0] },
        uHold: { value: 0 },
        uAwake: { value: 0 },
        uSpacing: { value: 4 },
        uReduced: { value: reduced ? 1 : 0 },
        uInk: { value: hex(PALETTE.ink) },
        uRed: { value: hex(PALETTE.red) },
        uPaper: { value: hex(PALETTE.paper) },
        uAccent: { value: hex(PALETTE.accent) },
      },
    });
    this.mesh = new Mesh(gl, { geometry: new Triangle(gl), program: this.program });
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  /** load one scene's engraving (deduplicated) */
  loadScene(i: number): Promise<void> {
    const existing = this.loading.get(i);
    if (existing) return existing;
    const s = this.scenes[i];
    const p = new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        this.textures[i] = new Texture(this.renderer.gl, { image: img });
        this.aspects[i] = img.naturalWidth / img.naturalHeight;
        if (s.depth) {
          const map = rasterizeDepth(s.depth, this.aspects[i]);
          this.depths[i] = new Texture(this.renderer.gl, { image: map, generateMipmaps: false });
        }
        resolve();
      };
      img.onerror = () => reject(new Error(`Failed to load ${s.src}`));
      img.src = s.src;
    });
    this.loading.set(i, p);
    return p;
  }

  isLoaded(i: number) {
    return !!this.textures[i];
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const gl = this.renderer.gl;
    this.program.uniforms.uRes.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    this.program.uniforms.uSpacing.value = Math.max(3, Math.round(3.5 * this.dpr));
  }

  private cam(s: Scene, t: number): number[] {
    const e = ease(Math.min(Math.max(t, 0), 1));
    return [0, 1, 2].map((k) => lerp(s.cam.from[k], s.cam.to[k], e));
  }

  /** near-layer displacement: drifts upward through the scene and leans away from the mouse */
  private parallax(s: Scene, t: number, mouse: [number, number]): number[] {
    const a = s.depth?.amount ?? 0;
    if (!a || this.reduced) return [0, 0];
    return [mouse[0] * a * 0.35, mouse[1] * a * 0.25 - (t - 0.5) * a * 0.8];
  }

  /** inset rect in uv space (y from bottom), with a portrait fallback and scroll parallax */
  private inset(s: Scene, t: number) {
    const u = this.program.uniforms;
    const ins = s.inset;
    if (!ins) {
      u.uInsetReveal.value = 0;
      return;
    }
    let [left, top, w, h] = ins.rect;
    let zoom = ins.zoom;
    if (window.innerWidth / window.innerHeight < 0.9) {
      zoom *= 0.65; // narrow panels need a wider crop to stay legible
      // portrait: widen the panel and center it horizontally
      const ratio = Math.min(0.86 / w, 2.4);
      w *= ratio;
      h = Math.min(h * 1.1, 0.3);
      left = (1 - w) / 2;
      top = Math.min(Math.max(top, 0.3), 0.62);
    }
    const [a0, a1] = ins.at;
    const reveal = smooth(a0, a0 + 0.08, t) * (1 - smooth(a1 - 0.06, a1, t));
    const mid = (a0 + a1) / 2;
    const drift = ins.drift * ((t - mid) / (a1 - a0));
    const y = 1 - top - h + drift;
    u.uInsetRect.value = [left, y, w, h];
    // a slow push-in inside the panel adds a second depth layer
    u.uInsetCam.value = [zoom * (1 + 0.12 * smooth(a0, a1, t)), ins.center[0], ins.center[1]];
    u.uInsetReveal.value = reveal;
  }

  render(f: FrameState) {
    const u = this.program.uniforms;
    const A = this.scenes[f.a];
    const B = this.scenes[f.b];
    u.uTexA.value = this.textures[f.a] ?? this.blank;
    u.uTexB.value = this.textures[f.b] ?? this.blank;
    u.uAspA.value = this.aspects[f.a] ?? 1;
    u.uAspB.value = this.aspects[f.b] ?? 1;
    u.uCamA.value = this.cam(A, f.localA);
    u.uCamB.value = this.cam(B, f.localB);
    u.uToneA.value = A.tone;
    u.uToneB.value = B.tone;
    u.uPowA.value = A.power * f.awake;
    u.uPowB.value = B.power * f.awake;
    u.uEmberA.value = A.ember ? [A.ember[0], A.ember[1], 1] : [0, 0, 0];
    u.uEmberB.value = B.ember ? [B.ember[0], B.ember[1], 1] : [0, 0, 0];
    u.uDepthA.value = this.depths[f.a] ?? this.flat;
    u.uDepthB.value = this.depths[f.b] ?? this.flat;
    u.uParA.value = this.parallax(A, f.localA, f.mouse);
    u.uParB.value = this.parallax(B, f.localB, f.mouse);
    u.uMix.value = f.mix;
    u.uTransType.value = TRANSITION_ID[A.transition ?? 'melt'];
    const iris = A.iris ?? [0.5, 0.5];
    u.uIris.value = [iris[0], 1 - iris[1]];
    this.inset(A, f.localA);
    u.uTime.value = f.time;
    u.uMouse.value = f.mouse;
    u.uHold.value = f.hold;
    u.uAwake.value = f.awake;
    this.renderer.render({ scene: this.mesh });
  }
}
