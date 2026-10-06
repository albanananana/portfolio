/* ============================================================
   Particle glyph fields — GPU version

   The same idea as artefakt.mov's hero, as a reusable field. Two
   run on the page: the Wlad.A wordmark in the hero, and the logo
   mark in the footer. Three stages, all on the graphics card:

     1. PARTICLES — an SVG is extruded into a solid and points are
        scattered over its surface. Each point lives a short cycle
        (born at its home position, drifts on a 4D noise flow field,
        springs back, dies, is reborn) and is shaded by the surface
        normal it was sampled from. Random starting ages keep births
        and deaths out of step, which is what makes the glyphs
        flicker.

     2. CURSOR — a ray from the pointer hits an invisible low-poly
        copy of the shape; points near the hit are pushed away with
        a force that scales with how FAST the pointer moves, so a
        resting cursor does nothing. The shape also tilts a little
        toward the pointer.

     3. ASCII — the particles are drawn into a reduced-size buffer,
        then a fullscreen shader cuts that buffer into cells and
        replaces each cell with a glyph from an atlas, picked by the
        cell's brightness.

   Every number marked "artefakt" is the value from their bundle.

   Only this file is loaded by the page; three.js (vendor/
   three-field.js, a tree-shaken r186 build) is imported lazily,
   once, and never below minWidth. If the HERO field fails, js/
   ascii.js — the CPU version — takes over via `field:fallback`.
   The footer field has no fallback: without it the footer looks
   exactly as the Figma file draws it.

   TUNING: press H. The panel switches between Hero and Footer; each
   keeps its own values in this browser. "Copy config" gives you the
   object to paste over CONFIG or FOOTER; set DEV_PANEL to false to ship.
   ============================================================ */

/* ── Hero ──────────────────────────────────────────────────────── */
const CONFIG = {
  svg: '../assets/Wlad.A.v2.svg',
  particles: 256,         // texture side → 256² = 65,536 points

  /* placement */
  anchor: 'center',       // 'center': posX from the centre · 'left': shape's left edge on the field's padding
  scale: 78,              // % of the field's content width the shape spans
  maxHeight: 1,           // never taller than this share of the field's height
  posX: 9.5,              // % of width — from centre, or from the left padding when anchored left
  posY: 26,               // % of height, from centre (down is +) — v2 is 4.68:1, foot on the bottom edge
  depth: 0.5,             // extrusion, model units (the shape is 13.7 wide)
  frontWeight: 4,         // sampling weight of the front face vs. lit walls (0.5)

  /* simulation — artefakt */
  flowInfluence: 0.43,
  flowStrength: 1.09,
  flowFrequency: 0.53,
  mouseStrength: 0.155,
  pointSize: 4,

  /* motion toward the pointer — artefakt */
  tiltX: 0.12,
  tiltY: 0.13,
  tiltLerp: 0.09,
  tiltSpace: 'window',    // artefakt: pointer position across the whole window

  /* ASCII pass — artefakt */
  columns: 145,           // after their resize handler; 180 before it
  cell: 7.5,              // px per glyph; when set, overrides columns
  renderScale: 0.3,       // particle buffer vs. canvas size
  contrast: 1.09,
  brightness: 0,
  charset: ' .:-=+*#%@WLAD',   // artefakt appends 4RT3F; we append our name

  /* ours */
  ink: '#FA4D48',
  opacity: 1,
  grain: 0.08,            // film grain over the whole page (style.css), 0 = off
  minWidth: 1024
};

/* ── Footer — the logo mark, large, between contacts and copyright ──
   Differences from the hero, and why:
   · light ink — the footer is #121212, so this is artefakt's own
     case: light glyphs on black
   · anchored left — the mark's left edge sits on the field's padding,
     in line with the copyright; the field itself runs to the viewport
     edges so drift and tilt are not cut at the gutter
   · 934 of 1360 wide, as in the layout (68.7%), allowed nearly the
     field's full height
   · glyph size in px (≈ the hero's ~10px cell) instead of a count
   · no tilt — it stays flat to the page (tiltSpace is kept for tuning)
   · deeper extrusion — a compact mark shows its sides when it tilts */
const FOOTER = {
  ...CONFIG,
  svg: '../assets/logo.svg',
  anchor: 'left',
  scale: 68.7, maxHeight: 0.94,
  posX: 0, posY: 0,
  depth: 1.2,
  cell: 9,
  flowFrequency: 0.05,    // a long, slow swell instead of the hero's churn
  mouseStrength: 0.1,
  tiltSpace: 'field',
  tiltX: 0.1, tiltY: 0.1, // a small tilt, measured inside the band
  tiltLerp: 0.18,
  ink: '#F5F3EE',
  opacity: 0.2,           // the mark sits far back on the dark ground
  grain: null             // the page grain is the hero panel's business
};

