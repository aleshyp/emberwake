// The whole experience is data-driven: each scene is one engraving plus
// camera motion, tone mapping, captions, an optional inset panel, and the
// transition used to leave it. The chapters live in src/chapters/.

export type Caption = {
  text: string;
  /** local-progress window [in, out] within the scene (0..1) */
  at: [number, number];
  /** CSS position for the caption card */
  pos: { top?: string; bottom?: string; left?: string; right?: string };
  /** only show before / after the chapter's gate has been passed */
  when?: 'before' | 'after';
};

/** A framed close-up of the same engraving, floating over the scene with its own parallax. */
export type Inset = {
  /** focal point in image space (0..1 from top-left) */
  center: [number, number];
  /** 1 / fraction of the image height shown */
  zoom: number;
  /** [left, top, width, height] as fractions of the viewport (desktop) */
  rect: [number, number, number, number];
  at: [number, number];
  /** how far (in viewport heights) the panel drifts upward across its window */
  drift: number;
};

/**
 * Hand-traced depth: polygons in image space (0..1 from top-left) painted into a soft depth map.
 * Near layers (depth > 0) slide over the plate with scroll and mouse, casting a contact shadow.
 */
export type Depth = {
  layers: { poly: [number, number][]; depth: number }[];
  /** optional vertical ramp for foregrounds: [yStart, yEnd, depthAtStart, depthAtEnd] */
  gradient?: [number, number, number, number];
  /** how far the nearest layer slides, in image-space units */
  amount: number;
};

export type TransitionKind = 'melt' | 'panels' | 'iris';

/**
 * A soft wall in the scroll that the reader has to pass with an action.
 * - hold: press and hold (pointer, Space/Enter, or long press) to wake the ember
 * - still: stop moving entirely (no pointer, scroll, touch or keys) so the Choir's song passes over
 */
export type Gate = {
  kind: 'hold' | 'still';
  /** local progress inside the scene where scrolling stops */
  at: number;
};

export type Scene = {
  id: string;
  chapter: string;
  title: string;
  /** plate name in public/scenes (see scripts/encode-scenes.mjs for the variants) */
  src: string;
  /** camera keyframes in image space: zoom, center x/y measured from top-left (0..1) */
  cam: { from: [number, number, number]; to: [number, number, number] };
  /** luminance thresholds: below [0] = ink, between = red, above [1] = paper */
  tone: [number, number];
  /** how strongly the brightest areas glow in the accent color once awake */
  power: number;
  /** ember focal point in image space: where the ember glows (and the gate's glow gathers) */
  ember?: [number, number];
  /** at most one scene per chapter */
  gate?: Gate;
  /** how loudly the Ashen Choir sings under this scene (sound only, 0..1) */
  song?: number;
  /** how this scene hands over to the next one */
  transition?: TransitionKind;
  /** iris center in screen space (0..1 from top-left), for 'iris' */
  iris?: [number, number];
  inset?: Inset;
  depth?: Depth;
  /** scroll length as a multiple of SCENE_VH (default 1) */
  length?: number;
  /** the closing teaser for the next chapter: letterboxed, no plate counter */
  teaser?: boolean;
  captions: Caption[];
  /** where the engraving comes from, for the credits (HTML allowed) */
  credit: string;
};

/**
 * The words on a chapter's page that aren't captions: share card, loader, finale title, the
 * next-chapter teaser and credits. src/page.ts renders them into the page (HTML allowed where noted).
 */
export type PageText = {
  /** <meta name="description"> for search results */
  description: string;
  /** Open Graph description for the share card (the card image is public/social/<id>.jpg) */
  shareDescription: string;
  /** alt text for the share card image */
  shareImageAlt: string;
  /** the line under the loader bar */
  loading: string;
  /** the small lines above and below EMBERWAKE on the finale */
  finale: { kicker: string; sub: string };
  /** the next-chapter card on the teaser scene; `line` may hold HTML (e.g. <br />) */
  teaser: { kicker: string; title: string; line: string };
  /** credits paragraphs (HTML): the illustrations, and where the scans came from */
  credits: { art: string; scans: string };
};

export type Chapter = {
  /** matches <html data-chapter> on the chapter's page */
  id: string;
  /** shown in the contents after "Chapter Two:" (optional) */
  title?: string;
  /** the chapter page relative to the site root: '' for the first, 'two/' for the second */
  path: string;
  page: PageText;
  /** the ember is already awake when the chapter opens (everything after Chapter One) */
  startAwake?: boolean;
  scenes: Scene[];
};

/** fraction of each scene spent transitioning into the next */
export const TRANSITION = 0.38;
/** viewport heights of scroll per scene */
export const SCENE_VH = 260;
