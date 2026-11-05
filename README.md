# Emberwake

A scroll-driven illustrated story in chapters. Public-domain engravings are re-inked in real time by a WebGL shader (red / ink / paper with a vertical line screen), and scenes "melt" into each other column by column as you scroll.

- **Chapter One** (`/`): the girl who swept the stairs, and the ember she woke.
- **Chapter Two, *The Ashen Choir*** (`/two/`): singers who unmake magic by naming it.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  (Chapter Two at /two/)
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ locally
npm test           # build, then read both chapters in a real browser (see below)
```

Add `?static` to any URL to see the no-WebGL edition, or `#scene-id` (e.g. `two/#thicket`) to open a scene.

### Smoke tests

`npm test` builds the site and runs [tests/smoke.spec.ts](tests/smoke.spec.ts) with Playwright, on a desktop and a phone viewport. Each test fails on any console error, page error or failed request. The tests:

- read Chapter One through the hold gate (holding Space) to the Chapter Two card
- check that Chapter Two's still gate stays shut while the mouse keeps moving, then opens once it stops
- jump with the contents and with a `#scene` link, then check that resuming works
- read with reduced motion on, and check that every plate loads in the static edition

Gate positions come from the chapter data, so changing a chapter doesn't break the tests. The first time, install the browser with `npx playwright install chromium`. In CI the deploy workflow runs the same tests against the exact `/emberwake/` build before publishing it, and uploads traces and screenshots if they fail. `npm run test:only` skips the build.

## How it works

| File | What it does |
|---|---|
| `src/chapters/one.ts`, `two.ts` | **All the content.** Each chapter's scenes, camera moves, tone thresholds, captions, gate. Edit these to change the story. |
| `src/story.ts` | The types (`Scene`, `Gate`, `Chapter`, …) and shared constants. |
| `src/page.ts` | The page template. Every chapter's HTML (share card, loader, HUD, finale title, next-chapter card, credits) is rendered from it and the chapter's data, in the dev server and in the build. |
| `index.html`, `two/index.html` | Placeholders: they only tell Vite where each chapter's page lives. The `emberwake-pages` plugin in `vite.config.ts` swaps in the rendered page. |
| `src/chapters/index.ts` | The list of chapters in reading order. Add new chapters here. |
| `src/main.ts` | Entry point. Picks the chapter, checks for WebGL, then loads either the animated edition or the static one. |
| `src/app.ts` | The animated edition: Lenis smooth scroll → scene index/progress, the gate, captions, cursor, finale title. |
| `src/static.ts` | The static edition for browsers without WebGL: every plate in order with its captions, toned by SVG filters into the same three inks. |
| `src/shaders.ts` | Fragment shader: cover-fit + Ken Burns camera, 3-tone palette mapping, line screen, ember swirl/glow, and the transitions. |
| `src/renderer.ts` | OGL setup: one full-screen triangle, progressive plate loading, per-frame uniforms, inset panel layout, and recovery from a lost WebGL context. |
| `src/images.ts` | Picks AVIF or JPEG and the full or 1280px plate for this screen. |
| `src/depth.ts` | Rasterizes each scene's hand-traced depth polygons into a soft depth map (uploaded as a texture). |
| `src/fx.ts` | 2D canvas layer: ember motes (once awake) and the scroll-scrubbed debris burst behind the title. |
| `src/audio.ts` | Fully synthesized Web Audio sound: drone, scroll wind, transition whooshes, ember riser, wake bell, impacts, and the Ashen Choir. Off by default; pauses when the tab is hidden. |
| `src/contents.ts` | The contents dialog, opened from the plate counter in the HUD: every chapter and scene, linked as `path#scene-id`. |
| `src/progress.ts` | Saves where the reader is in each chapter (localStorage). |
| `src/style.css` | Caption cards, HUD, gate cursor, glitch title, loader, contents, resume card, static edition. |

**Scroll model:** each scene gets `SCENE_VH` (260vh) of scroll. The last `TRANSITION` (38%) of each scene hands over to the next scene, using the transition that scene names:

- `melt`: a jagged column-by-column front with dripping streaks
- `panels`: four comic bands slam in from alternating sides, with paper edges and ink gutters
- `iris`: the next scene opens inside a paper-ringed circular window (set its center with `iris`)

**Inset panels:** a scene's `inset` is a framed close-up of the same engraving. It wipes in, drifts at its own speed for parallax and slowly pushes in. On portrait screens it widens and recenters automatically.

**Layered depth:** a scene's `depth` lists hand-traced polygons (image space, 0–1 from the top-left) with a depth from 0 to 1, plus an optional vertical `gradient` for foregrounds (`layers` can be empty if you only want the gradient). They're painted into a feathered depth map, and the shader displaces near layers as you scroll and move the mouse, with a soft contact shadow behind them so the figures read like cut-paper layers. `amount` controls how far the nearest layer travels. Keep it around 0.03, because larger values smear thin shapes like wings. Reduced motion disables it.

**Next-chapter teaser:** the last scene has `teaser: true`. The page letterboxes during the melt into it, hides the plate counter, and shows the next-chapter card from the chapter's `page.teaser`. Scenes can set `length` (a multiple of `SCENE_VH`); finales are longer (1.6 for Chapter One, 2 for Chapter Two) so the title has time to hold before it fades. The finale title comes in once the scene's last caption has gone (at local progress 0.2 at the earliest).

**Gates:** one scene per chapter can set `gate: { kind, at }`. Scrolling stops at local progress `at` until the reader passes it:

- `hold` (Chapter One, the ember): hold the mouse, Space/Enter, or a long press for 1.8s. Waking the ember unlocks the cyan accent, which then shows up in the highlights of later scenes.
- `still` (Chapter Two, the thicket): stop moving for 3.2s. Any pointer movement, scroll, touch or key resets it. The ember's glow shrinks as she hides and flares when the reader moves, and the Choir swells. It's the inverse of Chapter One: there you hold on, here you let go.

Both are timed by the wall clock, so slow or throttled frames don't change how long they take. Captions can be limited to `when: 'before'` or `'after'` the gate. With `prefers-reduced-motion`, gates open automatically and transitions become crossfades.

**The Choir:** a scene's `song` (0–1) sets how loudly the Ashen Choir sings under it: a synthesized D-minor chord of vibrato voices through moving vowel formants.

**Tuning a scene:** `tone: [ink→red, red→paper]` sets the luminance thresholds. Lower values give more red and paper, higher values more ink. Chapter One averages about 22% ink, 62% red and 16% paper; aim for that balance. `cam.from/to` is `[zoom, centerX, centerY]` in image space (0–1, measured from the top-left corner). `power` sets how much cyan the highlights take once awake; keep it lower on plates with big pale skies.

**Contents, links and resuming:** the plate counter in the HUD ("Plate XI / XIV") opens the contents. Within the current chapter, a link jumps straight to its scene; other chapters load normally. A `#scene-id` in the URL opens that scene, and the hash is then removed so a reload doesn't jump back to it. Jumping past a gate passes it quietly (without the wake sound). The reader's place is saved whenever they move to a new scene and when they leave the page. A reload or back/forward returns them to it. A later visit starts at the top and shows a "Continue from XII. The Voice?" card. Scrolling on without answering counts as starting over. The app handles scroll restoration itself, because the browser's would put a reader past a gate that had closed again.

**No WebGL?** `main.ts` probes for WebGL before loading anything heavy. Without it (or if the engine fails to start), readers get the static edition, which never downloads the WebGL engine. If a mobile browser drops the GPU context mid-read, the renderer rebuilds every texture from the decoded plates it keeps in memory.

## Adding a chapter

1. Write `src/chapters/three.ts`, copying the shape of `two.ts`:
   - `id`, `title` and `path` (`'three/'`)
   - `page`: the share card, loader line, finale title, next-chapter teaser and credits
   - `scenes`: each one with its `credit`, plus a `teaser: true` scene at the end
2. Add it to `chapters` in `src/chapters/index.ts`.
3. Copy `two/index.html` to `three/index.html`. It's a placeholder, and the build stops with a message if one is missing.
4. Add the share card at `public/social/three.jpg` (1200×630) and the plates (below).

