// The HTML page for every chapter. vite.config.ts calls renderPage() for each chapter's
// <path>/index.html, which is only a placeholder file; everything that differs between chapters
// comes from the chapter's data (src/chapters/*.ts: `page`, `title`, scene numerals and credits).
//
// Runs at build time (and in the dev server), not in the browser. Strings marked "HTML allowed"
// in story.ts are inserted as-is; everything else is escaped.
import type { Chapter } from './story';
import { chapters, chapterNumber } from './chapters';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * @param base the site's base path (Vite's `base`, e.g. '/emberwake/'), for links between chapters.
 *   `%SITE%` is left for the emberwake-site-url plugin to fill with the absolute URL.
 */
export function renderPage(chapter: Chapter, base: string) {
  const { page } = chapter;
  const index = chapters.indexOf(chapter);
  const first = chapters[0];
  const next = chapters[index + 1];
  const story = chapter.scenes.filter((s) => !s.teaser);
  const heading = chapter.title ? `Emberwake, Chapter ${chapterNumber(chapter)}: ${chapter.title}` : 'Emberwake';
  const docTitle = chapter.title ? `${chapter.title} · Emberwake` : 'Emberwake';
  const gate = chapter.scenes.find((s) => s.gate)?.gate;

  // the mark goes back to the first chapter (or to the top, on the first chapter itself)
  const mark = index === 0 ? `href="#top" id="top"` : `href="${base}${first.path}"`;
  // with a next chapter, the teaser links to it; without one, it's "coming soon" and links back to the start
  const nextLink = next
    ? `<a class="teaser__next" href="${base}${next.path}">Read Chapter ${chapterNumber(next)}</a>`
    : `<a class="teaser__next" href="${base}${first.path}">Chapter ${chapterNumber(first)}</a>`;
  const storyCredit = `Story and site: <em>Emberwake</em>, an original short story.${
    chapter.title ? ` Chapter ${chapterNumber(chapter)}: <em>${chapter.title}</em>.` : ''
  }`;

  return `<!doctype html>
<html lang="en" data-chapter="${chapter.id}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${esc(page.description)}" />
    <meta name="theme-color" content="#e3140b" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="canonical" href="%SITE%${chapter.path}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Emberwake" />
    <meta property="og:title" content="${esc(heading)}" />
    <meta property="og:description" content="${esc(page.shareDescription)}" />
    <meta property="og:url" content="%SITE%${chapter.path}" />
    <meta property="og:image" content="%SITE%social/${chapter.id}.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(page.shareImageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <title>${esc(docTitle)}</title>
  </head>
  <body>
    <noscript><p class="noscript">Emberwake is an illustrated story that needs JavaScript to run.</p></noscript>
    <div class="loader" id="loader" role="status">
      <span class="loader__word">Emberwake</span>
      <span class="loader__bar"><i></i></span>
      <span class="loader__note">${esc(page.loading)}</span>
    </div>

    <header class="hud">
      <a class="hud__mark" ${mark}>Emberwake</a>
      <div class="hud__right">
        <button class="hud__sound" id="sound" type="button" aria-pressed="false">Sound <b>Off</b></button>
        <button class="hud__chapter" id="contents-open" type="button" aria-haspopup="dialog"><span class="sr-only">Contents. </span><span class="hud__word">Plate </span><b id="chapter">${story[0].chapter}</b> / <span id="chapter-total">${story[story.length - 1].chapter}</span></button>
      </div>
    </header>

    <main aria-label="${esc(chapter.title ? heading : 'Emberwake, a short illustrated story')}">
      <h1 class="sr-only">${esc(heading)}</h1>
      <ol class="sr-only" id="sr-story"></ol>
      <div class="track" id="track"></div>
    </main>

    <div class="captions" id="captions" aria-hidden="true"></div>

    <div class="hint" id="hint" aria-live="polite">Scroll</div>

    <div class="cursor" id="cursor" aria-hidden="true">
      <svg viewBox="0 0 80 80">
        <circle class="ring-bg" cx="40" cy="40" r="34" />
        <circle class="ring" cx="40" cy="40" r="34" />
      </svg>
      <span class="cursor__label">${gate?.kind === 'still' ? 'Still' : 'Hold'}</span>
    </div>

    <section class="title" id="title" aria-hidden="true">
      <p class="title__kicker">${esc(page.finale.kicker)}</p>
      <h2 class="title__word" data-text="EMBERWAKE">EMBERWAKE</h2>
      <p class="title__sub">${esc(page.finale.sub)}</p>
    </section>

    <div class="letterbox" aria-hidden="true"><i></i><i></i></div>

    <section class="teaser" id="teaser" aria-labelledby="teaser-title">
      <p class="teaser__kicker">${esc(page.teaser.kicker)}</p>
      <h2 class="teaser__title" id="teaser-title">${esc(page.teaser.title)}</h2>
      <p class="teaser__line">${page.teaser.line}</p>${next ? '' : '\n      <p class="teaser__soon">Coming soon</p>'}
      <div class="teaser__actions">
        ${nextLink}
        <button type="button" id="again">Read again</button>
        <button type="button" id="credits-open">Credits</button>
      </div>
    </section>

    <dialog class="credits" id="credits" aria-labelledby="credits-title">
      <h2 id="credits-title">Credits</h2>
      <p>${storyCredit}</p>
      <p>${page.credits.art}</p>
      <ul>
${chapter.scenes.map((s) => `        <li>${s.teaser ? s.title : s.chapter}. ${s.credit}</li>`).join('\n')}
      </ul>
      <p class="credits__src">${page.credits.scans} Built with OGL, GSAP and Lenis.</p>
      <button type="button" id="credits-close">Close</button>
    </dialog>

    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;
}
