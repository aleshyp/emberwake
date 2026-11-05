// The contents: every chapter and scene, opened from the plate counter in the HUD.
// Each scene links to its chapter page with the scene's id as the hash (e.g. two/#thicket).
// The animated edition intercepts links into the chapter you're reading and jumps there itself;
// the static edition lets the browser follow the anchor to the plate's <figure id>.
import type { Chapter } from './story';
import { chapters, chapterNumber } from './chapters';
import { asset } from './images';

/** link to one scene of a chapter */
export const sceneHref = (c: Chapter, sceneId: string) => `${asset(c.path)}#${sceneId}`;

type Options = {
  /** jump to scene k of the current chapter (animated edition); omit to follow the link natively */
  jump?: (k: number) => void;
  /** index of the scene being read, to mark it in the list */
  current?: () => number;
  onOpen?: () => void;
  onClose?: () => void;
};

export function mountContents(current: Chapter, opts: Options = {}) {
  const btn = document.querySelector<HTMLButtonElement>('#contents-open');
  if (!btn) return;

  const dlg = document.createElement('dialog');
  dlg.className = 'credits contents';
  dlg.setAttribute('aria-labelledby', 'contents-title');
  dlg.dataset.lenisPrevent = ''; // let the list scroll natively if it's taller than the screen
  dlg.innerHTML = `
    <h2 id="contents-title">Contents</h2>
    ${chapters
      .map(
        (c) => `
      <section>
        <h3>Chapter ${chapterNumber(c)}${c.title ? `: <em>${c.title}</em>` : ''}</h3>
        <ol>
          ${c.scenes
            .filter((s) => !s.teaser)
            .map(
              (s) =>
                `<li><a href="${sceneHref(c, s.id)}" data-chapter="${c.id}" data-scene="${s.id}"><span>${s.chapter}</span>${s.title}</a></li>`,
            )
            .join('')}
        </ol>
      </section>`,
      )
      .join('')}
    <button type="button" class="contents__close">Close</button>`;
  document.body.appendChild(dlg);

  const close = () => dlg.open && dlg.close();
  dlg.addEventListener('close', () => opts.onClose?.());
  dlg.querySelector('.contents__close')!.addEventListener('click', close);
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) return close(); // backdrop
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-scene]');
    if (!link || link.dataset.chapter !== current.id) return; // other chapters: a normal page load
    close();
    if (!opts.jump) return; // static edition: the browser scrolls to the anchor
    e.preventDefault();
    opts.jump(current.scenes.findIndex((s) => s.id === link.dataset.scene));
  });

  btn.addEventListener('click', () => {
    const k = opts.current?.() ?? -1;
    const here = k >= 0 ? current.scenes[k]?.id : undefined;
    dlg.querySelectorAll<HTMLAnchorElement>('a[data-scene]').forEach((a) => {
      if (a.dataset.chapter === current.id && a.dataset.scene === here) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    opts.onOpen?.();
    dlg.showModal();
  });
}