Everything else follows from the chapter list: the build's pages, the contents, and the links between chapters. Once Chapter Three exists, Chapter Two's teaser drops "Coming soon" and links to it as "Read Chapter Three". The smoke tests cover Chapters One and Two. Add Chapter Three to their gate tests in `tests/smoke.spec.ts` (`timeline()` takes any chapter).

## Adding a plate

```bash
npm run plate -- path/to/scanned-page.jpg name   # crop to the engraving, grayscale, auto-level → art/name.jpg
npm run encode -- name                            # art/name.jpg → public/scenes/name{,-1280}.{avif,jpg}
```

Then reference it as `src: 'name'` in a chapter. `art/` holds the source plates (not served). `public/scenes/` holds what's served: AVIF at 2048px and 1280px, plus grayscale JPEG fallbacks. Phones (layouts up to ~760 CSS px) get the 1280px set. The line screen is ~3.5 CSS px at any DPR, so a denser screen wouldn't show more detail anyway. Don't denoise plates: it smears the hatching.

Sizes: Chapter One is 4.0 MB of AVIF on desktop and 2.4 MB on phones (it was 7.9 MB of JPEG). Chapter Two is 2.3 MB and 1.5 MB.

## Deploying

It's a static site: `npm run build` and upload `dist/`. Netlify, Vercel, Cloudflare Pages and GitHub Pages all work, using `npm run build` with `dist` as the output folder.

- **Share cards:** Open Graph needs absolute image URLs. The build fills `%SITE%` in the HTML from `SITE_URL`, falling back to the host's own variable (Netlify `URL`, Vercel `VERCEL_PROJECT_PRODUCTION_URL`, Cloudflare `CF_PAGES_URL`). On other hosts, set `SITE_URL=https://your.domain`. The cards are `public/social/one.jpg` and `two.jpg` (1200×630, rendered from the live shader).
- **Subpath hosting** (e.g. GitHub Pages at `/emberwake/`): build with `BASE_PATH=/emberwake/`.
- **Caching:** `public/_headers` sets long-lived caching for fingerprinted assets on Netlify and Cloudflare Pages.

## The story

These are the captions exactly as they appear on screen (the source of truth is `src/chapters/`).

### Chapter One

1. **The Hall.** In the Hall of the Silent Order, magic is weighed, measured, and given only to the chosen. / Ione was never chosen. She swept the stairs.
2. **The Keeper.** Old Maelis kept the last ember of a god the Order had killed. / On the night he died, he pressed it into the hands of the girl who swept the stairs.
3. **The Ember** *(hold to wake)*. It was cold. It was quiet. It was waiting for someone to hold on. / *(once woken)* It woke.
4. **The Burning.** Power is not a gift. It is a fire looking for a door. / Wings of smoke tore out of her back. For the first time in her life, Ione was the door.
5. **The Watchers.** The Order felt it wake. Ten thousand spears turned toward a single heartbeat. / Before the night was out, the Order had a new name for the girl who swept the stairs: Devil.
6. **The Storm.** They came all at once: spear, wing, and fire. / Ione did not know how to fight. The ember did.
7. **The Leap.** So she did the one thing no one had ever dared. She fell upward. *Emberwake: The girl who swept the stairs.*

### Chapter Two: The Ashen Choir

8. **The Edge.** Ione came down at dawn, on the last cliff before the wild country. / Behind her were ten thousand spears. Ahead, nothing had a name yet.
9. **The Choir.** The Order woke the Ashen Choir. They carry swords, but they have never needed them. / They name magic, and it turns to ash. Every name they sing costs them one of their own.
10. **The Ash.** They hunted every witch the Order had never chosen. Every spell they named fell out of the sky. / By nightfall the whole Choir stood, pale as ash, on a hill of quiet witches, listening for one more heartbeat.
11. **The Thicket** *(be still)*. Ione hid where the trees were oldest. The song came looking, one name at a time. / *(once still)* The song passed over her, and moved on.
12. **The Voice.** In the silence, the ember spoke for the first time: "They named me wrong. That is why I am still alive." / "Sing my true name, and I will wake all the way. You have seen what a name costs."
13. **The Answer.** Ione thought of the hill of quiet witches. Then she said yes. / When the Choir found her, she sang first: one word, the god's true name. The sky split open beneath them.
14. **The Price.** When the ash settled, the girl with smoke for wings could not remember her own name. *Emberwake: The girl with no name.*

