import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';

// Where the site is served from, for absolute share-image URLs (Open Graph needs absolute URLs).
// Set SITE_URL yourself, or let the host provide it: Netlify sets URL, Vercel
// VERCEL_PROJECT_PRODUCTION_URL, Cloudflare Pages CF_PAGES_URL.
const env = process.env;
const vercel = env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
const SITE_URL = (env.SITE_URL ?? env.URL ?? vercel ?? env.CF_PAGES_URL ?? '').replace(/\/$/, '');

// Hosting under a subpath (e.g. GitHub Pages at /emberwake/)? Build with BASE_PATH=/emberwake/
const BASE = env.BASE_PATH ?? '/';

/** replaces %SITE% in the HTML with the absolute site root (or the base path if it isn't known) */
const siteUrl = (): Plugin => ({
  name: 'emberwake-site-url',
  transformIndexHtml: (html) => html.replaceAll('%SITE%', `${SITE_URL}${BASE}`),
});

export default defineConfig({
  base: BASE,
  plugins: [siteUrl()],
  build: {
    rolldownOptions: {
      input: {
        one: resolve(import.meta.dirname, 'index.html'),
        two: resolve(import.meta.dirname, 'two/index.html'),
      },
    },
  },
});
