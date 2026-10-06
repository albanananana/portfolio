/* ============================================================
   ASCII character field

   A character grid that fills the hero and scrolls away with it.
   The element's box comes from CSS (.ascii-bg is absolute inside
   the hero section); this file only reads it.

   The object (the logo mark, or a word) is rasterised ONCE into
   an offscreen canvas and kept as a density map. Every frame,
   each cell of the grid inverse-projects into that map and picks
   a glyph by density. No WebGL, no dependencies.

   TUNING
   ------
   Press H on the page to open the panel, turn the knobs, then
   "Copy config" and paste the result over CONFIG below. When the
   look is settled, set DEV_PANEL to false and the whole panel —
   markup, styles and listeners — stops being created.
   ============================================================ */
(function () {
  'use strict';

  /* ── Paste tuned values here ──────────────────────────────── */
  var CONFIG = {
    object:    'wordmark',  // 'wordmark' | 'logo' | 'text'
    text:      'Wlad.A',
    scale:     96,          // % of the hero width — the file has it 1390 of 1440
    posX:      -1,          // % of the hero, from centre
    posY:      29,          // low band, its foot on the hero's bottom edge (v2 is 4.68:1)
    soft:      0.35,        // blur of the density map — sets the bevel width
    light:     0.7,         // 0 = flat density, 1 = fully lit by the normals
    lightAngle: 130,        // degrees; where the light comes from
    gamma:     0.55,
    cell:      10,          // px; also the type size
    charset:   'brand',
    mode:      'dissolve',  // spin | wave | dissolve | cursor | still
    speed:     0.8,
    amount:    0.42,
    fps:       10,
    ink:       '#FA4D48',   /* the coral the file draws the wordmark in */
    opacity:   1,
    accentOn:  false,
    accent:    '#BC4809',
    threshold: 1,
    grain:     0.1,         // film grain over the page, 0 = off
    minWidth:  448          // below this the field is not drawn at all
  };

  var DEV_PANEL = true;     // ← set false to ship
  var STORE_KEY = 'ascii-bg-config-v3';
  var LEGACY_KEY = 'ascii-bg-config-v2';

  var CHARSETS = {
    classic: ' .:-=+*#%@',
    /* The classic ramp with the name pushed onto its dense end, so the
       core of the mark is spelled out in its own letters. Lifted from
       artefakt.mov, who append "4RT3F" to the same ramp. */
    brand:   ' .:-=+*#%@WLAD',
    fine:    ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
    digits:  ' .:0123456789',
    code:    ' .,:;i1tfLCG08@',
    blocks:  ' ░▒▓█',
    dots:    ' ·•●'
  };

  /* The mark, inlined. Same artwork as assets/logo.svg with an
     explicit width and height — an SVG carrying only a viewBox
     rasterises to nothing in some browsers when drawn into a
     canvas. Inlined rather than fetched so the field also works
     from file://, where a loaded SVG taints the canvas and
     getImageData throws. */
  var LOGO_W = 66.1269, LOGO_H = 37.7669;
  var LOGO_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="661.269" height="377.669" viewBox="0 0 66.1269 37.7669" fill="none">' +
    '<rect width="7.52864" height="37.6432" transform="matrix(1 0 0 -1 0 37.6432)" fill="#423B3B"/>' +
    '<path d="M33.0625 30.1146C33.0625 34.2726 36.4332 37.6432 40.5911 37.6432V7.52869C40.5911 3.37074 37.2205 0 33.0625 0V30.1146Z" fill="#DF6D3B"/>' +
    '<path d="M7.65524 37.6432C12.2536 37.6432 16.4412 34.9964 18.4141 30.8428L33.0644 0C28.4661 0 24.2785 2.64695 22.3055 6.8005L7.65524 37.6432Z" fill="#DF6D3B"/>' +
    '<path d="M40.7178 37.6432H48.2464L66.1269 0H58.5983L40.7178 37.6432Z" fill="#423B3B"/>' +
    '<path fill-rule="evenodd" clip-rule="evenodd" d="M33.185 30.647H26.0651V37.7669C26.0651 33.8347 29.2529 30.647 33.185 30.647Z" fill="#423B3B"/>' +
    '<path fill-rule="evenodd" clip-rule="evenodd" d="M33.185 30.647H26.0651V23.5271C26.0651 27.4593 29.2529 30.647 33.185 30.647Z" fill="#423B3B"/>' +
    '<path fill-rule="evenodd" clip-rule="evenodd" d="M18.9452 30.647H26.0651V37.7669C26.0651 33.8347 22.8773 30.647 18.9452 30.647Z" fill="#423B3B"/>' +
    '<path fill-rule="evenodd" clip-rule="evenodd" d="M18.9452 30.647H26.0651V23.5271C26.0651 27.4593 22.8773 30.647 18.9452 30.647Z" fill="#423B3B"/>' +
    '</svg>';

  /* The wordmark, from assets/Wlad.A.v2.svg. Inlined for the same file://
     reason as the mark above. Its fill is swapped from #FA4D48 to black:
     density is read as inverted luminance, and the coral only reaches
     about 0.56 — the whole word would top out mid-ramp and never touch
     the dense glyphs. Regenerate this if the asset changes. */
  var WORDMARK_W = 1370, WORDMARK_H = 293;
  var WORDMARK_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1370" height="293" viewBox="0 0 1370 293" fill="none"><path fill="#000" d="M1069.8 288.628L1163.38 0H12' +
    '75.77L1369.36 288.628H1305.51L1274.9 200.29H1163.38L1133.64 288.628H1069.8ZM1180 143.439H1259.15L1222.42 25.3642H1216.73L1180 143.439Z"/><path fill="#' +
    '000" d="M1019.06 288.628V236.587H1061.04V288.628H1019.06Z"/><path fill="#000" d="M1010.33 172.739L1009.89 289.065H950.856L950.418 212.535H944.296L943.' +
    '859 217.345C939.486 264.138 901.877 293.001 852.46 293.001C789.487 293.001 748.816 250.581 748.816 174.926C748.816 100.145 789.487 54.227 852.46 54.22' +
    '7C901.877 54.227 940.798 83.9644 945.171 139.066L945.608 144.314H951.293L950.856 0H1009.89L1010.33 172.739ZM924.617 172.302C925.054 135.568 902.314 11' +
    '1.515 864.705 111.515C830.157 111.515 808.291 132.944 807.854 174.926C808.291 216.908 829.72 235.713 864.705 235.713C902.314 235.713 924.18 211.66 924' +
    '.617 172.302Z"/><path fill="#000" d="M589.218 226.966C590.53 237.899 602.775 243.147 622.016 241.835C650.879 239.649 678.867 229.153 678.867 204.226V1' +
    '74.051H674.932L673.62 183.235C672.308 191.544 668.809 195.042 658.751 196.792C643.882 199.416 629.014 201.165 616.769 202.914C593.154 206.413 587.906 ' +
    '217.346 589.218 226.966ZM535.428 152.186C535.428 93.5855 577.41 62.5361 634.699 62.5361C708.605 62.5361 735.718 97.5213 735.718 149.124V221.281C735.71' +
    '8 229.59 738.779 232.214 745.339 232.214H753.211V289.065H723.036C694.173 289.065 682.803 266.325 682.803 240.523V240.086H678.43L676.681 252.768C673.62' +
    ' 273.759 650.442 293.001 609.334 293.001C562.979 293.001 533.679 273.322 532.804 228.716C531.492 174.051 578.285 160.057 634.699 157.433C671.433 155.6' +
    '84 678.867 154.372 678.867 142.127C678.867 125.947 667.06 113.702 636.448 113.702C611.084 113.702 592.279 125.947 592.279 152.186H535.428Z"/><path fil' +
    'l="#000" d="M465.414 0H524.014V288.628H465.414V0Z"/><path fill="#000" d="M64.2852 0L114.139 264.575H121.136L173.614 0H281.631L332.796 264.575H341.105L' +
    '392.709 0H456.556L396.644 288.628H282.943L230.465 29.7374H224.78L171.865 288.628H58.6002L0 0H64.2852Z"/></svg>';

  var stage  = document.getElementById('ascii-bg');
  var baseEl = document.getElementById('ascii-base');
  var accEl  = document.getElementById('ascii-accent');
  if (!stage || !baseEl || !accEl) return;

  var cfg = Object.assign({}, CONFIG);
  if (DEV_PANEL) {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!saved) {
        /* Carry tuned look settings over, but not the placement or the
           ink: those were set against a full-viewport field and a
           different palette, and both are wrong for a hero-sized box. */
        var legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
        if (legacy) {
          delete legacy.scale; delete legacy.posX; delete legacy.posY; delete legacy.ink;
          saved = legacy;
          localStorage.setItem(STORE_KEY, JSON.stringify(saved));
          localStorage.removeItem(LEGACY_KEY);
        }
      }
      if (saved) cfg = Object.assign(cfg, saved);
    } catch (e) { /* private mode, ignore */ }
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var enabled = false;

  /* ══ Density map ═════════════════════════════════════════════ */
  var MASK_W = 512;
  var mask = null, nrm = null, maskW = 0, maskH = 0, maskAspect = 1;
  var maskCanvas = document.createElement('canvas');
  var maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });

  /* Separable box blur, run once per rebuild. The mark is flat
     vector art — every fill is one solid tone — so straight off
     the rasteriser it quantises into slabs of a single glyph.
     Softening the map gives the edges a falloff, and that falloff
     is what the character ramp actually renders. */
  function blur(src, w, h, r) {
    if (r < 1) return src;
    var tmp = new Float32Array(w * h);
    var out = new Float32Array(w * h);
    var i, x, y, sum, n, xx, yy;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        sum = 0; n = 0;
        for (i = -r; i <= r; i++) {
          xx = x + i;
          if (xx >= 0 && xx < w) { sum += src[y * w + xx]; n++; }
        }
        tmp[y * w + x] = sum / n;
      }
    }
    for (x = 0; x < w; x++) {
      for (y = 0; y < h; y++) {
        sum = 0; n = 0;
        for (i = -r; i <= r; i++) {
          yy = y + i;
          if (yy >= 0 && yy < h) { sum += tmp[yy * w + x]; n++; }
        }
        out[y * w + x] = sum / n;
      }
    }
    return out;
  }

  /* A height field derived from the blurred map. Flat vector art has no
     shading of its own, and blurring alone only fades the edges out —
     what actually reads as volume is a normal that tilts along that
     falloff and catches a light. Sobel gradient, one pass, cached. */
  function buildNormals(src, w, h, strength) {
    var nx = new Float32Array(w * h);
    var ny = new Float32Array(w * h);
    var nz = new Float32Array(w * h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = y * w + x;
        var gx = ((x < w - 1 ? src[i + 1] : src[i]) - (x > 0 ? src[i - 1] : src[i])) * strength;
        var gy = ((y < h - 1 ? src[i + w] : src[i]) - (y > 0 ? src[i - w] : src[i])) * strength;
        var vx = -gx, vy = -gy;
        var len = Math.sqrt(vx * vx + vy * vy + 1);
        nx[i] = vx / len; ny[i] = vy / len; nz[i] = 1 / len;
      }
    }
    return { x: nx, y: ny, z: nz };
  }

  function buildMaskFromCanvas(w, h) {
    var img = maskCtx.getImageData(0, 0, w, h).data;
    var out = new Float32Array(w * h);
    for (var i = 0, p = 0; i < out.length; i++, p += 4) {
      /* Drawn on white, so density is inverted luminance. Using
         luminance rather than alpha keeps the mark's own two-tone
         structure — the orange strokes read lighter than the dark
         ones instead of flattening into a silhouette. */
      var lum = (img[p] * 0.2126 + img[p + 1] * 0.7152 + img[p + 2] * 0.0722) / 255;
      out[i] = 1 - lum;
    }
    var r = Math.round(cfg.soft * h * 0.09);   /* by height: a wide word would otherwise blur to mush */
    mask = blur(out, w, h, r);
    nrm = buildNormals(mask, w, h, Math.max(1, r) * 1.8);
    maskW = w; maskH = h; maskAspect = w / h;
  }

  function buildSvgMask(svg, vw, vh, maskWidth, done) {
    var img = new Image();
    img.onload = function () {
      var w = maskWidth, h = Math.round(maskWidth * vh / vw);
      maskCanvas.width = w; maskCanvas.height = h;
      maskCtx.fillStyle = '#fff';
      maskCtx.fillRect(0, 0, w, h);
      maskCtx.drawImage(img, 0, 0, w, h);
      buildMaskFromCanvas(w, h);
      done();
    };
    img.onerror = done;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function buildTextMask(str, done) {
    var fs = 200, pad = 24;
    maskCanvas.width = 16; maskCanvas.height = 16;
    maskCtx.font = fs + "px 'Inclusive Sans', system-ui, sans-serif";
    var tw = Math.max(1, Math.ceil(maskCtx.measureText(str).width));
    var w = tw + pad * 2, h = Math.round(fs * 1.25) + pad * 2;
    maskCanvas.width = w; maskCanvas.height = h;
    maskCtx.fillStyle = '#fff';
    maskCtx.fillRect(0, 0, w, h);
    maskCtx.fillStyle = '#000';
    maskCtx.font = fs + "px 'Inclusive Sans', system-ui, sans-serif";
    maskCtx.textAlign = 'center';
    maskCtx.textBaseline = 'middle';
    maskCtx.fillText(str, w / 2, h / 2);
    buildMaskFromCanvas(w, h);
    done();
  }

  function rebuildMask(done) {
    if (cfg.object === 'text' && String(cfg.text).trim()) buildTextMask(String(cfg.text).trim(), done);
    /* a 4:1 word needs twice the raster width to keep its strokes */
    else if (cfg.object === 'wordmark') buildSvgMask(WORDMARK_SVG, WORDMARK_W, WORDMARK_H, 1024, done);
    else buildSvgMask(LOGO_SVG, LOGO_W, LOGO_H, MASK_W, done);
  }

  function sample(u, v) {
    if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
    var x = u * (maskW - 1), y = v * (maskH - 1);
    var x0 = x | 0, y0 = y | 0;
    var x1 = x0 + 1 < maskW ? x0 + 1 : x0;
    var y1 = y0 + 1 < maskH ? y0 + 1 : y0;
    var fx = x - x0, fy = y - y0;
    var a = mask[y0 * maskW + x0], b = mask[y0 * maskW + x1];
    var c = mask[y1 * maskW + x0], d = mask[y1 * maskW + x1];
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  }

  function hash(x, y) {
    var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  /* ══ Grid ════════════════════════════════════════════════════ */
  var cols = 0, rows = 0, charW = 8, charH = 12;

  function measureGrid() {
    charH = cfg.cell;
    var c = document.createElement('canvas').getContext('2d');
    c.font = cfg.cell + "px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    charW = c.measureText('M').width || cfg.cell * 0.6;

    baseEl.style.fontSize = accEl.style.fontSize = cfg.cell + 'px';
    baseEl.style.lineHeight = accEl.style.lineHeight = cfg.cell + 'px';

    cols = Math.ceil(stage.clientWidth / charW) + 1;
    rows = Math.ceil(stage.clientHeight / charH) + 1;
  }

  /* ══ Frame ═══════════════════════════════════════════════════ */
  var pointer = { x: 0.5, y: 0.5 };
  var t = 0, lastFrame = 0, fpsAvg = 0, msAvg = 0;

  function render(time) {
    if (!mask) return;
    var t0 = performance.now();

    var chars = CHARSETS[cfg.charset] || CHARSETS.classic;
    var last  = chars.length - 1;
    var mode  = reduced ? 'still' : cfg.mode;
    var amt   = cfg.amount;
    var gamma = cfg.gamma;
    var wantAcc = cfg.accentOn;
    var thr = cfg.threshold;

    var W = stage.clientWidth, H = stage.clientHeight;
    var boxW = W * (cfg.scale / 100);
    var boxH = boxW / maskAspect;
    var cx = W / 2 + W * (cfg.posX / 100);
    var cy = H / 2 + H * (cfg.posY / 100);
    var halfW = boxW / 2, halfH = boxH / 2;

    var ang = mode === 'spin' ? Math.sin(t * 0.35) * (0.2 + amt * 1.25) : 0;
    var ca = Math.cos(ang), sa = Math.sin(ang);
    var persp = 0.55;

    /* Rotating the light by -ang is the same as rotating every normal
       by +ang, and it is three multiplies instead of three per cell. */
    var lit = cfg.light;
    var la = cfg.lightAngle * Math.PI / 180;
    var lx0 = Math.cos(la) * 0.62, ly0 = Math.sin(la) * 0.62, lz0 = 0.78;
    var lx = lx0 * ca - lz0 * sa;
    var ly = ly0;
    var lz = lx0 * sa + lz0 * ca;
    var AMBIENT = 0.34;

    /* Normalise against the lambert of a flat, front-facing normal. The
       inside of the mark is flat, so without this every cell takes the
       same hit and the whole form just dims instead of gaining a bevel.
       Divided through, the flat core sits at exactly 1 and only the
       tilted edges ride above or below it. */
    var flatShade = AMBIENT + (1 - AMBIENT) * Math.max(0, lz);
    if (flatShade < 0.001) flatShade = 0.001;

    var base = '', accStr = '';

    for (var row = 0; row < rows; row++) {
      var vs = ((row + 0.5) * charH - cy) / halfH;

      for (var col = 0; col < cols; col++) {
        var us = ((col + 0.5) * charW - cx) / halfW;
        var u = us, v = vs, light = 1;

        if (mode === 'spin') {
          /* Inverse of  x = u·cos·s , y = v·s , s = 1/(1 + k·u·sin) */
          var den = ca - us * persp * sa;
          if (den > -1e-4 && den < 1e-4) { base += ' '; if (wantAcc) accStr += ' '; continue; }
          u = us / den;
          var z = u * sa;
          v = vs * (1 + persp * z);
          light = 1 - 0.42 * z;                 /* the far side thins out */
        } else if (mode === 'wave') {
          u = us + amt * 0.32 * Math.sin(vs * 2.4 + t * 1.1);
          v = vs + amt * 0.22 * Math.cos(us * 2.4 - t * 0.9);
        } else if (mode === 'cursor') {
          var pu = (pointer.x * W - cx) / halfW;
          var pv = (pointer.y * H - cy) / halfH;
          var dx = us - pu, dy = vs - pv;
          var push = amt * 0.5 / ((dx * dx + dy * dy) * 6 + 0.35);
          u = us + dx * push;
          v = vs + dy * push;
        }

        var mu = u * 0.5 + 0.5, mv = v * 0.5 + 0.5;
        var d = sample(mu, mv) * light;

        if (lit > 0 && d > 0.008) {
          var mx = (mu * (maskW - 1) + 0.5) | 0;
          var my = (mv * (maskH - 1) + 0.5) | 0;
          if (mx >= 0 && mx < maskW && my >= 0 && my < maskH) {
            var ni = my * maskW + mx;
            var lam = nrm.x[ni] * lx + nrm.y[ni] * ly + nrm.z[ni] * lz;
            if (lam < 0) lam = 0;
            var shade = (AMBIENT + (1 - AMBIENT) * lam) / flatShade;
            if (shade > 1.9) shade = 1.9;
            d *= 1 + lit * (shade - 1);
          }
        }

        if (mode === 'dissolve' && d > 0) {
          var sweep = Math.sin(t * 0.8) * 0.5 + 0.5;
          var n = hash(Math.floor(u * 40), Math.floor(v * 40));
          d *= Math.max(0, 1 - amt * 1.6 * Math.abs(n - sweep) * 2);
        }

        if (gamma !== 1) d = Math.pow(d, gamma);

        if (d <= 0.008) { base += ' '; if (wantAcc) accStr += ' '; continue; }
        if (d > 1) d = 1;

        var ch = chars.charAt((d * last + 0.5) | 0);
        if (wantAcc && d >= thr) { accStr += ch; base += ' '; }
        else { base += ch; if (wantAcc) accStr += ' '; }
      }
      base += '\n';
      if (wantAcc) accStr += '\n';
    }

    baseEl.textContent = base;
    accEl.textContent = wantAcc ? accStr : '';

    msAvg = msAvg ? msAvg * 0.9 + (performance.now() - t0) * 0.1 : performance.now() - t0;
    if (lastFrame) fpsAvg = fpsAvg ? fpsAvg * 0.9 + (1000 / (time - lastFrame)) * 0.1 : 1000 / (time - lastFrame);
    lastFrame = time;
    if (panel && document.body.classList.contains('ap-open')) panel.stats();
  }

  /* ══ Loop ════════════════════════════════════════════════════ */
  var acc = 0, prev = 0, dirty = true, running = false;

  function loop(time) {
    if (!running) return;
    requestAnimationFrame(loop);
    if (!prev) prev = time;
    var dt = time - prev;
    prev = time;

    var frozen = reduced || cfg.mode === 'still' || cfg.speed === 0;
    if (frozen && !dirty) return;

    acc += dt;
    if (acc < 1000 / cfg.fps && !dirty) return;
    acc = 0;

    if (!frozen) t += (dt / 1000) * cfg.speed;
    dirty = false;
    render(time);
  }

  /* The field lives in the hero, so once the hero has scrolled off
     there is nothing to paint. One observer, no scroll handler. */
  var onScreen = true;

  function start() {
    if (running || !onScreen) return;
    running = true; prev = 0;
    requestAnimationFrame(loop);
  }
  function stop() { running = false; }

  if (window.IntersectionObserver && stage.parentElement) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[entries.length - 1].isIntersecting;
      if (onScreen && enabled && !document.hidden) { dirty = true; start(); }
      else stop();
    }, { rootMargin: '120px' }).observe(stage.parentElement);
  }

  /* Nothing to paint while the tab is in the background. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (enabled) { dirty = true; start(); }
  });

  /* ══ Enable / disable ════════════════════════════════════════ */
  function evaluate() {
    var should = window.innerWidth >= cfg.minWidth;
    if (should === enabled) { if (enabled) { measureGrid(); dirty = true; } return; }
    enabled = should;
    stage.hidden = !enabled;
    if (enabled) {
      measureGrid();
      dirty = true;
      rebuildMask(function () { dirty = true; start(); });
    } else {
      stop();
      baseEl.textContent = accEl.textContent = '';
    }
  }

  function apply(needsMask) {
    document.documentElement.style.setProperty('--grain-opacity', cfg.grain);
    baseEl.style.color = cfg.ink;
    accEl.style.color = cfg.accent;
    stage.style.opacity = cfg.opacity;
    measureGrid();
    dirty = true;
    if (needsMask) rebuildMask(function () { dirty = true; });
    if (enabled) start();
  }

  function remember() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  /* Nothing here runs until boot(): while the GPU field owns the hero
     this module is only a fallback, and a resize must not switch it on. */
  var booted = false;
  window.addEventListener('resize', function () {
    if (!booted) return;
    evaluate(); if (enabled) { measureGrid(); dirty = true; }
  });
  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX / window.innerWidth;
    pointer.y = e.clientY / window.innerHeight;
    if (cfg.mode === 'cursor') dirty = true;
  }, { passive: true });

  /* ══ Dev panel ═══════════════════════════════════════════════
     Everything below exists only while DEV_PANEL is true. It has
     no effect on the field itself — it just writes into cfg. */
  var panel = null;

  function buildPanel() {
    var CSS = [
      '#ap{position:fixed;top:16px;right:16px;width:330px;z-index:500;background:rgba(255,255,255,.94);',
      'backdrop-filter:blur(8px);border:1px solid #BDBAB5;border-radius:6px;padding:14px;',
      'font:11px/1.4 Inter,system-ui,sans-serif;color:#423B3B;max-height:calc(100vh - 32px);',
      'overflow-y:auto;overflow-x:hidden;box-shadow:0 6px 24px rgba(66,59,59,.10);display:none}',
      'body.ap-open #ap{display:block}',
      '#ap h2{margin:0 0 2px;font:400 11px/1.4 inherit;letter-spacing:.09em;text-transform:uppercase;color:#BC4809}',
      '#ap .h{margin:0 0 12px;opacity:.5;font-size:10px}',
      '#ap .r{display:flex;align-items:center;gap:8px;margin-bottom:9px;min-width:0}',
      '#ap .r label{flex:0 0 74px;opacity:.65}',
      '#ap input[type=range]{flex:1;min-width:0;accent-color:#BC4809;height:16px}',
      '#ap .v{flex:0 0 42px;text-align:right;font-variant-numeric:tabular-nums;opacity:.75}',
      '#ap select,#ap input[type=text],#ap input[type=color]{flex:1;min-width:0;font:inherit;padding:4px 6px;',
      'border:1px solid #BDBAB5;border-radius:3px;background:#fff;color:#423B3B}',
      '#ap input[type=color]{padding:2px;height:26px}#ap input[type=checkbox]{accent-color:#BC4809}',
      '#ap fieldset{border:0;border-top:1px solid #BDBAB5;margin:14px 0 10px;padding:12px 0 0}',
      '#ap legend{font-size:10px;letter-spacing:.09em;text-transform:uppercase;opacity:.45;padding:0 6px 0 0}',
      '#ap .b{display:flex;gap:6px;margin-top:12px}',
      '#ap button{flex:1;font:inherit;padding:7px 8px;cursor:pointer;border:1px solid #BDBAB5;border-radius:3px;background:#fff;color:#423B3B}',
      '#ap button:hover{border-color:#BC4809;color:#BC4809}',
      '#ap button.p{background:#423B3B;border-color:#423B3B;color:#FCF9F2}',
      '#ap button.p:hover{background:#BC4809;border-color:#BC4809;color:#fff}',
      '#ap .s{margin-top:10px;font-size:10px;opacity:.45;font-variant-numeric:tabular-nums}',
      '#ap-t{position:fixed;bottom:16px;right:16px;z-index:501;background:#423B3B;color:#FCF9F2;padding:8px 12px;',
      'border-radius:4px;font:11px Inter,system-ui,sans-serif;opacity:0;transition:opacity .25s;pointer-events:none}',
      '#ap-t.on{opacity:1}'
    ].join('');

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    function range(id, label, min, max, step) {
      return '<div class="r"><label for="ap-' + id + '">' + label + '</label>' +
             '<input type="range" id="ap-' + id + '" min="' + min + '" max="' + max + '" step="' + step + '">' +
             '<span class="v" id="apv-' + id + '"></span></div>';
    }

    var el = document.createElement('div');
    el.id = 'ap';
    el.innerHTML =
      '<h2>ASCII field</h2><p class="h">H — close · values persist in this browser</p>' +
      '<fieldset><legend>Source</legend>' +
        '<div class="r"><label for="ap-object">object</label><select id="ap-object">' +
          '<option value="wordmark">Wlad.A wordmark</option><option value="logo">logo mark</option>' +
          '<option value="text">text</option></select></div>' +
        '<div class="r"><label for="ap-text">text</label><input type="text" id="ap-text" maxlength="24"></div>' +
        range('scale', 'scale', 10, 140, 0.5) +
        range('posX', 'offset x', -50, 50, 1) +
        range('posY', 'offset y', -50, 50, 1) +
        range('soft', 'softness', 0, 1, 0.01) +
        range('light', 'light', 0, 1, 0.01) +
        range('lightAngle', 'light dir', 0, 360, 1) +
        range('gamma', 'contrast', 0.3, 3, 0.05) +
      '</fieldset>' +
      '<fieldset><legend>Grid</legend>' +
        range('cell', 'cell size', 5, 28, 1) +
        '<div class="r"><label for="ap-charset">charset</label><select id="ap-charset">' +
          '<option value="classic">. : - = + * # % @</option>' +
          '<option value="brand">brand — …#%@WLAD</option>' +
          '<option value="fine">fine (70)</option>' +
          '<option value="digits">digits</option><option value="code">code</option>' +
          '<option value="blocks">blocks</option><option value="dots">dots</option></select></div>' +
      '</fieldset>' +
      '<fieldset><legend>Motion</legend>' +
        '<div class="r"><label for="ap-mode">mode</label><select id="ap-mode">' +
          '<option value="spin">spin</option><option value="wave">wave</option>' +
          '<option value="dissolve">dissolve</option><option value="cursor">cursor</option>' +
          '<option value="still">still</option></select></div>' +
        range('speed', 'speed', 0, 2, 0.05) +
        range('amount', 'amount', 0, 1, 0.01) +
        range('fps', 'fps cap', 10, 60, 1) +
      '</fieldset>' +
      '<fieldset><legend>Ink</legend>' +
        '<div class="r"><label for="ap-ink">base</label><input type="color" id="ap-ink"></div>' +
        range('opacity', 'opacity', 0.05, 1, 0.01) +
        '<div class="r"><label for="ap-accentOn">2nd layer</label><input type="checkbox" id="ap-accentOn"></div>' +
        '<div class="r"><label for="ap-accent">colour</label><input type="color" id="ap-accent"></div>' +
        range('threshold', 'threshold', 0.3, 1, 0.01) +
        range('grain', 'grain', 0, 0.3, 0.005) +
        range('minWidth', 'min width', 0, 1600, 32) +
      '</fieldset>' +
      '<div class="b"><button type="button" id="ap-reset">Reset</button>' +
      '<button type="button" id="ap-copy" class="p">Copy config</button></div>' +
      '<div class="s" id="ap-stats"></div>';
    document.body.appendChild(el);

    var toastEl = document.createElement('div');
    toastEl.id = 'ap-t';
    document.body.appendChild(toastEl);

    var toastTimer;
    function toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 1600);
    }

    /* key, kind, has-value-label, rebuilds-the-mask */
    var B = [
      ['object', 'value', 0, 1], ['text', 'value', 0, 1],
      ['scale', 'num', 1, 0], ['posX', 'num', 1, 0], ['posY', 'num', 1, 0],
      ['soft', 'num', 1, 1], ['light', 'num', 1, 0], ['lightAngle', 'num', 1, 0],
      ['gamma', 'num', 1, 0],
      ['cell', 'num', 1, 0], ['charset', 'value', 0, 0],
      ['mode', 'value', 0, 0], ['speed', 'num', 1, 0], ['amount', 'num', 1, 0], ['fps', 'num', 1, 0],
      ['ink', 'value', 0, 0], ['opacity', 'num', 1, 0],
      ['accentOn', 'check', 0, 0], ['accent', 'value', 0, 0], ['threshold', 'num', 1, 0],
      ['grain', 'num', 1, 0], ['minWidth', 'num', 1, 0]
    ];

    var INT = { scale: '%', posX: '%', posY: '%', cell: 'px', fps: '',
                minWidth: 'px', lightAngle: '\u00B0' };
    function fmt(k, v) {
      return k in INT ? Math.round(v) + INT[k] : Number(v).toFixed(2);
    }

    function push() {
      B.forEach(function (b) {
        var node = document.getElementById('ap-' + b[0]);
        if (b[1] === 'check') node.checked = cfg[b[0]];
        else node.value = cfg[b[0]];
        if (b[2]) document.getElementById('apv-' + b[0]).textContent = fmt(b[0], cfg[b[0]]);
      });
    }

    B.forEach(function (b) {
      var key = b[0], node = document.getElementById('ap-' + key);
      node.addEventListener('input', function () {
        cfg[key] = b[1] === 'num' ? parseFloat(node.value)
                 : b[1] === 'check' ? node.checked
                 : node.value;
        if (b[2]) document.getElementById('apv-' + key).textContent = fmt(key, cfg[key]);
        evaluate();
        apply(!!b[3]);
        remember();
      });
    });

    document.getElementById('ap-reset').addEventListener('click', function () {
      cfg = Object.assign({}, CONFIG);
      try { localStorage.removeItem(STORE_KEY); } catch (e) {}
      push(); evaluate(); apply(true);
      toast('Reset to CONFIG');
    });

    document.getElementById('ap-copy').addEventListener('click', function () {
      var lines = Object.keys(CONFIG).map(function (k) {
        var v = cfg[k];
        return '    ' + k + ': ' + (typeof v === 'string' ? "'" + v + "'" : v);
      });
      var text = '  var CONFIG = {\n' + lines.join(',\n') + '\n  };';
      navigator.clipboard.writeText(text).then(
        function () { toast('Config copied — paste over CONFIG in js/ascii.js'); },
        function () { toast('Copy blocked — logged to console'); console.log(text); }
      );
    });

    var statsEl = document.getElementById('ap-stats');
    push();

    return {
      stats: function () {
        statsEl.textContent = enabled
          ? cols + '×' + rows + ' = ' + (cols * rows).toLocaleString() + ' cells · ' +
            Math.round(fpsAvg) + ' fps · ' + msAvg.toFixed(1) + ' ms/frame' +
            (reduced ? ' · reduced-motion: frozen' : '')
          : 'off — viewport under ' + cfg.minWidth + 'px';
      }
    };
  }

  function boot() {
    if (booted) return;
    booted = true;
    if (DEV_PANEL) {
      panel = buildPanel();
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'h' && e.key !== 'H') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        var tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
        document.body.classList.toggle('ap-open');
        if (panel) panel.stats();
      });
    }
    apply(false);
    evaluate();
  }

  /* ══ Go ══════════════════════════════════════════════════════
     index.html decides up front which field runs (data-field on
     <html>). When it is the GPU one (js/field-gl.js), this module
     waits and only boots if that one reports it could not start. */
  if (document.documentElement.dataset.field === 'gl') {
    window.addEventListener('field:fallback', boot, { once: true });
  } else {
    boot();
  }
})();
