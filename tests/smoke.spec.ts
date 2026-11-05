// Smoke tests: read each chapter end to end in a real browser, pass its gate the way a reader would,
// and fail on any console error, page error or failed request. Positions come from the chapter
// data, so moving a gate or adding a scene doesn't break the tests.
import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';
import { chapterOne } from '../src/chapters/one';
import { chapterTwo } from '../src/chapters/two';
import { SCENE_VH, type Chapter } from '../src/story';

/** start of each scene, the gate and the end, in scene units (mirrors app.ts) */
function timeline(c: Chapter) {
  const lengths = c.scenes.map((s) => s.length ?? 1);
  const offsets = lengths.map((_, k) => lengths.slice(0, k).reduce((a, b) => a + b, 0));
  const g = c.scenes.findIndex((s) => s.gate);
  return {
    sceneAt: (id: string) => offsets[c.scenes.findIndex((s) => s.id === id)],
    gate: offsets[g] + c.scenes[g].gate!.at * lengths[g],
    end: lengths.reduce((a, b) => a + b, 0),
  };
}

/** collect everything that would mean the page is broken */
function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`failed: ${r.url()} (${r.failure()?.errorText})`));
  page.on('response', (r) => r.status() >= 400 && problems.push(`${r.status()}: ${r.url()}`));
  return problems;
}

const sceneHeight = (page: Page) => page.evaluate((vh) => (window.innerHeight * vh) / 100, SCENE_VH);

/** scroll to a point on the timeline (scene units), the way a scrollbar drag or keyboard would */
async function scrollTo(page: Page, p: number) {
  const y = p * (await sceneHeight(page));
  await page.evaluate((top) => window.scrollTo(0, top), y);
}
const scrolledP = async (page: Page) => (await page.evaluate(() => window.scrollY)) / (await sceneHeight(page));

/** wait for the animated edition (not the static fallback) to finish loading */
async function opened(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('#loader')).toHaveClass(/is-done/);
  // and for the loader's curtain to finish lifting, so screenshots see the stage
  await page.waitForFunction(() => document.querySelector('#loader')!.getAnimations().length === 0);
  await expect(page.locator('body')).not.toHaveClass(/is-static/);
  await expect(page.locator('canvas.stage')).toHaveCount(1);
}

/** the shader is drawing a plate, not a flat fill (an unloaded plate renders as solid ink) */
async function expectPlateDrawn(page: Page) {
  await expect
    .poll(
      async () => {
        const vp = page.viewportSize()!;
        // the band between the HUD and the hint, where only the canvas is (CSS-pixel scale keeps it cheap)
        const clip = { x: 0, y: vp.height * 0.15, width: vp.width, height: vp.height * 0.5 };
        const png = await page.screenshot({ clip, scale: 'css' });
        const { channels } = await sharp(png).stats();
        return Math.max(...channels.slice(0, 3).map((ch) => ch.stdev));
      },
      { message: 'the canvas should show an inked plate' },
    )
    .toBeGreaterThan(30); // drawn plates measure ~70–100; a flat fill (no plate) ~0
}

test('Chapter One: wakes the ember at the hold gate and reaches the Chapter Two card', async ({ page }) => {
  const problems = watch(page);
  const t = timeline(chapterOne);
  await opened(page, '');
  await expectPlateDrawn(page);

  // the gate is a wall: scrolling to the end stops there
  await scrollTo(page, t.gate);
  await expect(page.locator('#hint')).toContainText('Press and hold');
  await scrollTo(page, t.end);
  await expect.poll(() => scrolledP(page)).toBeCloseTo(t.gate, 1);
  await expect(page.locator('body')).not.toHaveClass(/is-awake/);

  // hold Space for longer than the 1.8s hold
  await page.keyboard.down('Space');
  await page.waitForTimeout(2400);
  await page.keyboard.up('Space');
  await expect(page.locator('body')).toHaveClass(/is-awake/);

  await scrollTo(page, t.end);
  await expect(page.locator('#teaser')).toHaveClass(/is-on/);
  const next = page.getByRole('link', { name: 'Read Chapter Two' });
  await expect(next).toBeVisible();
  expect(problems).toEqual([]);

  // the generated link between chapters works under the deployed base path too
  await next.click();
  await expect(page.locator('html')).toHaveAttribute('data-chapter', 'two');
});