*Teaser: Chapter Three, The Wild Country.* Beyond the ash, the old gods went to hide. One of them knows her name.

**Threads to carry forward:** the Order and the Choir both name things to destroy them (Devil, ash), and the ember survived because it was named wrong. A girl with no name is someone the Choir can't sing, so the price may also protect her. And the cost rule is now set up: every name the Choir sings costs one of their own, and Ione paid it too.

## Image credits

All illustrations are by Gustave Doré (1832–1883) and are in the public domain. They were converted to grayscale, cropped and auto-leveled.

### Chapter One

| Scene | Source plate | Scan |
|---|---|---|
| hall | *Paradise Lost*, Book II: "High on a throne of royal state" | Internet Archive `miltonsparadisel00miltuoft`, page 100 (University of Toronto) |
| keeper | Tennyson, *Vivien*: Merlin and Vivien | Internet Archive `storyofmerlinviv00unse`, page 8 |
| ember | Dante, *Paradiso*, Canto 31 | Wikimedia Commons `Paradiso_Canto_31_(no_caption).jpg` |
| burning | *Paradise Lost*, Book IV: "Me miserable!" | Internet Archive `miltonsparadisel00miltuoft`, page 164 |
| watchers | *Paradise Lost*, Book I: "They heard, and were abashed" | Internet Archive `miltonsparadisel00miltuoft`, page 69 |
| storm | *Paradise Lost*, Book VI: "Now storming fury rose" | Wikimedia Commons `6-207_Now_storming_fury_rose.jpg` |
| leap | *Paradise Lost*, Book III (flipped vertically, so she rises toward the world above) | Wikimedia Commons `Paradise_Lost_12.jpg` |
| perch (teaser) | *Paradise Lost*, Book VI: "Now night her course began" | Wikimedia Commons `6-406_Now_night_her_course_began.jpg` |

### Chapter Two

All from *Paradise Lost*, Internet Archive `miltonsparadisel00miltuoft` (University of Toronto). Leaf numbers are the archive's `n` page index, e.g. `archive.org/download/miltonsparadisel00miltuoft/page/n167_w2400.jpg`.

| Scene | Source plate | Leaf |
|---|---|---|
| cliff | Book IV, 172–173: "Now to the ascent of that steep savage hill Satan hath journey'd on, pensive and slow" | n167 |
| choir | Book X, 610: "This said, they both betook them several ways" | n394 |
| ridge | Book VI, 410–412: "On the foughten field Michael and his angels, prevalent, encamping…" | n260 |
| thicket | Book IV, 247: "A happy rural seat of various view" | n168 |
| voice | Book VII, 298–299: "Wave rolling after wave, where way they found" | n277 |
| answer | Book VI, 874–875: "Hell at last yawning received them whole" | n238 |
| price | Book IX, 99–100: "O Earth, how like to Heaven, if not preferred more justly" | n321 |
| wild (teaser) | Book II, 628: "Gorgons, and Hydras, and Chimeras dire" | n114 |

Every plate is at least 1800px wide; the Internet Archive scans are 2048px.

## Ideas for Chapter Three

- [ ] Write it. *The Wild Country*: the old gods hid beyond the ash, and one of them knows the name Ione lost.
- [ ] Give Ione a choice that is hers and costs her. In Chapters One and Two the ember fights, speaks and wins.
- [ ] Use namelessness: the Choir can't sing a girl with no name. The price could also be her protection.
- [ ] Unused plates in the same Toronto scan (leaves n5, n55, n76, n145, n181, n237, n249, n283, n284, n290, n341, n342, n373, n384, n428, n453), and the other plates in *Vivien*
- [ ] Hand-trace depth layers for the Chapter Two plates (they only use foreground gradients so far)
- [ ] A third gate that fits the chapter, maybe *naming*: the reader types or chooses her name back
