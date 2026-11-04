export const vertex = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const fragment = /* glsl */ `
precision highp float;

uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uAspA;      // image width / height
uniform float uAspB;
uniform vec3 uCamA;       // zoom, center x, center y (from top)
uniform vec3 uCamB;
uniform vec2 uToneA;      // ink->red, red->paper thresholds
uniform vec2 uToneB;
uniform float uPowA;      // accent strength on highlights
uniform float uPowB;
uniform vec3 uEmberA;     // ember x, y (from top), enabled
uniform vec3 uEmberB;
uniform sampler2D uDepthA; // hand-traced depth maps (black = the plate, white = nearest)
uniform sampler2D uDepthB;
uniform vec2 uParA;        // how far the nearest layer is displaced, image space
uniform vec2 uParB;

uniform float uMix;       // 0 = scene A, 1 = scene B
uniform float uTransType; // 0 melt, 1 panels, 2 iris
uniform vec2 uIris;       // iris center in uv (y from bottom)

uniform vec4 uInsetRect;  // x, y (bottom-left, uv), w, h
uniform vec3 uInsetCam;   // zoom, center x, center y (from top) in image space
uniform float uInsetReveal;

uniform float uTime;
uniform vec2 uRes;        // drawing buffer size in px
uniform float uDpr;
uniform vec2 uMouse;      // -1..1
uniform float uHold;      // 0..1 while holding the ember
uniform float uAwake;     // 0..1 once the ember is woken
uniform float uSpacing;   // line-screen period in px
uniform float uReduced;   // prefers-reduced-motion

uniform vec3 uInk;
uniform vec3 uRed;
uniform vec3 uPaper;
uniform vec3 uAccent;

varying vec2 vUv;

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vnoise(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
}

// object-fit: cover, plus zoom/pan. Center is clamped so we never show past the edge.
vec2 toImage(vec2 uv, float asp, vec3 cam) {
  float scr = uRes.x / uRes.y;
  vec2 s = vec2(1.0);
  if (scr > asp) s.y = asp / scr; else s.x = scr / asp;
  s /= cam.x;
  vec2 h = s * 0.5;
  vec2 c = clamp(vec2(cam.y, 1.0 - cam.z), h, 1.0 - h);
  return c + (uv - 0.5) * s;
}

// line screen: returns 1 where an ink line should be drawn for a given darkness
float lineScreen(float dark, float x) {
  float c = abs(fract(x / uSpacing) - 0.5);
  float w = clamp(dark, 0.0, 1.0) * 0.5;
  float aa = 0.75 / uSpacing;
  return smoothstep(w + aa, w - aa, c);
}

// ink an engraving sample at image-space position p
vec3 shadeAt(sampler2D tex, float asp, vec2 p, vec2 tone, float pw, vec3 ember, float px) {
  float glow = 0.0;
  if (ember.z > 0.5) {
    vec2 c = vec2(ember.x, 1.0 - ember.y);
    vec2 d = (p - c) * vec2(asp, 1.0);
    float r = length(d);
    float a = exp(-r * 3.5) * (uHold * 1.6 + uAwake * (0.35 + 0.15 * sin(uTime * 0.8)));
    float cs = cos(a), sn = sin(a);
    d = mat2(cs, -sn, sn, cs) * d;
    p = c + d / vec2(asp, 1.0);
    float pulse = 0.85 + 0.15 * sin(uTime * 3.0);
    glow = exp(-r * mix(mix(16.0, 8.0, uHold), 10.0, uAwake)) * (0.25 + 0.6 * max(uHold, uAwake)) * pulse;
  }

  float detail = texture2D(tex, p).r;
  float soft = texture2D(tex, p, 1.5).r;
  float l = mix(detail, soft, 0.4) + glow * 0.6;

  float toRed = smoothstep(tone.x - 0.05, tone.x + 0.05, l);
  float toPaper = smoothstep(tone.y - 0.05, tone.y + 0.05, l);
  vec3 col = mix(mix(uInk, uRed, toRed), uPaper, toPaper);

  // vertical engraving lines inside the red band
  float band = toRed * (1.0 - toPaper);
  float within = clamp((l - tone.x) / (tone.y - tone.x), 0.0, 1.0);
  col = mix(col, uInk, lineScreen((1.0 - within) * 0.9, px) * band * 0.6);

  // the magic: highlights take the accent color once powered
  float hi = smoothstep(tone.y + 0.08, 0.98, l);
  col = mix(col, uAccent, hi * pw);
  col = mix(col, uAccent, clamp(glow * 1.2, 0.0, 1.0) * (0.3 + 0.6 * max(uHold, uAwake)));
  return col;
}

vec3 shade(sampler2D tex, sampler2D dep, vec2 par, float asp, vec3 cam, vec2 tone, float pw, vec3 ember, vec2 uv, float px) {
  vec2 p = toImage(uv + uMouse * 0.006, asp, cam);
  // 2.5D layers: look up depth twice so near layers move as solid shapes rather than smearing
  float d = texture2D(dep, p).r;
  d = texture2D(dep, p + par * d).r;
  vec2 q = p + par * d;
  vec3 col = shadeAt(tex, asp, q, tone, pw, ember, px);
  // contact shadow: a nearer layer up-left of this point darkens the plate beneath it (cut-paper look)
  float occ = texture2D(dep, q + vec2(-0.005, 0.007)).r;
  col = mix(col, uInk, clamp((occ - d) * 1.4, 0.0, 1.0) * 0.35);
  return col;
}

vec3 sceneA(vec2 q, float px) { return shade(uTexA, uDepthA, uParA, uAspA, uCamA, uToneA, uPowA, uEmberA, q, px); }
vec3 sceneB(vec2 q, float px) { return shade(uTexB, uDepthB, uParB, uAspB, uCamB, uToneB, uPowB, uEmberB, q, px); }

// ---- transition 0: the melt — a jagged, column-by-column front rising from the bottom ----
vec3 melt(vec2 uv, vec2 px, float m) {
  float column = floor(px.x / uSpacing);
  float colX = (column + 0.5) * uSpacing / uRes.x;
  float cell = fract(px.x / uSpacing);
  float jag = 0.4;
  float n = hash(column) * 0.45 + vnoise(column * 0.06 + 7.0) * 0.55;
  float front = m * (1.0 + jag + 0.35) - n * jag - 0.175;
  float bandA = 0.05 + 0.35 * sin(3.14159 * m);
  float bandB = 0.05 + 0.25 * sin(3.14159 * m);
  float y = uv.y;

  float kA = clamp((y - front) / bandA, 0.0, 1.0);
  float inA = step(front, y);
  float yA = y < front + bandA ? front + bandA * pow(kA, 0.3) : y;
  vec2 qA = vec2(kA < 1.0 ? colX : uv.x, yA);

  float kB = clamp((front - y) / bandB, 0.0, 1.0);
  float yB = y > front - bandB ? front - bandB * pow(kB, 0.3) : y;
  vec2 qB = vec2(kB < 1.0 ? colX : uv.x, yB);

  vec3 a = sceneA(qA, px.x);
  vec3 b = sceneB(qB, px.x);

  float colRand = hash(column + 31.0);
  a = mix(a, uInk, (1.0 - kA) * (0.35 + 0.5 * colRand));
  b = mix(b, uInk, (1.0 - kB) * 0.4 * colRand);
  float gap = smoothstep(0.72, 0.9, cell);
  a = mix(a, uInk, gap * (1.0 - kA));
  b = mix(b, uInk, gap * (1.0 - kB) * 0.7);
  return mix(b, a, inA);
}

// ---- transition 1: comic panels — bands slam in from alternating sides ----
vec3 panels(vec2 uv, vec2 px, float m) {
  float yt = 1.0 - uv.y; // from top
  float k = step(0.24, yt) + step(0.52, yt) + step(0.74, yt);
  float stagger = 0.13;
  float lt = clamp((m - k * stagger) / (1.0 - 3.0 * stagger), 0.0, 1.0);
  float e = 1.0 - pow(1.0 - lt, 3.0);
  float dir = mod(k, 2.0) < 0.5 ? 1.0 : -1.0;
  // the panel's leading edge, in uv.x; panel covers the side it came from
  float edge = dir > 0.0 ? 1.0 - e : e;
  float inside = (uv.x - edge) * dir; // > 0 inside the incoming panel
  float covered = step(0.0, inside) * step(0.0001, e);

  vec2 qB = uv + vec2(dir * (1.0 - e) * 0.3, 0.0);
  vec2 qA = uv - vec2(dir * e * 0.06, 0.0);
  vec3 a = sceneA(qA, px.x);
  vec3 b = sceneB(qB, px.x);
  a = mix(a, uInk, e * 0.35);
  vec3 col = mix(a, b, covered);

  // leading edge: paper strip + ink rule, and a hard shadow on the old scene
  float dpx = inside * uRes.x;
  float live = step(0.0001, e) * step(e, 0.9999);
  float strip = 3.0 * uSpacing;
  col = mix(col, uPaper, live * step(0.0, dpx) * step(dpx, strip));
  col = mix(col, uInk, live * step(strip, dpx) * step(dpx, strip + 2.0 * uDpr));
  col = mix(col, uInk, live * step(dpx, 0.0) * step(-10.0 * uDpr, dpx) * 0.8);

  // gutters between bands
  float g = 4.0 * uDpr * sin(3.14159 * m) + 0.5;
  float dy = min(min(abs(yt - 0.24), abs(yt - 0.52)), abs(yt - 0.74)) * uRes.y;
  col = mix(col, uInk, step(dy, g));
  return col;
}

// ---- transition 2: iris — the next scene opens inside a paper-ringed window ----
vec3 iris(vec2 uv, vec2 px, float m) {
  vec2 c = uIris;
  float asp = uRes.x / uRes.y;
  float r = length((uv - c) * vec2(asp, 1.0));
  float maxR = length(max(c, 1.0 - c) * vec2(asp, 1.0)) + 0.1;
  float R = pow(m, 1.7) * maxR;
  float ring = 0.022 * (1.0 - 0.5 * m);

  vec2 qA = c + (uv - c) / (1.0 + m * 0.3);
  vec2 qB = c + (uv - c) * (1.0 - (1.0 - m) * 0.2);
  vec3 a = sceneA(qA, px.x);
  vec3 b = sceneB(qB, px.x);
  a = mix(a, uInk, smoothstep(R, R + 0.6, r) * m * 0.6);

  float hair = 1.5 * uDpr / uRes.y;
  vec3 col = r < R ? b : a;
  float inRing = step(R, r) * step(r, R + ring);
  col = mix(col, uPaper, inRing);
  col = mix(col, uInk, step(abs(r - R), hair) + step(abs(r - (R + ring)), hair));
  // vertical engraving lines across the ring for texture
  col = mix(col, uInk, inRing * lineScreen(0.25, px.x) * 0.5);
  return col;
}

void main() {
  vec2 uv = vUv;
  vec2 px = gl_FragCoord.xy;
  float m = uMix;

  vec3 color;
  if (m <= 0.0 || m >= 1.0 || uReduced > 0.5) {
    vec3 a = sceneA(uv, px.x);
    vec3 b = sceneB(uv, px.x);
    color = mix(a, b, smoothstep(0.0, 1.0, m));
  } else if (uTransType < 0.5) {
    color = melt(uv, px, m);
  } else if (uTransType < 1.5) {
    color = panels(uv, px, m);
  } else {
    color = iris(uv, px, m);
  }

  // ---- inset panel: a framed close-up with its own parallax ----
  if (uInsetReveal > 0.001) {
    vec2 r0 = uInsetRect.xy * uRes;
    vec2 rs = uInsetRect.zw * uRes;
    vec2 q = px - r0;
    float frame = 6.0 * uDpr;
    float rule = 1.5 * uDpr;
    float shadow = 8.0 * uDpr;
    // wipe from the top down
    float topCut = rs.y * (1.0 - uInsetReveal);
    float inRect = step(0.0, q.x) * step(q.x, rs.x) * step(topCut, q.y) * step(q.y, rs.y);
    vec2 qs = q - vec2(shadow, -shadow);
    float inShadow = step(0.0, qs.x) * step(qs.x, rs.x) * step(topCut, qs.y) * step(qs.y, rs.y);
    color = mix(color, uInk, inShadow * (1.0 - inRect));
    if (inRect > 0.5) {
      vec2 lp = q / rs;
      float rectAsp = rs.x / rs.y;
      float sy = 1.0 / uInsetCam.x;
      vec2 span = vec2(sy * rectAsp / uAspA, sy);
      vec2 c = vec2(uInsetCam.y, 1.0 - uInsetCam.z);
      vec2 p = c + (lp - 0.5) * span + uMouse * 0.004;
      vec3 inner = shadeAt(uTexA, uAspA, p, uToneA, uPowA, uEmberA, px.x);
      float edgeD = min(min(q.x, rs.x - q.x), min(q.y, rs.y - q.y));
      inner = mix(uPaper, inner, step(frame, edgeD));
      inner = mix(inner, uInk, step(edgeD, rule) + step(frame - rule, edgeD) * step(edgeD, frame));
      color = inner;
    }
  }

  // print grain + gentle vignette
  float g = hash2(px + fract(uTime * 7.0) * 100.0) - 0.5;
  color += g * 0.045;
  vec2 v = uv - 0.5;
  color *= 1.0 - dot(v, v) * 0.35;

  gl_FragColor = vec4(color, 1.0);
}
`;
