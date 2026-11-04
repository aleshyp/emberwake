import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { TRANSITION, SCENE_VH, type Chapter } from './story';
import { Stage } from './renderer';
import { Fx } from './fx';
import { Sound } from './audio';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const smoothstep = (e0: number, e1: number, x: number) => {
  const k = clamp01((x - e0) / (e1 - e0));
  return k * k * (3 - 2 * k);
};

/** Hold: how long the reader holds to wake the ember. Still: how long they must stop moving. */
const HOLD_MS = 1800;
const STILL_MS = 3200;
/** any input within this window counts as "moving" for the still gate */
const STILL_GRACE_MS = 220;

export function start(chapter: Chapter, reduced: boolean) {
  const { scenes } = chapter;
  const touch = window.matchMedia('(hover: none)').matches;
  const storyScenes = scenes.filter((s) => !s.teaser);
  const GATE_SCENE = scenes.findIndex((s) => s.gate);
  const gate = scenes[GATE_SCENE]?.gate;

  // ---------- Stage / FX / Sound ----------
  // the Stage comes first: if WebGL fails here, main.ts falls back to the static edition
  const stage = new Stage(scenes, reduced);
  const fx = new Fx(reduced);
  const sound = new Sound();

  // ---------- DOM ----------
  const track = $<HTMLDivElement>('#track');
  const captionsRoot = $<HTMLDivElement>('#captions');
  const chapterEl = $<HTMLElement>('#chapter');
  const hint = $<HTMLDivElement>('#hint');
  const cursor = $<HTMLDivElement>('#cursor');
  const cursorLabel = cursor.querySelector<HTMLElement>('.cursor__label')!;
  const ring = cursor.querySelector<SVGCircleElement>('.ring')!;
  const titleEl = $<HTMLElement>('#title');
  const loader = $<HTMLDivElement>('#loader');
  const loaderBar = $<HTMLElement>('#loader i');
  const srStory = $<HTMLOListElement>('#sr-story');
  const soundBtn = $<HTMLButtonElement>('#sound');
  const teaserEl = $<HTMLElement>('#teaser');
  const creditsDlg = $<HTMLDialogElement>('#credits');
  cursorLabel.textContent = gate?.kind === 'still' ? 'Still' : 'Hold';

  // ---------- Timeline: scenes can have different scroll lengths ----------
  const lengths = scenes.map((s) => s.length ?? 1);
  const offsets = lengths.map((_, k) => lengths.slice(0, k).reduce((a, b) => a + b, 0));
  const totalLength = lengths.reduce((a, b) => a + b, 0);
  /** where (in scene units) each scene starts handing over to the next */
  const tStartOf = (k: number) => 1 - TRANSITION / lengths[k];
  function locate(p: number) {
    let i = scenes.length - 1;
    for (let k = 0; k < scenes.length; k++) {
      if (p < offsets[k] + lengths[k]) {
        i = k;
        break;
      }
    }
    return { i, t: clamp01((p - offsets[i]) / lengths[i]) };
  }

  // +100vh so the final scene can reach local progress 1
  track.style.height = `${totalLength * SCENE_VH + 100}vh`;
  $<HTMLElement>('#chapter-total').textContent = storyScenes[storyScenes.length - 1].chapter;

  // visual captions (aria-hidden) + a plain-text version of the story for screen readers
  const captionEls = scenes.map((s) =>
    s.captions.map((c) => {
      const el = document.createElement('p');
      el.className = 'caption';
      el.innerHTML = `<span class="caption__chapter">${s.chapter}</span><span class="caption__text">${c.text}</span>`;
      Object.assign(el.style, c.pos);
      captionsRoot.appendChild(el);
      const li = document.createElement('li');
      li.textContent = c.text;
      srStory.appendChild(li);
      return el;
    }),
  );

  soundBtn.addEventListener('click', async () => {
    const on = await sound.toggle();
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.querySelector('b')!.textContent = on ? 'On' : 'Off';
  });

  $<HTMLButtonElement>('#again').addEventListener('click', () => {
    lenis.scrollTo(0, { duration: reduced ? 0.01 : 3.2, easing: (x) => 1 - Math.pow(1 - x, 4) });
  });
  $<HTMLButtonElement>('#credits-open').addEventListener('click', () => creditsDlg.showModal());
  $<HTMLButtonElement>('#credits-close').addEventListener('click', () => creditsDlg.close());
  creditsDlg.addEventListener('click', (e) => e.target === creditsDlg && creditsDlg.close());

  // ---------- State ----------
  const state = {
    hold: 0, // gate progress 0..1 (holding, or staying still)
    holding: false,
    awake: chapter.startAwake ? 1 : 0, // tweened 0..1
    open: !gate, // gate passed
    mouse: [0, 0] as [number, number],
    mouseTarget: [0, 0] as [number, number],
    cursor: [window.innerWidth / 2, window.innerHeight / 2],
    cursorTarget: [window.innerWidth / 2, window.innerHeight / 2],
    chapter: '',
    boomed: false,
    lastInput: 0, // for the still gate
  };
  if (chapter.startAwake) document.body.classList.add('is-awake');

  const lenis = new Lenis({ autoRaf: false, smoothWheel: !reduced, lerp: 0.085 });
  const sceneHeight = () => (window.innerHeight * SCENE_VH) / 100;
  const gateY = () => (gate ? (offsets[GATE_SCENE] + gate.at * lengths[GATE_SCENE]) * sceneHeight() : Infinity);

  function openGate() {
    if (state.open) return;
    state.open = true;
    state.holding = false;
    gsap.to(state, { hold: 0, duration: 1.2, ease: 'power2.inOut', delay: 0.2 });
    if (gate?.kind === 'still') {
      sound.hush();
      return;
    }
    gsap.to(state, { awake: 1, duration: reduced ? 0.01 : 1.6, ease: 'power2.out' });
    document.body.classList.add('is-awake');
    sound.wake();
  }

  // ---------- Input ----------
  let lastPointer = [-1, -1];
  const moved = () => (state.lastInput = performance.now());
  window.addEventListener('pointermove', (e) => {
    state.cursorTarget = [e.clientX, e.clientY];
    state.mouseTarget = [(e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1)];
    // ignore sub-pixel jitter from trackpads and pens
    if (Math.hypot(e.clientX - lastPointer[0], e.clientY - lastPointer[1]) > 2) moved();
    lastPointer = [e.clientX, e.clientY];
  });
  for (const type of ['wheel', 'touchstart', 'touchmove', 'pointerdown'] as const) {
    window.addEventListener(type, moved, { passive: true });
  }

  let canHold = false;
  let holdFrom = { at: 0, value: 0 }; // wall-clock anchor so the hold is frame-rate independent
  let stillFrom = { at: 0, value: 0 }; // same, for the still gate: reset whenever the reader moves
  const startHold = (e?: Event) => {
    if (e && (e.target as HTMLElement).closest?.('button, a')) return;
    if (gate?.kind !== 'hold' || !canHold || state.open || state.holding) return;
    state.holding = true;
    holdFrom = { at: performance.now(), value: state.hold };
  };
  const endHold = () => (state.holding = false);
  window.addEventListener('pointerdown', startHold);
  window.addEventListener('pointerup', endHold);
  window.addEventListener('pointercancel', endHold);
  window.addEventListener('blur', endHold);
  window.addEventListener('keydown', (e) => {
    moved();
    if (gate?.kind === 'hold' && (e.code === 'Space' || e.code === 'Enter') && canHold && !state.open) {
      e.preventDefault();
      if (!e.repeat) startHold();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') endHold();
  });

  // ---------- Loop ----------
  const RING = 2 * Math.PI * 34;
  ring.style.strokeDasharray = `${RING}`;
  let last = performance.now();

  function frame(now: number) {
    // real elapsed time (capped only for tab-switch gaps) so the gate feels the same at any frame rate
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    // gate: a soft wall until the reader passes it (scrolling back up stays free)
    if (!state.open) {
      const g = gateY();
      if (reduced && lenis.scroll > g) openGate();
      else if (!reduced && lenis.targetScroll > g) {
        if (lenis.animatedScroll > g + 1) lenis.scrollTo(g, { immediate: true });
        else lenis.scrollTo(g);
      }
    }
    lenis.raf(now);

    const scroll = lenis.scroll;
    const p = Math.max(scroll / sceneHeight(), 0);
    const { i, t } = locate(p);
    const tStart = tStartOf(i);
    const transitioning = i < scenes.length - 1 && t > tStart;
    const mix = transitioning ? clamp01((t - tStart) / TRANSITION) : 0;

    // gate progress
    canHold = i === GATE_SCENE && !state.open && t > 0.05 && t < tStart;
    const still = gate?.kind === 'still';
    if (!state.open) {
      if (!still) {
        if (state.holding && canHold) state.hold = clamp01(holdFrom.value + (performance.now() - holdFrom.at) / HOLD_MS);
        else state.hold = clamp01(state.hold - dt / 0.7);
      } else {
        // wall-clock anchored like the hold, so slow or throttled frames don't slow the gate down
        const nowMs = performance.now();
        // any input since the anchor counts, even if it fell between two frames
        const quiet = state.lastInput <= stillFrom.at && nowMs - state.lastInput > STILL_GRACE_MS;
        if (canHold && quiet) {
          state.hold = clamp01(stillFrom.value + (nowMs - stillFrom.at) / STILL_MS);
        } else {
          state.hold = clamp01(state.hold - dt / 0.35); // the song hears you
          stillFrom = { at: nowMs, value: state.hold };
        }
      }
      if (state.hold >= 1) openGate();
    }

    // smoothing
    state.mouse[0] += (state.mouseTarget[0] - state.mouse[0]) * 0.05;
    state.mouse[1] += (state.mouseTarget[1] - state.mouse[1]) * 0.05;
    state.cursor[0] += (state.cursorTarget[0] - state.cursor[0]) * 0.22;
    state.cursor[1] += (state.cursorTarget[1] - state.cursor[1]) * 0.22;

    // make sure the scene we're in and the next one are loading first
    stage.loadScene(i).catch(() => {});
    if (i + 1 < scenes.length) stage.loadScene(i + 1).catch(() => {});

    // hiding from the song: the ember's light shrinks as she goes still (and flares when she moves)
    const hiding = still && !state.open && i === GATE_SCENE;
    const awake = hiding ? state.awake * (1 - 0.75 * state.hold) : state.awake;

    stage.render({
      a: i,
      b: transitioning ? i + 1 : i,
      mix,
      localA: t,
      localB: 0,
      hold: still ? 0 : state.hold,
      awake,
      mouse: reduced ? [0, 0] : state.mouse,
      time: now / 1000,
    });

    // captions
    scenes.forEach((s, si) =>
      s.captions.forEach((c, ci) => {
        const okWhen = !c.when || (c.when === 'after') === state.open;
        const on = si === i && okWhen && t >= c.at[0] && t <= c.at[1];
        captionEls[si][ci].classList.toggle('is-on', on);
      }),
    );

    // teaser: letterbox in during the melt, then reveal the next-chapter card
    const teaserNow = !!scenes[i].teaser || (transitioning && !!scenes[i + 1].teaser && mix > 0.4);
    document.body.classList.toggle('is-teaser', teaserNow);
    teaserEl.classList.toggle('is-on', !!scenes[i].teaser && t > 0.22);

    // chapter
    const ch = transitioning && mix > 0.5 ? scenes[i + 1].chapter : scenes[i].chapter;
    if (ch !== state.chapter) {
      state.chapter = ch;
      chapterEl.textContent = ch;
    }

    // scroll hint / gate hint
    hint.classList.toggle('is-on', p < 0.04 || canHold);
    hint.textContent = !canHold
      ? 'Scroll'
      : still
        ? 'Be still. Don’t move, don’t scroll.'
        : touch
          ? 'Press and hold'
          : 'Press and hold — or hold Space';

    // cursor: on the still gate, the ring fills as long as the reader stays put
    cursor.classList.toggle('is-hold', canHold);
    cursor.classList.toggle('is-holding', canHold && (still ? state.hold > 0.02 : state.holding));
    cursor.classList.toggle('is-touch', touch);
    const [cx, cy] = touch ? [window.innerWidth / 2, window.innerHeight * 0.72] : state.cursor;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    ring.style.strokeDashoffset = `${RING * (1 - state.hold)}`;

    // finale title + debris (on the last story scene), fading out before the teaser
    const finale = i === storyScenes.length - 1;
    const fadeOut = 1 - smoothstep(tStart - 0.1, tStart - 0.01, t);
    const r = finale ? clamp01((t - 0.2) / 0.22) * fadeOut : 0;
    titleEl.style.setProperty('--r', r.toFixed(4));
    titleEl.classList.toggle('is-on', r > 0);
    const debrisFade = finale ? 1 - smoothstep(tStart - 0.06, tStart + 0.12, t) : 0;
    const debris = finale ? clamp01((t - 0.18) / 0.45) : 0;
    if (debris > 0.04 && !state.boomed) {
      state.boomed = true;
      sound.boom(0.6);
    } else if (debris < 0.01) state.boomed = false;

    // ember motes follow how much power the current scene carries
    const powerA = scenes[i].power;
    const powerB = transitioning ? scenes[i + 1].power : powerA;
    const velocity = lenis.velocity || 0;
    fx.render({
      time: now / 1000,
      dt,
      motes: awake * (powerA + (powerB - powerA) * mix),
      debris,
      debrisFade,
      velocity,
    });

    // the Choir sings under its scenes; at the still gate it swells whenever the reader moves
    const songA = scenes[i].song ?? 0;
    const songB = transitioning ? (scenes[i + 1].song ?? 0) : songA;
    const song = hiding ? Math.max(0.35, 1 - state.hold) : songA + (songB - songA) * mix;
    sound.update({ velocity, mix, hold: still ? 0 : state.hold, awake, song });

    requestAnimationFrame(frame);
  }

  // ---------- Boot ----------
  // the first two scenes gate the loader; the rest stream in behind it, in story order
  let loaded = 0;
  const first = [0, 1].map((k) =>
    stage.loadScene(k).then(() => (loaderBar.style.transform = `scaleX(${++loaded / 2})`)),
  );
  Promise.all(first)
    .then(async () => {
      for (let k = 2; k < scenes.length; k++) await stage.loadScene(k).catch(console.error);
    })
    .catch(() => {});
  Promise.all(first)
    .then(() => {
      loader.classList.add('is-done');
      if (reduced) document.body.classList.add('is-reduced');
      requestAnimationFrame(frame);
    })
    .catch((err) => {
      loader.querySelector('.loader__note')!.textContent = 'The ember would not light. Try reloading.';
      console.error(err);
    });

  // expose for debugging in devtools (dev builds only)
  if (import.meta.env.DEV) Object.assign(window, { __ember: { lenis, state, stage, fx, sound } });
}