const DEV_PANEL = true;            // ← set false to ship
const STORE_KEYS = { hero: 'field-gl-v1', footer: 'field-gl-footer-v1' };
const MODEL_W = 13.7;              // every shape is normalised to this width
const LIGHT_DIR = [0.1, 1, 1];     // artefakt, per-object light

const html = document.documentElement;
const heroStage = document.getElementById('ascii-bg');
const footerStage = document.getElementById('footer-field');

function fallback(reason) {
  if (window.__fieldDone) return;
  window.__fieldDone = true;
  console.warn('[field] GPU version not used:', reason);
  html.dataset.field = 'cpu';
  window.dispatchEvent(new Event('field:fallback'));
}

/* ── Shaders ─────────────────────────────────────────────────── */

/* 4D simplex noise — Ian McEwan / Stefan Gustavson (Ashima Arts), MIT. */
const NOISE = /* glsl */`
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
float permute(float x){ return floor(mod(((x*34.0)+1.0)*x, 289.0)); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float taylorInvSqrt(float r){ return 1.79284291400159 - 0.85373472095314 * r; }
vec4 grad4(float j, vec4 ip){
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p, s;
  p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
  return p;
}
float simplexNoise4d(vec4 v){
  const vec2 C = vec2(0.138196601125010504, 0.309016994374947451);
  vec4 i  = floor(v + dot(v, C.yyyy));
  vec4 x0 = v - i + dot(i, C.xxxx);
  vec4 i0;
  vec3 isX = step(x0.yzw, x0.xxx);
  vec3 isYZ = step(x0.zww, x0.yyz);
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;
  vec4 i3 = clamp(i0, 0.0, 1.0);
  vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
  vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);
  vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
  vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
  vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
  vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;
  i = mod(i, 289.0);
  float j0 = permute(permute(permute(permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute(permute(permute(permute(
             i.w + vec4(i1.w, i2.w, i3.w, 1.0))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0));
  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0);
  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4,p4));
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)), 0.0);
  m0 = m0 * m0; m1 = m1 * m1;
  return 49.0 * (dot(m0*m0, vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)))
               + dot(m1*m1, vec2(dot(p3, x3), dot(p4, x4))));
}`;

/* Particle simulation — one texel per particle: xyz = position, a = age. */
const SIM = /* glsl */`
uniform float uTime;
uniform float uDeltaTime;
uniform float uFlowFieldInfluence;
uniform float uFlowFieldStrength;
uniform float uFlowFieldFrequency;
uniform vec3  uMouse;
uniform float uMouseStrength;
uniform float uMouseSpeed;
uniform sampler2D uBase;
${NOISE}
void main() {
  float time = uTime * 0.2;
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 particle = texture(uParticles, uv);
  vec4 base = texture(uBase, uv);

  /* cursor: repel, scaled by pointer speed and capped */
  float repel = clamp(uMouseSpeed, 0.0, uMouseStrength);
  vec3 dir = normalize(particle.xyz - uMouse);
  float dist = distance(uMouse, particle.xyz);
  particle.xyz += dir * (repel / (dist * (dist + 1.0))) * 2.0 * repel;

  if (particle.a >= 1.0) {
    /* died: reborn at home */
    particle.a = mod(particle.a, 1.0);
    particle.xyz = base.xyz;
  } else {
    float strength = simplexNoise4d(vec4(base.xyz, time + 1.0));
    float influence = (uFlowFieldInfluence - 0.5) * (-2.0);
    strength = smoothstep(influence, 1.0, strength);

    vec3 flow = normalize(vec3(
      simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 0.0, time)),
      simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 1.0, time)),
      simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 2.0, time))
    ));
    particle.xyz += flow * uDeltaTime * strength * uFlowFieldStrength;

    vec3 toHome = base.xyz - particle.xyz;
    particle.xyz += toHome * 2.0 * uDeltaTime;   /* spring */
    particle.xyz += toHome * 0.1 * uDeltaTime;   /* pull   */

    particle.a += uDeltaTime * 0.5;
  }
  gl_FragColor = particle;
}`;

const POINT_VERT = /* glsl */`
uniform vec2 uResolution;
uniform float uSize;
uniform sampler2D uParticlesTexture;
uniform sampler2D uNormalsTexture;
uniform vec3 uLightDir;
attribute vec2 aParticlesUv;
attribute float aSize;
varying float vLight;
varying float vDelay;
float hash1(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
void main() {
  vec4 particle = texture(uParticlesTexture, aParticlesUv);
  vec4 modelPosition = modelMatrix * vec4(particle.xyz, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;
  vDelay = hash1(modelPosition.xyz);

  /* grow in over the first 10% of a life, fade over the last 30% */
  float size = min(smoothstep(0.0, 0.1, particle.a), 1.0 - smoothstep(0.7, 1.0, particle.a));
  gl_PointSize = size * aSize * uSize * uResolution.y * (1.0 / -viewPosition.z);

  vec3 n = normalize(normalMatrix * texture(uNormalsTexture, aParticlesUv).xyz);
  vLight = max(dot(n, uLightDir), 0.0);
}`;

