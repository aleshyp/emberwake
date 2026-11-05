import { defineConfig, type Plugin } from 'vite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chapters } from './src/chapters';
import { renderPage } from './src/page';

// Where the site is served from, for absolute share-image URLs (Open Graph needs absolute URLs).
// Set SITE_URL yourself, or let the host provide it: Netlify sets URL, Vercel
// VERCEL_PROJECT_PRODUCTION_URL, Cloudflare Pages CF_PAGES_URL.
const env = process.env;
const vercel = env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
const SITE_URL = (env.SITE_URL ?? env.URL ?? vercel ?? env.CF_PAGES_URL ?? '').replace(/\/$/, '');

// Hosting under a subpath (e.g. GitHub Pages at /emberwake/)? Build with BASE_PATH=/emberwake/
const BASE = env.BASE_PATH ?? '/';

/** each chapter's placeholder page, e.g. two/index.html (they only need to exist; see pages()) */
const pageFile = (path: string) => resolve(import.meta.dirname, path, 'index.html');
for (const c of chapters) {
  if (!existsSync(pageFile(c.path)))
    throw new Error(`Chapter "${c.id}" needs a placeholder page at ${c.path}index.html (copy two/index.html).`);
}

/**
 * Renders every chapter page from src/page.ts. The index.html files are placeholders that tell
 * Vite where the pages live; this 'pre' hook swaps in the real page before Vite processes it,
 * in the dev server and in the build alike.
 */
const pages = (): Plugin => ({
  name: 'emberwake-pages',
  transformIndexHtml: {
    order: 'pre',
    handler(_html, ctx) {
      // ctx.path is the page's URL path: '/index.html', '/two/index.html' (the base is already stripped)
      const path = ctx.path.replace(/^\//, '').replace(/index\.html$/, '');
      const chapter = chapters.find((c) => c.path === path);
      if (!chapter) throw new Error(`No chapter has path "${path}" (from ${ctx.path})`);
      return renderPage(chapter, BASE);
    },
  },
});

/** replaces %SITE% in the HTML with the absolute site root (or the base path if it isn't known) */
const siteUrl = (): Plugin => ({
  name: 'emberwake-site-url',
  transformIndexHtml: (html) => html.replaceAll('%SITE%', `${SITE_URL}${BASE}`),
});

export default defineConfig({
  base: BASE,
  plugins: [pages(), siteUrl()],
  build: {
    rolldownOptions: {
      input: Object.fromEntries(chapters.map((c) => [c.id, pageFile(c.path)])),
    },
  },
});
