/* ============================================================
   Flow fields — the hero and footer marks drawn by particles that
   run along their outlines and through their fill

   After colin.cv's hero (the icon-particle morph), with our SVGs in
   place of the icons. Plain WebGL2, no three.js. Two run on the
   page: the logo mark in the hero (CONFIG) and again in the footer
   (FOOTER). They replace js/field-gl.js's ASCII fields; the ASCII
   version of the site is kept in ../site-backup-ascii.

     1. OUTLINES — every closed contour of the SVG (each letter's
        outside and its counters) is sampled by length into one row
        of a float texture. A particle belongs to one contour, has
        its own start along it and runs round it for ever; all
        contours move at the same speed on screen, small ones capped
        so the full stop does not spin. Each sits a random distance
        off the line (uniform over a disc), so a contour reads as a
        soft band rather than a hairline.

        FILL — the shape is hatched inside with strokes at a set
        slant, one band apart, and each stroke is a
        row too: its particles run up it from the foot and start
        again at the bottom, so the bodies of the letters stream
        upward along their stems while the outlines keep the edges.

     2. ENTRANCE — the points start as a slowly turning sphere over
        the word and spring into the outlines, with a swirl that
        peaks halfway (4·m·(1−m)) and is gone when they land. It
        waits for js/loader.js (hero:reveal) like the old field; the
        footer forms the first time it is scrolled into view.

     3. CURSOR — points within a radius of the pointer get a kick
        away from it, each tilted a little at random, and spring back
        (stiff, nearly critically damped). Runs on the CPU only while
        the pointer is over the band or something is still moving.

     4. STRAYS — every 75 ms a larger point leaves an edge of the
        band and flies to the nearest point of the outlines, fading
        as it arrives.

   Placement is the old fields' (js/field-gl.js › CONFIG / FOOTER),
   so both shapes sit exactly where they did. Distances are in px of
   the Figma frame (designWidth is the shape's width there), so the
   same numbers mean the same thing for both shapes. If WebGL2 or
   the SVG fails, the CPU field (js/ascii.js) takes the hero as
   before; the footer band stays empty, as it always did.

   TUNING: press H. The panel is js/field-gl.js's, with a Hero and a
   Footer tab for these fields; values persist in this browser,
   "Copy CONFIG" / "Copy FOOTER" gives the object to paste below.
   Shape values rebuild the particles on the spot. Set DEV_PANEL to
   false to ship.
   ============================================================ */

/* ── Hero ──────────────────────────────────────────────────────── */
/* Tuned in the panel (H) on the site-particles copy. The hero shows
   the logo mark, very large, hung from the top of the band and
   running past it; dark outline, grey hatch leaning back. */
const CONFIG = {
  svg: '../assets/logo.svg',
  designWidth: 964,     // the unit of every distance below (the tune was made with the wordmark's 964)

  /* placement */
  anchorX: 'left',      // 'left': posX moves the shape's left edge from the padding · 'center': its centre from the band's
  anchorY: 'top',       // 'center': posY from the centre · 'top': the shape's top on the band's top
  scale: 390.5,         // % of the band's content width the shape spans
  maxHeight: 1.65,      // never taller than this share of the band
  posX: 0,              // % of the content width (right is +)
  posY: -69.5,          // % of the band's height (down is +)
  rotate: 0,            // degrees, about the shape's centre
  bleed: 0,             // px the canvas reaches past the band on every side

  /* look */
  ink: '#121212',       // outlines
  alpha: 0.09,
  pointSize: 2.5,       // device px
  fillInk: '#7a7a7a',   // the hatch inside the shape
  fillAlpha: 0.64,
  fillPointSize: 2.2,
  softness: 0,          // 0 = hard dots, 1 = fully blurred edge

  /* shape — rebuilt live from the panel; distances in Figma px */
  density: 5,           // particles per px of line, outlines and hatch alike
  maxParticles: 90000,
  minPerContour: 750,   // so a small outline is never sparse
  scatter: 0,           // half-width of the band round each outline
  fill: true,
  hatch: 12,            // between hatch strokes
  fillScatter: 5.5,     // the hatch band
  fillInset: 0,         // how far the hatch keeps off the edges
  slant: -0.72,         // the hatch's lean, dx/dy

  /* flow */
  flowSpeed: 15,        // px per second along a line
  maxRate: 9.5,         // short outlines run at most this many laps per long one

  /* entrance */
  sphere: 3,            // sphere radius, × the shape's height
  fadeIn: 3,            // s for the sphere to fade in
  hold: 3,              // s from the start of the fade until it starts to form
  springK: 31,          // the forming spring — about 2 s to land
  springD: 17.2,        // ζ ≈ 1.5: overdamped, settles without overshoot
  swirl: 250,           // px — the mid-morph turbulence

  /* cursor */
  mouseRadius: 132,     // px
  mousePush: 1800,      // px/s kick at the centre
  dispK: 47.5,
  dispD: 40,

  /* strays */
  flyCount: 177,
  flyEvery: 485,        // ms
  flyLife: 2.6,         // s
  flySize: 2.6,         // device px
  flyAlpha: 1,

  minWidth: 1040
};

/* ── Footer — the logo mark, large, between contacts and copyright ──
   Tuned in the panel too: hung from the band's top, light ink on the
   #121212 footer and kept very faint. */