test('Chapter Two: the still gate holds while the reader moves and opens once they stop', async ({ page }) => {
  const problems = watch(page);
  const t = timeline(chapterTwo);
  await opened(page, 'two/');
  await expectPlateDrawn(page);

  await scrollTo(page, t.gate);
  await expect(page.locator('#hint')).toContainText('Be still');

  // keep moving for longer than the 3.2s it takes to go still: the gate must not open
  const vp = page.viewportSize()!;
  for (let k = 0; k < 24; k++) {
    await page.mouse.move(vp.width * (0.3 + (k % 2) * 0.4), vp.height / 2);
    await page.waitForTimeout(200);
  }
  await scrollTo(page, t.end);
  await expect.poll(() => scrolledP(page)).toBeCloseTo(t.gate, 1);

  // now go still
  await expect(page.locator('.caption.is-on', { hasText: 'passed over her, and moved on' })).toBeVisible({ timeout: 20_000 });
  await scrollTo(page, t.end);
  await expect(page.locator('#teaser')).toHaveClass(/is-on/);
  expect(problems).toEqual([]);
});

test('Contents: lists every chapter and jumps within the one being read', async ({ page }) => {
  const problems = watch(page);
  const t = timeline(chapterTwo);
  await opened(page, 'two/');

  await page.locator('#contents-open').click();
  const dialog = page.getByRole('dialog', { name: 'Contents' });
  await expect(dialog).toBeVisible();
  const stories = (c: Chapter) => c.scenes.filter((s) => !s.teaser).length;
  await expect(dialog.getByRole('link')).toHaveCount(stories(chapterOne) + stories(chapterTwo));
  await expect(dialog.getByRole('link', { name: /The Keeper/ })).toHaveAttribute('href', /\/#keeper$/);

  // past the gate: the jump passes it instead of bouncing back
  await dialog.getByRole('link', { name: /The Price/ }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => scrolledP(page)).toBeCloseTo(t.sceneAt('price'), 1);
  await expect(page.locator('#chapter')).toHaveText('XIV');

  await page.locator('#contents-open').click();
  await expect(dialog.getByRole('link', { name: /The Price/ })).toHaveAttribute('aria-current', 'location');
  expect(problems).toEqual([]);
});

test('A #scene link opens that scene, past the gate, and leaves a clean URL', async ({ page }) => {
  const problems = watch(page);
  await opened(page, '#storm');
  await expect(page.locator('#chapter')).toHaveText('VI');
  await expect(page.locator('body')).toHaveClass(/is-awake/);
  expect(new URL(page.url()).hash).toBe('');
  expect(problems).toEqual([]);
});

test('Resume: a later visit offers to continue, and a reload goes straight back', async ({ page }) => {
  const problems = watch(page);
  const t = timeline(chapterTwo);
  // a reader who stopped partway through XII on an earlier visit (seeded once, before any page script runs)
  await page.addInitScript((p) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('emberwake:two', JSON.stringify({ p, open: true }));
  }, t.sceneAt('voice') + 0.4);

  await opened(page, 'two/');
  const card = page.getByRole('complementary', { name: 'Continue reading' });
  await expect(card).toContainText('XII. The Voice');
  await card.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('#chapter')).toHaveText('XII');
  await expect(card).toBeHidden();

  await page.reload();
  await expect(page.locator('#loader')).toHaveClass(/is-done/);
  await expect(page.locator('#chapter')).toHaveText('XII');
  await expect(card).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('Reduced motion: the gate opens by itself', async ({ page }) => {
  const problems = watch(page);
  const t = timeline(chapterOne);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await opened(page, '');
  await scrollTo(page, t.gate + 0.05);
  await expect(page.locator('body')).toHaveClass(/is-awake/);
  await scrollTo(page, t.end);
  await expect(page.locator('#teaser')).toHaveClass(/is-on/);
  expect(problems).toEqual([]);
});

for (const c of [chapterOne, chapterTwo]) {
  test(`Static edition (${c.id}): every plate loads and the contents works`, async ({ page }) => {
    const problems = watch(page);
    await page.goto(`${c.path}?static`);
    await expect(page.locator('body')).toHaveClass(/is-static/);
    const imgs = page.locator('.static__scene img');
    await expect(imgs).toHaveCount(c.scenes.length);
    // plates are lazy: load them all now rather than scrolling
    await imgs.evaluateAll((els) => els.forEach((el) => ((el as HTMLImageElement).loading = 'eager')));
    await expect
      .poll(() => imgs.evaluateAll((els) => els.every((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)))
      .toBe(true);

    await page.getByRole('button', { name: 'Contents' }).click();
    await expect(page.getByRole('dialog', { name: 'Contents' })).toBeVisible();
    expect(problems).toEqual([]);
  });
}
