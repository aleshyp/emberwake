// The static edition: shown when WebGL is unavailable (or with ?static in the URL).
// Every plate, in order, with its captions. An SVG filter per plate maps luminance into the same
// ink / red / paper bands the shader uses, so it still looks like Emberwake without the motion.
import type { Chapter, Scene } from './story';
import { PALETTE } from './palette';
import { asset } from './images';

const rgb = (h: string) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
};

/** a discrete transfer table: luminance buckets → ink / red / paper, using the scene's thresholds */
function toneFilter(s: Scene, accent: boolean) {
  const N = 48;
  const [t0, t1] = s.tone;
  const ink = rgb(PALETTE.ink);
  const mid = rgb(PALETTE.red);
  const hi = accent && s.power > 0.6 ? rgb(PALETTE.paper).map((v, k) => v * 0.8 + rgb(PALETTE.accent)[k] * 0.2) : rgb(PALETTE.paper);
  const table = (k: number) =>
    Array.from({ length: N }, (_, b) => {
      const l = (b + 0.5) / N;
      return (l < t0 ? ink : l < t1 ? mid : hi)[k].toFixed(3);
    }).join(' ');
  return `
    <filter id="tone-${s.id}" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
      <feComponentTransfer>
        <feFuncR type="discrete" tableValues="${table(0)}" />
        <feFuncG type="discrete" tableValues="${table(1)}" />
        <feFuncB type="discrete" tableValues="${table(2)}" />
      </feComponentTransfer>
    </filter>`;
}

function plate(s: Scene) {
  const url = (suffix: string, ext: string) => asset(`scenes/${s.src}${suffix}.${ext}`);
  const set = (ext: string) => `${url('-1280', ext)} 1280w, ${url('', ext)} 2048w`;
  const sizes = '(min-width: 960px) 880px, 100vw';
  return `
    <picture>
      <source type="image/avif" srcset="${set('avif')}" sizes="${sizes}" />
      <img src="${url('', 'jpg')}" srcset="${set('jpg')}" sizes="${sizes}" alt="" loading="lazy" decoding="async"
        style="filter: url(#tone-${s.id})" />
    </picture>`;
}

export function renderStatic(chapter: Chapter) {
  document.body.classList.add('is-static');
  if (chapter.startAwake) document.body.classList.add('is-awake');
  // in case the WebGL edition got partway before failing
  document.querySelectorAll('canvas.stage, canvas.fx').forEach((c) => c.remove());
  document.querySelector('#captions')!.replaceChildren();
  document.querySelector('#sr-story')!.replaceChildren();
  document.querySelector('#loader')!.classList.add('is-done');
  document.querySelector<HTMLElement>('.track')!.style.height = '';

  const root = document.createElement('div');
  root.className = 'static';
  const story = chapter.scenes.filter((s) => !s.teaser);
  root.innerHTML = `
    <svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">
      ${chapter.scenes.map((s) => toneFilter(s, !!chapter.startAwake)).join('')}
    </svg>
    <p class="static__note">This browser can’t run the animated edition (it needs WebGL), so here is the story as still plates.</p>
    ${story
      .map(
        (s) => `
      <figure class="static__scene">
        ${plate(s)}
        <figcaption>
          <span class="caption__chapter">${s.chapter}. ${s.title}</span>
          ${s.captions.map((c) => `<p>${c.text}</p>`).join('')}
        </figcaption>
      </figure>`,
      )
      .join('')}`;
  const main = document.querySelector('main')!;
  main.appendChild(root);

  // the next-chapter card closes the static edition too
  const teaser = document.querySelector<HTMLElement>('#teaser');
  const teaserScene = chapter.scenes.find((s) => s.teaser);
  if (teaser) {
    if (teaserScene) {
      const fig = document.createElement('figure');
      fig.className = 'static__scene static__scene--teaser';
      fig.innerHTML = plate(teaserScene);
      root.appendChild(fig);
    }
    root.appendChild(teaser);
    teaser.classList.add('is-on');
  }

  const dlg = document.querySelector<HTMLDialogElement>('#credits')!;
  document.querySelector('#again')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.querySelector('#credits-open')?.addEventListener('click', () => dlg.showModal());
  document.querySelector('#credits-close')?.addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
}