const FOOTER = {
  svg: '../assets/logo.svg',
  designWidth: 1123,

  anchorX: 'left',
  anchorY: 'top',
  scale: 270,
  maxHeight: 1,
  posX: 0,
  posY: 0,
  rotate: 0,
  bleed: 0,

  ink: '#F5F3EE',
  alpha: 0.02,
  pointSize: 4.1,
  fillInk: '#F5F3EE',
  fillAlpha: 0.05,
  fillPointSize: 4.7,
  softness: 0,

  density: 5,
  maxParticles: 95000,
  minPerContour: 1080,
  scatter: 0,
  fill: true,
  hatch: 8,
  fillScatter: 20,
  fillInset: 14,
  slant: -0.54,

  flowSpeed: 26,
  maxRate: 9.5,

  sphere: 0.45,
  fadeIn: 0.25,
  hold: 0.1,
  springK: 16,
  springD: 7.2,
  swirl: 46,

  mouseRadius: 123,
  mousePush: 1760,
  dispK: 52.5,
  dispD: 40,

  flyCount: 111,
  flyEvery: 225,
  flyLife: 5.4,
  flySize: 3.5,
  flyAlpha: 0.35,

  minWidth: 1024
};

const DEV_PANEL = true;            // ← set false to ship
const STORE_KEYS = { hero: 'field-flow-v1', footer: 'field-flow-footer-v1' };
/* values that change the particles themselves — the panel rebuilds */
const REBUILD = ['density', 'maxParticles', 'minPerContour', 'scatter', 'fill', 'hatch', 'fillScatter', 'fillInset', 'slant', 'maxRate'];

const TEX_W = 1024;
const html = document.documentElement;
const heroStage = document.getElementById('ascii-bg');
const footerStage = document.getElementById('footer-field');
const NS = 'http://www.w3.org/2000/svg';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Claim both bands before js/field-gl.js looks (modules run in order). */
if (html.dataset.field === 'gl') {
  if (heroStage) window.__flowHero = true;
  if (footerStage) window.__flowFooter = true;
}

function fallback(reason) {
  console.warn('[flow] not used:', reason);
  window.__flowHero = false;
  if (window.__fieldDone) return;
  window.__fieldDone = true;
  html.dataset.field = 'cpu';
  window.dispatchEvent(new Event('field:fallback'));
}

/* ── Shaders ─────────────────────────────────────────────────── */
const VERT = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uPath;
uniform float uFlow;       // drives the run along the lines
uniform float uTime;       // slow clock for the swirl and the sphere
uniform float uMorph;      // 0 sphere → 1 word
uniform vec4  uM;          // SVG → canvas px: scale and rotation (x' = m.x·x + m.y·y, y' = m.z·x + m.w·y)
uniform vec2  uT;          //   … plus this offset
uniform vec2  uRes;        // band, css px
uniform vec2  uSphereC;    // px
uniform float uSphereR;    // px
uniform float uSwirl;
uniform float uSize;
uniform float uFillSize;
in float aRow;
in float aPhase;
in float aSpeed;
in float aFill;            // 1 on a hatch stroke, 0 on an outline
in vec2  aScatter;         // SVG units, off the line
in vec3  aRnd;
in vec3  aSphere;
in vec2  aDisp;            // px, cursor
out float vAlpha;
out float vFill;
void main() {
  float ph = fract(aPhase + uFlow * aSpeed);
  vec2 p = texelFetch(uPath, ivec2(int(ph * ${TEX_W}.0), int(aRow)), 0).xy + aScatter;
  vec2 word = vec2(dot(uM.xy, p), dot(uM.zw, p)) + uT;

  float rot = uTime * 0.8;
  float c = cos(rot), s = sin(rot);
  vec3 sp = vec3(aSphere.x * c - aSphere.z * s, aSphere.y, aSphere.x * s + aSphere.z * c);
  vec2 sphere = uSphereC + vec2(sp.x, -sp.y) * uSphereR;
  float depth = 0.45 + 0.55 * (sp.z * 0.5 + 0.5);

  float m = clamp(uMorph, 0.0, 1.0);
  float chaos = 4.0 * m * (1.0 - m);
  float t = uTime;
  vec2 turb = vec2(
    sin(aRnd.x * 11.3 + t * 2.1) * cos(aRnd.y * 7.9 + t * 1.6),
    cos(aRnd.z *  9.2 + t * 1.4) * sin(aRnd.x * 5.3 + t * 2.5)
  ) * chaos * uSwirl;

  vec2 pos = mix(sphere, word, uMorph) + turb + aDisp;
  vAlpha = mix(depth, 1.0, m);
  vFill = aFill;
  gl_Position = vec4(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0, 0.0, 1.0);
  gl_PointSize = mix(uSize, uFillSize, aFill) * mix(0.8, 1.0, m);
}`;

const FRAG = `#version 300 es
precision mediump float;
uniform vec3 uInk;
uniform vec3 uFillInk;
uniform float uAlpha;
uniform float uFillAlpha;
uniform float uSoft;
uniform float uShown;
in float vAlpha;
in float vFill;
out vec4 outColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float edge = 1.0 - smoothstep(0.5 - 0.5 * uSoft - 0.001, 0.5, d);
  float a = mix(uAlpha, uFillAlpha, vFill) * vAlpha * edge * uShown;
  outColor = vec4(mix(uInk, uFillInk, vFill) * a, a);
}`;

const FLY_VERT = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uSize;
in vec2 aPos;
in float aA;
out float vA;
void main() {
  vA = aA;
  gl_Position = vec4(aPos.x / uRes.x * 2.0 - 1.0, 1.0 - aPos.y / uRes.y * 2.0, 0.0, 1.0);
  gl_PointSize = uSize * aA;
}`;

const FLY_FRAG = `#version 300 es
precision mediump float;
uniform vec3 uInk;
uniform float uAlpha;
uniform float uSoft;
in float vA;
out vec4 outColor;
void main() {
  if (vA < 0.01) discard;
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float edge = 1.0 - smoothstep(0.5 - 0.5 * uSoft - 0.001, 0.5, d);
  float a = uAlpha * vA * edge;
  outColor = vec4(uInk * a, a);
}`;

