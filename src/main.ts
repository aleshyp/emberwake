// Entry point for every chapter page. Each page sets <html data-chapter="…">.
// Readers with WebGL get the animated edition (app.ts); everyone else gets the static plates
// (static.ts). Both are loaded on demand, so the fallback never downloads the WebGL engine.
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import './style.css';
import { chapters } from './chapters';

const chapter = chapters.find((c) => c.id === document.documentElement.dataset.chapter) ?? chapters[0];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    // release the probe's context right away; browsers cap how many can exist at once
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

const staticEdition = (err?: unknown) => {
  if (err) console.error(err);
  return import('./static').then((m) => m.renderStatic(chapter));
};

if (new URLSearchParams(location.search).has('static') || !webglAvailable()) staticEdition();
else
  import('./app')
    .then((m) => m.start(chapter, reduced))
    .catch(staticEdition);
