# Emberwake

A scroll-driven illustrated short story. Public-domain engravings are re-inked in real time by a WebGL shader (red / ink / paper with a vertical line screen), and scenes "melt" into each other column by column as you scroll.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

## How it works

| File | What it does |
|---|---|
| `src/story.ts` | **All the content.** Scenes, camera moves, tone thresholds, captions. Edit this to change the story. |
| `src/shaders.ts` | Fragment shader: cover-fit + Ken Burns camera, 3-tone palette mapping, line screen, ember swirl/glow, and the column "melt" transition. |
| `src/renderer.ts` | OGL setup: one full-screen triangle, progressive texture loading, per-frame uniforms, inset panel layout. |
| `src/depth.ts` | Rasterizes each scene's hand-traced depth polygons into a soft depth map (uploaded as a texture). |
| `src/fx.ts` | 2D canvas layer: ember motes (after the wake) and the scroll-scrubbed debris burst behind the title. |
| `src/audio.ts` | Fully synthesized Web Audio sound: drone, scroll wind, transition whooshes, ember riser, wake bell, impacts. Off by default. |
| `src/main.ts` | Lenis smooth scroll → scene index/progress, the hold-to-wake gate, captions, cursor, finale title. |
| `src/style.css` | Caption cards, HUD, hold cursor, glitch title, loader. |

**Scroll model:** each scene gets `SCENE_VH` (260vh) of scroll. The last `TRANSITION` (38%) of each scene hands over to the next scene, using the transition that scene names:

- `melt`: a jagged column-by-column front with dripping streaks
- `panels`: four comic bands slam in from alternating sides, with paper edges and ink gutters
- `iris`: the next scene opens inside a paper-ringed circular window (set its center with `iris`)

**Inset panels:** a scene's `inset` is a framed close-up of the same engraving. It wipes in, drifts at its own speed for parallax and slowly pushes in. On portrait screens it widens and recenters automatically.

**Layered depth:** a scene's `depth` lists hand-traced polygons (image space, 0–1 from the top-left) with a depth from 0 to 1, plus an optional vertical `gradient` for foregrounds. They're painted into a feathered depth map, and the shader displaces near layers as you scroll and move the mouse, with a soft contact shadow behind them so the figures read like cut-paper layers. `amount` controls how far the nearest layer travels. Keep it around 0.03, because larger values smear thin shapes like wings. Reduced motion disables it.

**Chapter Two teaser:** the last scene has `teaser: true`. The page letterboxes during the melt into it, hides the chapter counter, and shows the Chapter Two card with **Read again** and **Credits**. Scenes can set `length` (a multiple of `SCENE_VH`); the finale uses 1.6 so the title has time to hold before it fades.

**The gate:** on the ember scene, scrolling stops at `GATE_AT` until the reader holds the mouse (or Space/Enter, or a long press on touch) for 1.8s. Waking the ember unlocks the cyan accent, which then shows up in the highlights of later scenes. With `prefers-reduced-motion`, the gate opens automatically and transitions become crossfades.

**Tuning a scene:** `tone: [ink→red, red→paper]` sets the luminance thresholds. Lower values give more red and paper, higher values more ink. `cam.from/to` is `[zoom, centerX, centerY]` in image space (0–1, measured from the top-left corner).

## The story

1. **The Hall.** In the Hall of the Silent Order, magic is weighed, measured, and given only to the chosen. Ione was never chosen. She swept the stairs.
2. **The Keeper.** Old Maelis kept the last ember of a god the Order had killed. On the night he died, he pressed it into her hands.
3. **The Ember** *(hold to wake)*. It was cold. It was quiet. It was waiting for someone to hold on. It woke.
4. **The Burning.** Power is not a gift. It is a fire looking for a door. Wings of smoke tore out of her back.
5. **The Watchers.** The Order felt it wake. Ten thousand spears turned toward a single heartbeat.
6. **The Storm.** They came all at once: spear, wing, and fire. Ione did not know how to fight. The ember did.
7. **The Leap.** So she did the one thing no one had ever dared. She fell upward. *Emberwake.*

*Teaser: Chapter Two, The Ashen Choir.* The Order is not finished with her. Neither is the god.

## Image credits

All illustrations are by Gustave Doré (1832–1883) and are in the public domain. They were converted to grayscale, cropped and auto-leveled.

| Scene | Source plate | Scan |
|---|---|---|
| hall | *Paradise Lost*, Book II: "High on a throne of royal state" | Internet Archive `miltonsparadisel00miltuoft`, page 100 (University of Toronto) |
| keeper | Tennyson, *Vivien*: Merlin and Vivien | Internet Archive `storyofmerlinviv00unse`, page 8 |
| ember | Dante, *Paradiso*, Canto 31 | Wikimedia Commons `Paradiso_Canto_31_(no_caption).jpg` |
| burning | *Paradise Lost*, Book IV: "Me miserable!" | Internet Archive `miltonsparadisel00miltuoft`, page 164 |
| watchers | *Paradise Lost*, Book I: "They heard, and were abashed" | Internet Archive `miltonsparadisel00miltuoft`, page 69 |
| storm | *Paradise Lost*, Book VI: "Now storming fury rose" | Wikimedia Commons `6-207_Now_storming_fury_rose.jpg` |
| leap | *Paradise Lost*, Book III | Wikimedia Commons `Paradise_Lost_12.jpg` |
| perch (teaser) | *Paradise Lost*, Book VI: "Now night her course began" | Wikimedia Commons `6-406_Now_night_her_course_began.jpg` |

Every plate is now at least 1800px wide; the four Internet Archive scans are 2048px.

## Ideas for Chapter Two

- [ ] Write it. *The Ashen Choir*: the Order's singers can unmake magic by naming it.
- [ ] More plates from the same Toronto scan of *Paradise Lost* (it has 50 high-res Doré plates) and the other eight plates in *Vivien*
- [ ] Encode scenes as AVIF/WebP with a JPEG fallback, to bring the 8 MB of art down