/* ── Helpers ─────────────────────────────────────────────────── */
const hexToVec = (hex) => {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
};

function program(gl, vs, fs) {
  const make = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  const p = gl.createProgram();
  gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  for (let i = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i--;) {
    const name = gl.getActiveUniform(p, i).name;
    u[name] = gl.getUniformLocation(p, name);
  }
  return { p, u };
}

/* A buffer bound to an attribute of the VAO that is bound now. Data
   is set later with fill(), so a rebuild can resize it. */
function attr(gl, prog, name, size) {
  const loc = gl.getAttribLocation(prog, name);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  if (loc >= 0) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  }
  return buf;
}
function fill(gl, buf, data, usage) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW);
}

/* Each closed contour of the SVG, sampled evenly by length, in the
   SVG's own coordinates. The SVG is put in the page (off screen) so
   every shape — paths, rects, anything with a transform — can be
   measured and mapped by its own CTM. A path is cut at each M into
   its contours, so a letter's outside and its counters are rows of
   their own (only for absolute paths; a relative one stays whole).
   The fill is rasterised from the same file, nonzero and evenodd as
   it declares them, into a mask the hatch reads. */
async function sampleShape(svgText) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = doc.documentElement;
  const v = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  const vb = v.length === 4 && v.every(Number.isFinite)
    ? { x: v[0], y: v[1], w: v[2], h: v[3] }
    : { x: 0, y: 0, w: parseFloat(root.getAttribute('width')) || 100, h: parseFloat(root.getAttribute('height')) || 100 };

  const host = document.createElementNS(NS, 'svg');
  host.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:10px;height:10px;overflow:hidden');
  const g = document.createElementNS(NS, 'g');
  [...root.childNodes].forEach((n) => g.appendChild(document.importNode(n, true)));
  host.appendChild(g);
  document.body.appendChild(host);

  const contours = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const sample = (el) => {
    const raw = el.getTotalLength();
    const m = el.getCTM();
    const len = raw * Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
    if (!(len > 0.05)) return;
    const pts = new Float32Array(TEX_W * 2);
    for (let j = 0; j < TEX_W; j++) {
      const q = el.getPointAtLength(j / TEX_W * raw);
      const x = m.a * q.x + m.c * q.y + m.e, y = m.b * q.x + m.d * q.y + m.f;
      pts[j * 2] = x; pts[j * 2 + 1] = y;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    contours.push({ pts, len, fill: false });
  };
  try {
    g.querySelectorAll('path, rect, circle, ellipse, polygon, polyline').forEach((el) => {
      if (el.closest('defs, clipPath, mask')) return;
      const d = el.tagName === 'path' ? el.getAttribute('d') || '' : null;
      if (d === null || /m/.test(d.slice(1))) { sample(el); return; }
      d.split(/(?=M)/).map((x) => x.trim()).filter(Boolean).forEach((sub) => {
        const part = document.createElementNS(NS, 'path');
        part.setAttribute('d', sub);
        if (el.hasAttribute('transform')) part.setAttribute('transform', el.getAttribute('transform'));
        el.parentNode.insertBefore(part, el);
        sample(part);
        part.remove();
      });
    });
  } finally {
    host.remove();
  }
  if (!contours.length) throw new Error('no shapes in the SVG');
  const box = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

  /* the fill, as alpha, about 2000 px across */
  const res = 2000 / Math.max(vb.w, vb.h), pad = 0.02 * Math.max(vb.w, vb.h);
  root.setAttribute('width', vb.w * res); root.setAttribute('height', vb.h * res);
  root.setAttribute('preserveAspectRatio', 'none');
  root.removeAttribute('style');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)], { type: 'image/svg+xml' }));
  const img = new Image();
  try {
    img.src = url;
    await img.decode();
  } finally {
    URL.revokeObjectURL(url);
  }
  const c = document.createElement('canvas');
  c.width = Math.ceil((vb.w + pad * 2) * res); c.height = Math.ceil((vb.h + pad * 2) * res);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, pad * res, pad * res, vb.w * res, vb.h * res);
  const mask = { data: ctx.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height, res, ox: pad - vb.x, oy: pad - vb.y };
  return { contours, box, mask };
}

/* Strokes inside the shape at a slant: each line x + slant·y = u is
   walked from the foot up, and every run of points at least fillInset
   inside becomes one stroke, pointing up. `unit` is SVG units per
   Figma px. */
function hatchRows(mask, box, cfg, unit) {
  const at = (x, y) => {
    const px = Math.round((x + mask.ox) * mask.res), py = Math.round((y + mask.oy) * mask.res);
    return px >= 0 && py >= 0 && px < mask.w && py < mask.h && mask.data[(py * mask.w + px) * 4 + 3] > 127;
  };
  const e = cfg.fillInset * unit, ed = e * 0.7071;
  const inside = (x, y) => at(x, y) && (e <= 0 || (at(x - e, y) && at(x + e, y) && at(x, y - e) && at(x, y + e) &&
    at(x - ed, y - ed) && at(x + ed, y - ed) && at(x - ed, y + ed) && at(x + ed, y + ed)));

  const k = cfg.slant, h = Math.max(1, cfg.hatch) * unit, STEP = 0.5 * unit, len1 = Math.sqrt(1 + k * k);
  const y0 = box.y + box.h, y1 = box.y;            // foot → top
  const rows = [];
  const add = (u, ya, yb) => {
    const len = (ya - yb) * len1;
    if (len < 2 * unit) return;
    const pts = new Float32Array(TEX_W * 2);
    for (let j = 0; j < TEX_W; j++) {
      const y = ya - (ya - yb) * j / (TEX_W - 1);
      pts[j * 2] = u - k * y; pts[j * 2 + 1] = y;
    }
    rows.push({ pts, len, fill: true });
  };
  const uMin = Math.min(box.x + k * box.y, box.x + k * y0), uMax = Math.max(box.x + box.w + k * y0, box.x + box.w + k * box.y);
  for (let u = uMin + h / 2; u < uMax; u += h) {
    let start = null;
    for (let y = y0; y >= y1 - STEP; y -= STEP) {
      const inn = y >= y1 && inside(u - k * y, y);
      if (inn && start === null) start = y;
      if (!inn && start !== null) { add(u, start, y + STEP); start = null; }
    }
  }
  return rows;
}