const POINT_FRAG = /* glsl */`
uniform float uVisibility;
varying float vLight;
varying float vDelay;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float alpha = 1.0 - smoothstep(0.4, 0.5, d);
  alpha *= smoothstep(0.0, 1.0, (uVisibility - vDelay) / 0.15);   /* staggered intro */
  alpha *= vLight;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vec3(1.0), alpha);
}`;

const ASCII_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/* artefakt's pass, with the output changed for a light page: instead of
   white glyphs brightened by luma, the ink colour with the glyph as alpha. */
const ASCII_FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uAsciiPixelSize;
uniform sampler2D uAsciiTexture;
uniform vec2 uCharCount;
uniform float uAsciiContrast;
uniform float uAsciiBrightness;
uniform vec3 uInk;
uniform float uOpacity;
uniform float uShowBuffer;
varying vec2 vUv;
void main() {
  if (uShowBuffer > 0.5) { vec4 b = texture2D(tDiffuse, vUv); gl_FragColor = vec4(mix(vec3(0.07), vec3(1.0), b.r), 1.0); return; }
  vec2 cell = uAsciiPixelSize / uResolution;
  /* artefakt samples the cell's corner, which lands between texels and
     averages four of them; the centre reads the cell's own brightness. */
  vec4 texColor = texture2D(tDiffuse, cell * (floor(vUv / cell) + 0.5));
  float luma = dot(vec3(0.2126, 0.7152, 0.0722), texColor.rgb);
  luma = clamp(luma + uAsciiBrightness, 0.0, 1.0);
  luma = clamp((luma - 0.5) * uAsciiContrast + 0.5, 0.0, 1.0);
  vec2 cellUV = fract(vUv / cell);
  float charIndex = clamp(floor(luma * (uCharCount.x - 1.0)), 0.0, uCharCount.x - 1.0);
  float character = texture2D(uAsciiTexture, vec2((charIndex + cellUV.x) / uCharCount.x, cellUV.y)).r;
  float a = character * clamp(texColor.a, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(uInk * a, a);   /* premultiplied */
}`;

/* ── Helpers ─────────────────────────────────────────────────── */
const hexToVec = (hex) => {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
};
const lerp = (a, b, t) => a + (b - a) * t;
const clamp1 = (v) => Math.max(-1, Math.min(1, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
/* ?field=raw    — show the particle buffer itself, no ASCII pass
   ?field=still  — freeze the flow field (particles stay home)
   ?field=buffer — show what the ASCII pass samples, upscaled       */
const DEBUG = new URLSearchParams(location.search).get('field') || '';

let threeModule = null;
const loadThree = () => threeModule || (threeModule = import('../vendor/three-field.js'));

/* ── One field ───────────────────────────────────────────────── */
async function createField(stage, cfg, { primary = false } = {}) {
  const T = await loadThree();

  const canvas = document.createElement('canvas');
  canvas.className = 'ascii-bg__gl';
  const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true });
  renderer.setClearColor(0x000000, 0);

  /* 1 · the shape as a solid --------------------------------------- */
  const svgText = await (await fetch(new URL(cfg.svg, import.meta.url))).text();
  /* Last await is behind us. For the hero, the 6 s watchdog in
     index.html may have given up while three.js was downloading and
     started the CPU field — then that one keeps the hero. */
  if (primary && window.__fieldDone) { renderer.dispose(); return null; }

  const svg = new T.SVGLoader().parse(svgText);
  const shapes = svg.paths.flatMap((p) => p.toShapes(true));

  const solid = (segments) => {
    const g = new T.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: segments });
    g.computeBoundingBox();
    const b = g.boundingBox;
    g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -0.5);
    const k = MODEL_W / (b.max.x - b.min.x);
    g.scale(k, -k, cfg.depth);   /* SVG y points down */
    return g;
  };
  const dense = solid(12);
  const lowPoly = solid(3);
  dense.computeBoundingBox();
  const modelH = dense.boundingBox.max.y - dense.boundingBox.min.y;

  /* 2 · particles on its surface ----------------------------------- */
  const SIZE = cfg.particles;
  const N = SIZE * SIZE;
  const gpu = new T.GPUComputationRenderer(SIZE, SIZE, renderer);
  const baseTex = gpu.createTexture();
  const normalTex = gpu.createTexture();

  /* Where the points go. artefakt scatters them over every surface of a
     dense model, and on a dark page the sparse result reads as glitter.
     An extruded shape is roughly a quarter front face, a quarter back and
     half side walls — and the back and most walls are unlit, so they only
     waste points. On a light page the shape then breaks up. Weighting the
     sampler puts most points where they can be seen. */
  const nrm = dense.attributes.normal;
  const weight = new Float32Array(nrm.count);
  for (let i = 0; i < nrm.count; i++) {
    const z = nrm.getZ(i), y = nrm.getY(i);
    weight[i] = z > 0.5 ? cfg.frontWeight : z < -0.5 ? 0.02 : (y > 0.3 ? 0.5 : 0.1);
  }
  dense.setAttribute('weight', new T.BufferAttribute(weight, 1));
  const sampler = new T.MeshSurfaceSampler(new T.Mesh(dense)).setWeightAttribute('weight').build();
  const p = new T.Vector3(), n = new T.Vector3();
  for (let i = 0; i < N; i++) {
    sampler.sample(p, n);
    const o = i * 4;
    baseTex.image.data.set([p.x, p.y, p.z, Math.random() < 0.01 ? 0 : Math.random()], o);
    normalTex.image.data.set([n.x, n.y, n.z, 1], o);
  }

  const sim = gpu.addVariable('uParticles', SIM, baseTex);
  gpu.setVariableDependencies(sim, [sim]);
  const su = sim.material.uniforms;
  Object.assign(su, {
    uTime: { value: 0 }, uDeltaTime: { value: 0 }, uBase: { value: baseTex },
    uFlowFieldInfluence: { value: cfg.flowInfluence },
    uFlowFieldStrength: { value: cfg.flowStrength },
    uFlowFieldFrequency: { value: cfg.flowFrequency },
    uMouse: { value: new T.Vector3(1e4, 1e4, 1e4) },
    uMouseStrength: { value: cfg.mouseStrength },
    uMouseSpeed: { value: 0 }
  });
  const err = gpu.init();
  if (err) throw new Error(err);

  const uvs = new Float32Array(N * 2), sizes = new Float32Array(N);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = y * SIZE + x;
    uvs[i * 2] = (x + 0.5) / SIZE; uvs[i * 2 + 1] = (y + 0.5) / SIZE;
    sizes[i] = Math.random();
  }
  const pointsGeo = new T.BufferGeometry();
  pointsGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(N * 3), 3));
  pointsGeo.setAttribute('aParticlesUv', new T.BufferAttribute(uvs, 2));
  pointsGeo.setAttribute('aSize', new T.BufferAttribute(sizes, 1));
  const pointsMat = new T.ShaderMaterial({
    vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, transparent: true,
    uniforms: {
      uResolution: { value: new T.Vector2() }, uSize: { value: cfg.pointSize },
      uParticlesTexture: { value: null }, uNormalsTexture: { value: normalTex },
      uLightDir: { value: new T.Vector3(...LIGHT_DIR).normalize() },
      uVisibility: { value: reduced ? 1.15 : 0 }
    }
  });
  const points = new T.Points(pointsGeo, pointsMat);
  points.frustumCulled = false;

  const hitMesh = new T.Mesh(lowPoly, new T.MeshBasicMaterial({ side: T.DoubleSide }));
  hitMesh.visible = false;   /* raycast only */

  const group = new T.Group();
  group.add(points, hitMesh);
  const scene = new T.Scene();
  scene.add(group);
  const camera = new T.PerspectiveCamera(45, 1, 1, 5000);   /* artefakt: 45°, 1 unit = 1 px */

  /* 3 · ASCII pass -------------------------------------------------- */
  const target = new T.WebGLRenderTarget(1, 1);
  const atlasCanvas = document.createElement('canvas');
  const atlas = new T.CanvasTexture(atlasCanvas);
  atlas.minFilter = atlas.magFilter = T.NearestFilter;
  const asciiMat = new T.ShaderMaterial({
    vertexShader: ASCII_VERT, fragmentShader: ASCII_FRAG,
    blending: T.NoBlending, depthTest: false, depthWrite: false,
    uniforms: {
      tDiffuse: { value: target.texture }, uResolution: { value: new T.Vector2() },
      uAsciiTexture: { value: atlas }, uCharCount: { value: new T.Vector2(1, 1) },
      uAsciiPixelSize: { value: 1 }, uAsciiContrast: { value: cfg.contrast },
      uAsciiBrightness: { value: cfg.brightness },
      uInk: { value: new T.Vector3(...hexToVec(cfg.ink)) }, uOpacity: { value: cfg.opacity },
      uShowBuffer: { value: DEBUG === 'buffer' ? 1 : 0 }
    }
  });
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), asciiMat);
  quad.frustumCulled = false;
  const quadScene = new T.Scene();
  quadScene.add(quad);
  const quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function buildAtlas() {
    const chars = cfg.charset.length ? cfg.charset : ' ';
    atlasCanvas.width = 16 * chars.length; atlasCanvas.height = 16;
    const c = atlasCanvas.getContext('2d');
    c.fillStyle = 'black'; c.fillRect(0, 0, atlasCanvas.width, 16);
    c.fillStyle = 'white'; c.font = '16px monospace';
    c.textBaseline = 'middle'; c.textAlign = 'center';
    [...chars].forEach((ch, i) => c.fillText(ch, 16 * (i + 0.5), 8));
    atlas.needsUpdate = true;
    asciiMat.uniforms.uCharCount.value.set(chars.length, 1);
  }
  buildAtlas();

  /* ── size ─────────────────────────────────────────────────────── */
  let W = 0, H = 0;
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    if (!W || !H) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    const rw = Math.max(1, Math.round(W * cfg.renderScale));
    const rh = Math.max(1, Math.round(H * cfg.renderScale));
    target.setSize(rw, rh);
    asciiMat.uniforms.uResolution.value.set(rw, rh);
    const columns = cfg.cell > 0 ? W / cfg.cell : cfg.columns;
    asciiMat.uniforms.uAsciiPixelSize.value = rw / columns;
    pointsMat.uniforms.uResolution.value.set(W, H);

    const dist = H / 2 / Math.tan(45 * Math.PI / 360);
    camera.aspect = W / H; camera.far = dist + 4000;
    camera.position.set(0, 0, dist); camera.updateProjectionMatrix();

    /* Fit by the content width (inside the field's padding), capped by
       height so a wide field cannot make the shape overflow vertically. */
    const cs = getComputedStyle(stage);
    const padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
    const inner = W - padL - padR;
    const s = Math.min((cfg.scale / 100) * inner / MODEL_W, (H * cfg.maxHeight) / modelH);
    group.scale.set(s, s, s * 2);   /* artefakt stretches depth the same way */
    const x = cfg.anchor === 'left'
      ? -W / 2 + padL + inner * cfg.posX / 100 + (s * MODEL_W) / 2
      : W * cfg.posX / 100;
    /* Put the FRONT face on z = 0, the plane where one unit is one pixel.
       Centred on the solid instead, the front face sits nearer the camera
       and perspective enlarges the shape — by ~5% in the hero and ~13% for
       the deeper footer mark, which also pulled its left edge off the
       column. */
    group.position.set(x, -H * cfg.posY / 100, -(cfg.depth / 2) * s * 2);
  }

  /* ── pointer ──────────────────────────────────────────────────── */
  const ray = new T.Raycaster();
  const ndc = new T.Vector2(10, 10);           /* field-relative, for the ray */
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  if (cfg.tiltSpace === 'window') { tilt.tx = -1; tilt.ty = 1; }   /* artefakt starts at (-1, 1) */
  const prevHit = new T.Vector3();
  let pointerSpeed = 0;
  window.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (cfg.tiltSpace === 'window') {
      tilt.tx = e.clientX / innerWidth * 2 - 1;
      tilt.ty = -e.clientY / innerHeight * 2 + 1;
    } else {
      /* from the field's centre, in window-sized steps: leans toward the
         pointer without slamming to the limit when it leaves the field */
      tilt.tx = clamp1((e.clientX - (r.left + r.width / 2)) / innerWidth * 2);
      tilt.ty = clamp1(-(e.clientY - (r.top + r.height / 2)) / innerHeight * 2);
    }
  }, { passive: true });
  window.addEventListener('scroll', () => ndc.set(10, 10), { passive: true });

  /* ── frame ────────────────────────────────────────────────────── */
  let elapsed = 0, last = 0;
  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 0;   /* no jump after a pause */
    last = now;
    elapsed += dt;

    const vis = pointsMat.uniforms.uVisibility;
    if (vis.value < 1.15) vis.value = Math.min(1.15, vis.value + dt / 1.6);

    su.uTime.value = elapsed;
    su.uDeltaTime.value = reduced ? 0 : dt;
    if (DEBUG === 'still') su.uFlowFieldStrength.value = 0;

    ray.setFromCamera(ndc, camera);
    group.updateMatrixWorld();
    const hit = ray.intersectObject(hitMesh, false)[0];
    if (hit) {
      const local = hitMesh.worldToLocal(hit.point.clone());
      su.uMouseSpeed.value = lerp(su.uMouseSpeed.value, 500 * pointerSpeed, 0.15);
      pointerSpeed = local.distanceTo(prevHit);
      prevHit.copy(local);
      su.uMouse.value.copy(local);
    } else {
      su.uMouseSpeed.value *= 0.9;
    }

    gpu.compute();
    pointsMat.uniforms.uParticlesTexture.value = gpu.getCurrentRenderTarget(sim).texture;

    tilt.x = lerp(tilt.x, tilt.tx, cfg.tiltLerp);
    tilt.y = lerp(tilt.y, tilt.ty, cfg.tiltLerp);
    group.rotation.x = -tilt.y * cfg.tiltX;
    group.rotation.y = tilt.x * cfg.tiltY;

    if (DEBUG === 'raw') { renderer.setRenderTarget(null); renderer.setClearColor(0x121212, 1); renderer.clear(); renderer.render(scene, camera); return; }
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(quadScene, quadCam);
  }

  /* ── run only when it can be seen ─────────────────────────────── */
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
  if (cfg.grain != null) html.style.setProperty('--grain-opacity', cfg.grain);
  resize();
  frame(performance.now());   /* first frame now, even under reduced motion */
  sync();

  return {
    cfg,
    apply(key) {
      su.uFlowFieldInfluence.value = cfg.flowInfluence;
      su.uFlowFieldStrength.value = cfg.flowStrength;
      su.uFlowFieldFrequency.value = cfg.flowFrequency;
      su.uMouseStrength.value = cfg.mouseStrength;
      pointsMat.uniforms.uSize.value = cfg.pointSize;
      asciiMat.uniforms.uAsciiContrast.value = cfg.contrast;
      asciiMat.uniforms.uAsciiBrightness.value = cfg.brightness;
      asciiMat.uniforms.uOpacity.value = cfg.opacity;
      asciiMat.uniforms.uInk.value.set(...hexToVec(cfg.ink));
      if (cfg.grain != null) html.style.setProperty('--grain-opacity', cfg.grain);
      if (key === 'charset') buildAtlas();
      wide = innerWidth >= cfg.minWidth;
      resize(); sync();
    },
    stats: () => `${N.toLocaleString()} particles · ${Math.round(cfg.cell > 0 ? W / cfg.cell : cfg.columns)} columns · ${renderer.info.render.calls} draw calls`
  };
}

/* ── Dev panel ───────────────────────────────────────────────────
   Only while DEV_PANEL is true. One panel for every field on the page,
   with a switch at the top. Sliders write into that field's cfg, persist
   under its own key, and ask it to re-read. Shape settings (depth, front
   weight, particle count) are baked into the particle positions, so they
   are saved but take effect after a reload. */
const panelFields = [];   // { id, label, name, field, cfg, defaults, key, scrollTo }
let panelEl = null, panelCurrent = 0;

function registerPanelField(entry) {
  panelFields.push(entry);
  panelFields.sort((a, b) => (a.id === 'hero' ? -1 : b.id === 'hero' ? 1 : 0));
  if (!panelEl) buildPanel();
  renderPanel();
}

function buildPanel() {
  const css = `
#fp{position:fixed;top:16px;right:16px;width:330px;z-index:500;background:rgba(255,255,255,.95);
backdrop-filter:blur(8px);border:1px solid #B8B5B2;border-radius:6px;padding:14px;
font:11px/1.4 'Inclusive Sans',system-ui,sans-serif;color:#121212;max-height:calc(100vh - 32px);
overflow:auto;box-shadow:0 6px 24px rgba(18,18,18,.1);display:none}
body.fp-open #fp{display:block}
#fp h2{margin:0 0 2px;font:600 11px/1.4 inherit;letter-spacing:.12em;text-transform:uppercase;color:#D42823}
#fp .h{margin:0 0 10px;opacity:.5;font-size:10px}
#fp .fp-tabs{display:flex;gap:4px;margin:0 0 6px}
#fp .fp-tabs button{flex:1;font:inherit;padding:6px;border:1px solid #B8B5B2;border-radius:3px;background:#fff;cursor:pointer}
#fp .fp-tabs button.on{background:#121212;color:#F5F3EE;border-color:#121212}
#fp fieldset{border:0;border-top:1px solid #E5DFD5;margin:10px 0 6px;padding:10px 0 0}
#fp legend{font-size:10px;letter-spacing:.1em;text-transform:uppercase;opacity:.45;padding-right:6px}
#fp .r{display:flex;align-items:center;gap:8px;margin-bottom:7px}
#fp label{flex:0 0 92px;opacity:.7}
#fp input[type=range]{flex:1;min-width:0;accent-color:#FA4D48}
#fp input[type=text],#fp input[type=color],#fp select{flex:1;min-width:0;font:inherit;padding:3px 5px;border:1px solid #B8B5B2;border-radius:3px;background:#fff}
#fp .v{flex:0 0 40px;text-align:right;font-variant-numeric:tabular-nums;opacity:.75}
#fp .b{display:flex;gap:6px;margin-top:10px}
#fp .b button{flex:1;font:inherit;padding:6px;border:1px solid #B8B5B2;border-radius:3px;background:#fff;cursor:pointer}
#fp .b button.p{background:#121212;color:#F5F3EE;border-color:#121212}
#fp .s{margin-top:8px;font-size:10px;opacity:.5}
#fp .note{font-size:10px;opacity:.5;margin:-2px 0 6px}`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  panelEl = document.createElement('div');
  panelEl.id = 'fp';
  document.body.appendChild(panelEl);

  document.addEventListener('keydown', (e) => {
    if ((e.key !== 'h' && e.key !== 'H') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(input|select|textarea)$/i.test(e.target.tagName || '')) return;
    document.body.classList.toggle('fp-open');
    renderPanel();
  });
}