/* ── The field ───────────────────────────────────────────────── */
async function start(stage, cfg, { primary = false } = {}) {
  const svgText = await (await fetch(new URL(cfg.svg, import.meta.url))).text();
  const { contours, box, mask } = await sampleShape(svgText);
  if (primary && window.__fieldDone) return null;   // the 6 s watchdog started the CPU field
  /* SVG units per Figma px: every distance in cfg is in Figma px */
  const unit = box.w / cfg.designWidth;

  const canvas = document.createElement('canvas');
  canvas.className = 'ascii-bg__gl';
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) throw new Error('no WebGL2');
  const maxRows = gl.getParameter(gl.MAX_TEXTURE_SIZE);

  const main = program(gl, VERT, FRAG);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const B = {
    row: attr(gl, main.p, 'aRow', 1), phase: attr(gl, main.p, 'aPhase', 1),
    speed: attr(gl, main.p, 'aSpeed', 1), fill: attr(gl, main.p, 'aFill', 1),
    scatter: attr(gl, main.p, 'aScatter', 2), rnd: attr(gl, main.p, 'aRnd', 3),
    sphere: attr(gl, main.p, 'aSphere', 3), disp: attr(gl, main.p, 'aDisp', 2)
  };
  gl.bindVertexArray(null);

  const pathTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, pathTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  /* Everything a rebuild replaces. The frame reads these through the
     closure, so swapping them is enough. */
  let rows, tex, N = 0, aRow, aPhase, aSpeed, aScatter, aRnd;
  let disp, vx, vy, mCos, mSin, mMag, near, bakedSpeed = cfg.flowSpeed;

  function build() {
    rows = contours.slice();
    if (cfg.fill) rows.push(...hatchRows(mask, box, cfg, unit));
    if (rows.length > maxRows) rows.length = maxRows;
    const R = rows.length;

    /* outlines and strokes → texture (RGBA32F: x, y, –, –) */
    tex = new Float32Array(TEX_W * R * 4);
    rows.forEach((r, ri) => {
      for (let j = 0; j < TEX_W; j++) {
        const o = (ri * TEX_W + j) * 4;
        tex[o] = r.pts[j * 2]; tex[o + 1] = r.pts[j * 2 + 1]; tex[o + 3] = 1;
      }
    });
    gl.bindTexture(gl.TEXTURE_2D, pathTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, TEX_W, R, 0, gl.RGBA, gl.FLOAT, tex);

    /* Same density on every line; an outline never gets fewer than
       minPerContour, so the counters and the full stop stay solid. */
    const total = rows.reduce((s, r) => s + r.len, 0);
    const density = Math.min(cfg.density / unit, cfg.maxParticles / total);
    const alloc = rows.map((r) => Math.max(r.fill ? 1 : Math.round(cfg.minPerContour), Math.round(r.len * density)));
    N = alloc.reduce((s, a) => s + a, 0);
    const maxLen = Math.max(...contours.map((r) => r.len));
    bakedSpeed = cfg.flowSpeed || 1;
    const speedU = bakedSpeed * unit, stub = 40 * unit;
    const base = speedU / maxLen;

    aRow = new Float32Array(N); aPhase = new Float32Array(N); aSpeed = new Float32Array(N);
    const aFill = new Float32Array(N);
    aScatter = new Float32Array(N * 2); aRnd = new Float32Array(N * 3);
    const aSphere = new Float32Array(N * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    let w = 0;
    rows.forEach((r, ri) => {
      /* hatch strokes run at the outline speed; a stub at a letter's
         edge is treated as 40 long so it does not flicker */
      const speed = r.fill ? speedU / Math.max(r.len, stub) : base * Math.min(maxLen / r.len, cfg.maxRate);
      for (let k = 0; k < alloc[ri]; k++, w++) {
        aRow[w] = ri; aPhase[w] = Math.random(); aSpeed[w] = speed; aFill[w] = r.fill ? 1 : 0;
      }
    });
    for (let i = 0; i < N; i++) {
      const rx = (Math.random() - 0.5) * 0.4, ry = (Math.random() - 0.5) * 0.4, rz = (Math.random() - 0.5) * 0.3;
      aRnd[i * 3] = rx; aRnd[i * 3 + 1] = ry; aRnd[i * 3 + 2] = rz;
      const band = (aFill[i] ? cfg.fillScatter : cfg.scatter) * unit;
      const ang = rx * 15.708, rad = Math.sqrt(Math.abs(ry) * 5) * band;   // colin: uniform over a disc
      aScatter[i * 2] = Math.cos(ang) * rad; aScatter[i * 2 + 1] = Math.sin(ang) * rad;
      /* Fibonacci sphere, in a shuffled order so the sphere does not
         map contours onto bands of latitude */
      const k = (i * 7919) % N;
      const y = 1 - (k / Math.max(N - 1, 1)) * 2, rr = Math.sqrt(Math.max(0, 1 - y * y)), th = golden * k;
      aSphere[i * 3] = Math.cos(th) * rr; aSphere[i * 3 + 1] = y; aSphere[i * 3 + 2] = Math.sin(th) * rr;
    }
    disp = new Float32Array(N * 2);
    fill(gl, B.row, aRow); fill(gl, B.phase, aPhase); fill(gl, B.speed, aSpeed); fill(gl, B.fill, aFill);
    fill(gl, B.scatter, aScatter); fill(gl, B.rnd, aRnd); fill(gl, B.sphere, aSphere);
    fill(gl, B.disp, disp, gl.DYNAMIC_DRAW);

    /* cursor: the same random tilt and strength per point as colin */
    vx = new Float32Array(N); vy = new Float32Array(N);
    mCos = new Float32Array(N); mSin = new Float32Array(N); mMag = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const tilt = aRnd[i * 3 + 2] * 1.2;
      mCos[i] = Math.cos(tilt); mSin[i] = Math.sin(tilt); mMag[i] = 0.5 + Math.abs(aRnd[i * 3]);
    }
    active = false;

    /* every 8th sample of every outline, for the strays' "nearest point" */
    near = [];
    contours.forEach((r) => { for (let j = 0; j < TEX_W; j += 8) near.push(r.pts[j * 2], r.pts[j * 2 + 1]); });
  }

  /* strays */
  const flyProg = program(gl, FLY_VERT, FLY_FRAG);
  const flyVao = gl.createVertexArray();
  gl.bindVertexArray(flyVao);
  const flyPosBuf = attr(gl, flyProg.p, 'aPos', 2);
  const flyABuf = attr(gl, flyProg.p, 'aA', 1);
  gl.bindVertexArray(null);
  let F = 0, fly = null;
  function buildFly() {
    F = Math.max(1, Math.round(cfg.flyCount));
    fly = {
      sx: new Float32Array(F), sy: new Float32Array(F), ex: new Float32Array(F), ey: new Float32Array(F),
      t0: new Float32Array(F).fill(-1e3),
      dx: new Float32Array(F), dy: new Float32Array(F), vx: new Float32Array(F), vy: new Float32Array(F),
      cos: new Float32Array(F), sin: new Float32Array(F), mag: new Float32Array(F),
      pos: new Float32Array(F * 2), a: new Float32Array(F), next: 0
    };
    for (let i = 0; i < F; i++) {
      const tilt = (Math.random() - 0.5) * 1.2;
      fly.cos[i] = Math.cos(tilt); fly.sin[i] = Math.sin(tilt); fly.mag[i] = 0.5 + Math.random();
    }
    fill(gl, flyPosBuf, fly.pos, gl.DYNAMIC_DRAW);
    fill(gl, flyABuf, fly.a, gl.DYNAMIC_DRAW);
  }

  let active = false;
  build();
  buildFly();

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  let ink = hexToVec(cfg.ink), fillInk = hexToVec(cfg.fillInk);

  /* ── size and placement ─────────────────────────────────────── */
  let W = 0, H = 0, dpr = 1;
  const X = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }, sphere = { x: 0, y: 0, r: 1 };
  function resize() {
    const SW = stage.clientWidth, SH = stage.clientHeight;
    if (!SW || !SH) return;
    /* Bleed: the canvas reaches this far past the band on every side,
       so a shape scaled past the band is not cut at its edges (the
       hero section still clips at its own box). */
    const bl = Math.max(0, cfg.bleed || 0);
    W = SW + bl * 2; H = SH + bl * 2;
    Object.assign(canvas.style, bl
      ? { left: -bl + 'px', top: -bl + 'px', width: W + 'px', height: H + 'px' }
      : { left: '', top: '', width: '', height: '' });
    stage.style.overflow = bl ? 'visible' : '';
    stage.style.contain = bl ? 'none' : '';
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);

    const cs = getComputedStyle(stage);
    const padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
    const inner = SW - padL - padR;
    const s = Math.min((cfg.scale / 100) * inner / box.w, (SH * cfg.maxHeight) / box.h);
    /* the shape's centre, in band px, then moved onto the canvas */
    const cx = (cfg.anchorX === 'center'
      ? SW / 2 + inner * cfg.posX / 100
      : padL + inner * cfg.posX / 100 + box.w * s / 2) + bl;
    const cy = (cfg.anchorY === 'top'
      ? (box.h * s) / 2 + SH * cfg.posY / 100
      : SH / 2 + SH * cfg.posY / 100) + bl;
    /* scale and turn about the shape's centre */
    const r = (cfg.rotate || 0) * Math.PI / 180, co = Math.cos(r), si = Math.sin(r);
    const bx = box.x + box.w / 2, by = box.y + box.h / 2;
    X.a = s * co; X.b = -s * si; X.c = s * si; X.d = s * co;
    X.tx = cx - X.a * bx - X.b * by;
    X.ty = cy - X.c * bx - X.d * by;
    sphere.x = cx; sphere.y = cy; sphere.r = box.h * s * cfg.sphere;
  }

  /* ── pointer ────────────────────────────────────────────────── */
  let mx = -1e4, my = -1e4;
  if (matchMedia('(hover: hover)').matches) {
    window.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      mx = inside ? x : -1e4; my = inside ? y : -1e4;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { mx = my = -1e4; });
    window.addEventListener('scroll', () => { mx = my = -1e4; }, { passive: true });
  }

  /* ── entrance state ─────────────────────────────────────────── */
  /* the hero waits for the loader; the footer only ever runs on screen,
     so it forms the first time it is scrolled into view */
  const gated = () => primary && window.__heroGate && !window.__heroReveal;
  let shown = reduced ? 1 : 0;           // fades the sphere in
  let morph = reduced ? 1 : 0, mv = 0;   // spring 0 → 1
  let sinceShown = reduced ? 1e3 : 0;
  let flow = 0, slow = 0, clock = 0, lastSpawn = 0;

  function spawn() {
    const i = fly.next++ % F;
    const hw = W * 0.46, hh = H * 0.46, cx = W / 2, cy = H / 2;
    const edge = Math.floor(Math.random() * 4), u = Math.random() * 2 - 1;
    const sx = edge === 1 ? cx + hw : edge === 3 ? cx - hw : cx + u * hw;
    const sy = edge === 0 ? cy - hh : edge === 2 ? cy + hh : cy + u * hh;
    let best = Infinity, bx = 0, by = 0;
    for (let j = 0; j < near.length; j += 2) {
      const qx = near[j], qy = near[j + 1];
      const px = X.a * qx + X.b * qy + X.tx, py = X.c * qx + X.d * qy + X.ty;
      const d = (px - sx) ** 2 + (py - sy) ** 2;
      if (d < best) { best = d; bx = px; by = py; }
    }
    fly.sx[i] = sx; fly.sy[i] = sy; fly.ex[i] = bx; fly.ey[i] = by;
    fly.t0[i] = clock;
    fly.dx[i] = fly.dy[i] = fly.vx[i] = fly.vy[i] = 0;
  }

  /* ── frame ──────────────────────────────────────────────────── */
  let last = 0;
  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    clock += dt;

    if (!reduced && !gated()) {
      shown = cfg.fadeIn > 0 ? Math.min(1, shown + dt / cfg.fadeIn) : 1;
      sinceShown += dt;
      if (sinceShown > cfg.hold && morph < 1) {
        const a = -cfg.springK * (morph - 1) - cfg.springD * mv;
        mv += a * dt; morph += mv * dt;
        if (Math.abs(morph - 1) < 0.0005 && Math.abs(mv) < 0.0005) { morph = 1; mv = 0; }
      }
    }
    /* the speeds are baked at build time; the panel's speed scales the clock */
    if (!reduced) { flow += dt * cfg.flowSpeed / bakedSpeed; slow += dt * 0.24; }

    /* cursor springs, on the CPU, only while something can move */
    const mouseOn = mx > -1e3 && morph > 0.9 && cfg.mousePush > 0;
    if (mouseOn || active) {
      const R2 = cfg.mouseRadius * cfg.mouseRadius;
      let still = true;
      for (let i = 0; i < N; i++) {
        let dx = disp[i * 2], dy = disp[i * 2 + 1];
        if (mouseOn) {
          const ph = aPhase[i] + flow * aSpeed[i];
          const j = ((ph - Math.floor(ph)) * TEX_W) | 0;
          const o = (aRow[i] * TEX_W + j) * 4;
          const qx = tex[o] + aScatter[i * 2], qy = tex[o + 1] + aScatter[i * 2 + 1];
          const px = X.a * qx + X.b * qy + X.tx + dx;
          const py = X.c * qx + X.d * qy + X.ty + dy;
          const ex = px - mx, ey = py - my, d2 = ex * ex + ey * ey;
          if (d2 < R2 && d2 > 1e-6) {
            const d = Math.sqrt(d2), push = (1 - d / cfg.mouseRadius) * cfg.mousePush * mMag[i];
            const nx = ex / d, ny = ey / d;
            vx[i] += (nx * mCos[i] - ny * mSin[i]) * push;
            vy[i] += (nx * mSin[i] + ny * mCos[i]) * push;
          }
        }
        vx[i] += (-cfg.dispK * dx - cfg.dispD * vx[i]) * dt;
        vy[i] += (-cfg.dispK * dy - cfg.dispD * vy[i]) * dt;
        dx += vx[i] * dt; dy += vy[i] * dt;
        if (Math.abs(dx) < 0.01 && Math.abs(vx[i]) < 0.01) { dx = 0; vx[i] = 0; }
        if (Math.abs(dy) < 0.01 && Math.abs(vy[i]) < 0.01) { dy = 0; vy[i] = 0; }
        disp[i * 2] = dx; disp[i * 2 + 1] = dy;
        if (dx || dy || vx[i] || vy[i]) still = false;
      }
      active = !still;
      gl.bindBuffer(gl.ARRAY_BUFFER, B.disp);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, disp);
    }

    /* strays */
    if (!reduced && morph > 0.85 && cfg.flyEvery > 0 && (clock - lastSpawn) * 1000 >= cfg.flyEvery) { lastSpawn = clock; spawn(); }
    for (let i = 0; i < F; i++) {
      const age = clock - fly.t0[i];
      if (age <= 0 || age >= cfg.flyLife) { fly.a[i] = 0; continue; }
      const p = age / cfg.flyLife;
      const bx = fly.sx[i] + (fly.ex[i] - fly.sx[i]) * p, by = fly.sy[i] + (fly.ey[i] - fly.sy[i]) * p;
      if (mx > -1e3) {
        const ex = bx + fly.dx[i] - mx, ey = by + fly.dy[i] - my, d2 = ex * ex + ey * ey;
        if (d2 < cfg.mouseRadius ** 2 && d2 > 1e-6) {
          const d = Math.sqrt(d2), push = (1 - d / cfg.mouseRadius) * cfg.mousePush * fly.mag[i];
          const nx = ex / d, ny = ey / d;
          fly.vx[i] += (nx * fly.cos[i] - ny * fly.sin[i]) * push;
          fly.vy[i] += (nx * fly.sin[i] + ny * fly.cos[i]) * push;
        }
      }
      fly.vx[i] += (-cfg.dispK * fly.dx[i] - cfg.dispD * fly.vx[i]) * dt;
      fly.vy[i] += (-cfg.dispK * fly.dy[i] - cfg.dispD * fly.vy[i]) * dt;
      fly.dx[i] += fly.vx[i] * dt; fly.dy[i] += fly.vy[i] * dt;
      fly.pos[i * 2] = bx + fly.dx[i]; fly.pos[i * 2 + 1] = by + fly.dy[i];
      fly.a[i] = p < 0.82 ? 1 : Math.max(0, 1 - (p - 0.82) / 0.18);
    }

    /* draw */
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (shown <= 0) return;

    gl.useProgram(main.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pathTex);
    const u = main.u;
    gl.uniform1i(u.uPath, 0);
    gl.uniform1f(u.uFlow, flow);
    gl.uniform1f(u.uTime, slow);
    gl.uniform1f(u.uMorph, morph);
    gl.uniform4f(u.uM, X.a, X.b, X.c, X.d);
    gl.uniform2f(u.uT, X.tx, X.ty);
    gl.uniform2f(u.uRes, W, H);
    gl.uniform2f(u.uSphereC, sphere.x, sphere.y);
    gl.uniform1f(u.uSphereR, sphere.r);
    gl.uniform1f(u.uSwirl, cfg.swirl);
    gl.uniform1f(u.uSize, cfg.pointSize);
    gl.uniform1f(u.uFillSize, cfg.fillPointSize);
    gl.uniform3f(u.uInk, ink[0], ink[1], ink[2]);
    gl.uniform3f(u.uFillInk, fillInk[0], fillInk[1], fillInk[2]);
    gl.uniform1f(u.uAlpha, cfg.alpha);
    gl.uniform1f(u.uFillAlpha, cfg.fillAlpha);
    gl.uniform1f(u.uSoft, cfg.softness);
    gl.uniform1f(u.uShown, shown);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.POINTS, 0, N);

    gl.useProgram(flyProg.p);
    gl.uniform2f(flyProg.u.uRes, W, H);
    gl.uniform1f(flyProg.u.uSize, cfg.flySize);
    gl.uniform1f(flyProg.u.uAlpha, cfg.flyAlpha);
    gl.uniform1f(flyProg.u.uSoft, cfg.softness);
    gl.uniform3f(flyProg.u.uInk, ink[0], ink[1], ink[2]);
    gl.bindVertexArray(flyVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, flyPosBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, fly.pos);
    gl.bindBuffer(gl.ARRAY_BUFFER, flyABuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, fly.a);
    gl.drawArrays(gl.POINTS, 0, F);
    gl.bindVertexArray(null);
  }

  /* ── run only when it can be seen ──────────────────────────── */
  let running = false, onScreen = true, wide = innerWidth >= cfg.minWidth, raf = 0;
  const loop = (t) => { if (!running) return; raf = requestAnimationFrame(loop); frame(t); };
  function sync() {
    const should = wide && onScreen && !document.hidden && !reduced;
    if (should && !running) { running = true; last = 0; raf = requestAnimationFrame(loop); }
    if (!should && running) { running = false; cancelAnimationFrame(raf); }
    canvas.style.display = wide ? 'block' : 'none';
  }
  new IntersectionObserver((es) => { onScreen = es[es.length - 1].isIntersecting; sync(); },
    { rootMargin: '120px' }).observe(stage);
  document.addEventListener('visibilitychange', sync);
  new ResizeObserver(() => {
    wide = innerWidth >= cfg.minWidth;
    resize(); sync();
    if (reduced && wide) frame(performance.now());
  }).observe(stage);

  /* take over the stage (for the hero, from the CPU field's <pre>s) */
  stage.querySelectorAll('.ascii-bg__layer').forEach((el) => el.remove());
  stage.appendChild(canvas);
  stage.hidden = false;
  stage.style.opacity = '';
  if (primary) {
    window.__fieldDone = true;
    html.dataset.field = 'gl';
    html.dataset.hero = 'flow';
  }
  resize();
  frame(performance.now());
  sync();

  /* ── for the panel ──────────────────────────────────────────── */
  let rebuildT = 0;
  return {
    cfg,
    apply(key) {
      if (key === 'ink') ink = hexToVec(cfg.ink);
      if (key === 'fillInk') fillInk = hexToVec(cfg.fillInk);
      if (key === 'flyCount') buildFly();
      if (REBUILD.includes(key)) {
        clearTimeout(rebuildT);
        rebuildT = setTimeout(() => { build(); if (reduced) frame(performance.now()); }, 120);
      }
      wide = innerWidth >= cfg.minWidth;
      resize(); sync();
      if (reduced) frame(performance.now());
    },
    replay() {
      shown = 0; morph = 0; mv = 0; sinceShown = 0;
      disp.fill(0); vx.fill(0); vy.fill(0);
      gl.bindBuffer(gl.ARRAY_BUFFER, B.disp);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, disp);
    },
    stats: () => `${N.toLocaleString()} particles · ${rows.length} lines (${contours.length} outlines) · ${Math.round(W)}×${Math.round(H)}`
  };
}

/* ── Panel ─────────────────────────────────────────────────────
   The rows of the Hero and Footer tabs in js/field-gl.js's panel. That
   module loads after this one, so an entry waits in a queue if needed. */
function panelGroups(cfg) {
  const R = (k, text, min, max, step) => ({ k, text, min, max, step });
  const C = (k, text) => ({ k, text, type: 'color' });
  const B = (k, text) => ({ k, text, type: 'check' });
  const S = (k, text, options) => ({ k, text, type: 'select', options });
  return [
    ['Look', [C('ink', 'outline ink'), R('alpha', 'outline alpha', 0, 1, 0.01), R('pointSize', 'outline dot px', 0.5, 12, 0.1),
      C('fillInk', 'fill ink'), R('fillAlpha', 'fill alpha', 0, 1, 0.01), R('fillPointSize', 'fill dot px', 0.5, 12, 0.1),
      R('softness', 'dot softness', 0, 1, 0.01)]],
    ['Shape · rebuilds', [R('density', 'density', 0.5, 20, 0.5), R('scatter', 'outline band', 0, 30, 0.5),
      B('fill', 'fill shape'), R('hatch', 'hatch gap', 2, 30, 0.5), R('fillScatter', 'fill band', 0, 30, 0.5),
      R('fillInset', 'fill inset', 0, 20, 0.5), R('slant', 'hatch slant', -1.5, 1.5, 0.005),
      R('minPerContour', 'min per outline', 0, 2000, 10), R('maxParticles', 'max particles', 10000, 400000, 5000)]],
    ['Flow', [R('flowSpeed', 'speed', 0, 400, 1), R('maxRate', 'short-line cap', 1, 20, 0.5)]],
    ['Placement', [S('anchorX', 'anchor x', [['left', 'left edge'], ['center', 'centre']]),
      S('anchorY', 'anchor y', [['center', 'centre'], ['top', 'top']]),
      R('scale', 'scale %', 10, 600, 0.5), R('maxHeight', 'max height ×band', 0.2, 10, 0.05),
      R('posX', cfg.anchorX === 'center' ? 'offset x %' : 'offset x % (edge)', -150, 150, 0.5),
      R('posY', cfg.anchorY === 'top' ? 'offset y % (top)' : 'offset y %', -150, 150, 0.5),
      R('rotate', 'rotate °', -180, 180, 0.5), R('bleed', 'bleed px', 0, 1500, 10)]],
    ['Entrance · replay', [R('sphere', 'sphere size', 0.1, 3, 0.01), R('fadeIn', 'fade in s', 0, 3, 0.05), R('hold', 'hold s', 0, 3, 0.05),
      R('springK', 'spring', 0.5, 40, 0.5), R('springD', 'damping', 0.2, 20, 0.1), R('swirl', 'swirl px', 0, 300, 1)]],
    ['Cursor', [R('mouseRadius', 'radius px', 0, 400, 1), R('mousePush', 'push', 0, 6000, 10),
      R('dispK', 'spring back', 1, 100, 0.5), R('dispD', 'damping', 0.5, 40, 0.5)]],
    ['Strays', [R('flyCount', 'pool', 0, 400, 1), R('flyEvery', 'every ms (0 = off)', 0, 1000, 5),
      R('flyLife', 'flight s', 0.3, 8, 0.1), R('flySize', 'dot px', 0.5, 20, 0.1), R('flyAlpha', 'alpha', 0, 1, 0.01)]],
    ['Other', [R('minWidth', 'min width', 0, 1600, 16)]]
  ];
}