function renderPanel() {
  if (!panelEl || !panelFields.length) return;
  panelCurrent = Math.min(panelCurrent, panelFields.length - 1);
  const { id, label, name, field, cfg, defaults, key } = panelFields[panelCurrent];

  const R = (k, text, min, max, step) => ({ k, text, min, max, step });
  const groups = [
    ['Placement', [
      R('scale', 'scale %', 10, 140, 0.5), R('maxHeight', 'max height', 0.2, 1, 0.01),
      R('posX', cfg.anchor === 'left' ? 'offset x % (edge)' : 'offset x %', -50, 50, 0.5),
      R('posY', 'offset y %', -50, 50, 0.5)]],
    ['Flow · artefakt', [R('flowInfluence', 'influence', 0, 1, 0.01), R('flowStrength', 'strength', 0, 4, 0.01), R('flowFrequency', 'frequency', 0.05, 2, 0.01)]],
    ['Cursor · artefakt', [R('mouseStrength', 'repel', 0, 0.5, 0.005), R('tiltX', 'tilt x', 0, 1, 0.01), R('tiltY', 'tilt y', 0, 1, 0.01), R('tiltLerp', 'follow', 0.01, 0.5, 0.01)]],
    ['ASCII · artefakt', [
      R('cell', 'cell px (0 = cols)', 0, 30, 0.5), R('columns', 'columns', 40, 300, 1),
      R('renderScale', 'buffer scale', 0.1, 1, 0.05), R('pointSize', 'point size', 0.5, 12, 0.1),
      R('contrast', 'contrast', 0.5, 3, 0.01), R('brightness', 'brightness', -0.5, 0.5, 0.01)]],
    ['Ink', [R('opacity', 'opacity', 0.05, 1, 0.01)]
      .concat(cfg.grain != null ? [R('grain', 'page grain', 0, 0.3, 0.005)] : [])
      .concat([R('minWidth', 'min width', 0, 1600, 16)])],
    ['Shape · after reload', [R('depth', 'depth', 0.05, 3, 0.05), R('frontWeight', 'front weight', 0.5, 20, 0.5)]]
  ];
  const row = (r) => `<div class="r"><label for="fp-${r.k}">${r.text}</label><input type="range" id="fp-${r.k}" min="${r.min}" max="${r.max}" step="${r.step}" value="${cfg[r.k]}"><span class="v" id="fpv-${r.k}">${cfg[r.k]}</span></div>`;
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  panelEl.innerHTML =
    `<h2>Glyph fields · GPU</h2><p class="h">H — close · values persist in this browser</p>` +
    (panelFields.length > 1
      ? `<div class="fp-tabs">${panelFields.map((f, i) => `<button type="button" data-i="${i}" class="${i === panelCurrent ? 'on' : ''}">${f.label}</button>`).join('')}</div>`
      : '') +
    groups.map(([g, rows]) => `<fieldset><legend>${g}</legend>` +
      (g === 'Placement' ? `<div class="r"><label for="fp-anchor">anchor</label><select id="fp-anchor"><option value="center"${cfg.anchor !== 'left' ? ' selected' : ''}>centre</option><option value="left"${cfg.anchor === 'left' ? ' selected' : ''}>left edge</option></select></div>` : '') +
      (g === 'Cursor · artefakt' ? `<div class="r"><label for="fp-tiltSpace">tilt from</label><select id="fp-tiltSpace"><option value="window"${cfg.tiltSpace === 'window' ? ' selected' : ''}>window</option><option value="field"${cfg.tiltSpace !== 'window' ? ' selected' : ''}>field centre</option></select></div>` : '') +
      rows.map(row).join('') + '</fieldset>').join('') +
    `<fieldset><legend>Glyphs</legend>
      <div class="r"><label for="fp-charset">charset</label><input type="text" id="fp-charset" value="${esc(cfg.charset)}"></div>
      <div class="r"><label for="fp-ink">ink</label><input type="color" id="fp-ink" value="${esc(cfg.ink)}"></div></fieldset>
    <div class="b"><button type="button" id="fp-reset">Reset ${label}</button><button type="button" id="fp-copy" class="p">Copy ${name}</button></div>
    <div class="s" id="fp-stats"></div>`;

  const save = () => { try { localStorage.setItem(key, JSON.stringify(cfg)); } catch (e) {} };
  const stats = () => { const n = panelEl.querySelector('#fp-stats'); if (n) n.textContent = field.stats(); };
  stats();

  panelEl.querySelectorAll('.fp-tabs button').forEach((b) => b.addEventListener('click', () => {
    panelCurrent = +b.dataset.i;
    const f = panelFields[panelCurrent];
    if (f.scrollTo) f.scrollTo.scrollIntoView({ behavior: 'smooth', block: f.id === 'hero' ? 'start' : 'end' });
    renderPanel();
  }));
  groups.forEach(([, rows]) => rows.forEach((r) => {
    const input = panelEl.querySelector('#fp-' + r.k);
    input.addEventListener('input', () => {
      cfg[r.k] = parseFloat(input.value);
      panelEl.querySelector('#fpv-' + r.k).textContent = cfg[r.k];
      field.apply(r.k); save(); stats();
    });
  }));
  ['charset', 'ink', 'anchor', 'tiltSpace'].forEach((k) => panelEl.querySelector('#fp-' + k).addEventListener('input', (e) => {
    cfg[k] = e.target.value; field.apply(k); save();
    if (k === 'anchor') renderPanel();   /* the offset label changes meaning */
  }));
  panelEl.querySelector('#fp-reset').addEventListener('click', () => {
    try { localStorage.removeItem(key); } catch (e) {}
    location.reload();
  });
  panelEl.querySelector('#fp-copy').addEventListener('click', () => {
    const body = Object.keys(defaults).map((k) => `  ${k}: ${typeof cfg[k] === 'string' ? `'${cfg[k]}'` : cfg[k]}`).join(',\n');
    const text = `const ${name} = {\n${body}\n};`;
    navigator.clipboard.writeText(text).catch(() => console.log(text));
  });
}

/* ── Go ──────────────────────────────────────────────────────── */
function savedConfig(defaults, key) {
  const cfg = { ...defaults };
  if (DEV_PANEL) {
    try { Object.assign(cfg, JSON.parse(localStorage.getItem(key) || '{}')); } catch (e) {}
  }
  return cfg;
}

function startHero() {
  /* Case pages carry the footer mark but no hero field. Report the hero as
     done so the 6 s watchdog in the page head stops waiting, and let
     startFooter() run — this is not a GPU failure, there is just no hero. */
  if (!heroStage) { window.__fieldDone = true; return; }
  const cfg = savedConfig(CONFIG, STORE_KEYS.hero);
  createField(heroStage, cfg, { primary: true }).then((field) => {
    if (!field) return;   /* the watchdog got there first */
    window.__fieldDone = true;
    html.dataset.field = 'gl';
    if (DEV_PANEL) registerPanelField({ id: 'hero', label: 'Hero', name: 'CONFIG', field, cfg, defaults: CONFIG, key: STORE_KEYS.hero, scrollTo: heroStage.closest('section') });
  }).catch((e) => fallback(e && e.message ? e.message : e));
}

function startFooter() {
  if (!footerStage) return;
  const cfg = savedConfig(FOOTER, STORE_KEYS.footer);
  createField(footerStage, cfg).then((field) => {
    if (field && DEV_PANEL) registerPanelField({ id: 'footer', label: 'Footer', name: 'FOOTER', field, cfg, defaults: FOOTER, key: STORE_KEYS.footer, scrollTo: footerStage.closest('footer') });
  }).catch((e) =>
    console.warn('[field] footer field not started:', e && e.message ? e.message : e));
}

if (html.dataset.field !== 'gl') {
  /* index.html already decided on the CPU field; the footer stays plain */
} else if (innerWidth < CONFIG.minWidth) {
  /* Narrow screen: draw nothing and do not download three.js at all. The
     CPU field is off at this width too. If the window is widened past the
     threshold later, start then. */
  window.__fieldDone = true;
  const late = () => {
    if (innerWidth < CONFIG.minWidth) return;
    removeEventListener('resize', late);
    window.__fieldDone = false;
    startHero(); startFooter();
  };
  addEventListener('resize', late);
} else {
  startHero();
  startFooter();
}