/* The entrance got faster (rev b). A tune saved before kept the old
   timing — the panel used to save every value, not only the changed
   ones — so those keys are dropped from it once. */
const ENTRANCE = ['fadeIn', 'hold', 'springK', 'springD'];
const ENTRANCE_REV = 'field-flow-entrance-b';

function savedConfig(defaults, key) {
  const cfg = { ...defaults };
  if (DEV_PANEL) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      if (localStorage.getItem(ENTRANCE_REV + ':' + key) !== '1') {
        ENTRANCE.forEach((k) => delete saved[k]);
        localStorage.setItem(key, JSON.stringify(saved));
        localStorage.setItem(ENTRANCE_REV + ':' + key, '1');
      }
      Object.assign(cfg, saved);
    } catch (e) {}
  }
  return cfg;
}

function register(field, id, stage) {
  if (!DEV_PANEL) return;
  const hero = id === 'hero';
  const entry = {
    id, label: hero ? 'Hero' : 'Footer', name: hero ? 'CONFIG' : 'FOOTER',
    title: hero ? 'Hero · flow particles' : 'Footer · flow particles',
    field, cfg: field.cfg, defaults: hero ? CONFIG : FOOTER, key: STORE_KEYS[id],
    scrollTo: stage.closest(hero ? 'section' : 'footer'), groups: panelGroups(field.cfg),
    relabel: ['anchorX', 'anchorY'], regroup: () => panelGroups(field.cfg),
    buttons: [{ label: 'Replay entrance', run: () => field.replay() }]
  };
  if (window.__fieldPanel) window.__fieldPanel(entry);
  else (window.__fieldPanelQueue = window.__fieldPanelQueue || []).push(entry);
}

function startHero() {
  start(heroStage, savedConfig(CONFIG, STORE_KEYS.hero), { primary: true })
    .then((field) => { if (field) register(field, 'hero', heroStage); })
    .catch((e) => fallback(e && e.message ? e.message : e));
}

function startFooter() {
  start(footerStage, savedConfig(FOOTER, STORE_KEYS.footer))
    .then((field) => { if (field) register(field, 'footer', footerStage); })
    .catch((e) => console.warn('[flow] footer field not started:', e && e.message ? e.message : e));
}

function go() {
  if (window.__flowHero) startHero();
  if (window.__flowFooter) startFooter();
}

const MIN_WIDTH = Math.min(CONFIG.minWidth, FOOTER.minWidth);
if (window.__flowHero || window.__flowFooter) {
  if (innerWidth < MIN_WIDTH) {
    /* narrow: nothing is drawn (both bands are hidden), start if widened */
    if (window.__flowHero) window.__fieldDone = true;
    const late = () => {
      if (innerWidth < MIN_WIDTH) return;
      removeEventListener('resize', late);
      if (window.__flowHero) window.__fieldDone = false;
      go();
    };
    addEventListener('resize', late);
  } else {
    go();
  }
}
