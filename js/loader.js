/* ============================================================
   Loader — Figma "Portfolio" › Loader (node 269:936)

   One GSAP timeline, about 3 s end to end. The first frame is the
   Figma frame itself, already in place — no entrance.

     1 · flick    the project shots run past inside the frame, slow →
                  fast → slow (an in-out ease over the whole run)
     2 · close    the halves slam together over the frame and land
                  as the whole logo; the shared strokes turn red
     3 · exit     the dark ground lifts, the logo flies into the
                  nav logo's place, the hero copy rises in

   Markup and start states: index.html / style.css (.loader).
   Without GSAP, or if anything throws, the page is simply shown.
   ============================================================ */
(function () {
  'use strict';

  /* ── Tuning ─────────────────────────────────────────────────── */
  var ONCE_PER_SESSION = false;   // true: play on the first visit of a tab session only
  var T = {
    flick:  1.3,    // s — the whole run of shots, eased by FLICK_EASE
    close:  0.42,   // s — halves slam shut
    hold:   0.08,   // s — the whole logo sits still after the impact
    exit:   0.7     // s — ground lifts, logo docks in the nav
  };
  var FLICK_EASE = 'power2.inOut';   // 'sine.inOut' gentler, 'expo.inOut' more extreme, 'none' even
  var WAIT_FOR_SHOTS = 900;       // ms — longest the flick waits for images to decode
  var RED = '#FA4D48', INK = '#121212', PAPER = '#F5F3EE';

  /* Where the halves end up, as a share of their own width. In the
     Figma frame the A starts 548.94 px right of the W; in the logo it
     starts 40.38 px right of it. Both are centred on the stage:
       W  0      → 186.95   = +186.95 / 348.73 wide
       A  548.94 → 227.32   = −321.62 / 173.68 wide              */
  var W_SHIFT = 53.607, A_SHIFT = -185.178;

  var root = document.documentElement;
  var el   = document.getElementById('loader');
  if (!el) return;

  var navImg = document.querySelector('.nav__logo img');

  function finish() {
    clearTimeout(window.__loaderSafety);
    root.classList.remove('is-loading', 'is-locked');
    if (el.parentNode) el.parentNode.removeChild(el);
    if (navImg) navImg.style.visibility = '';
    window.dispatchEvent(new Event('loader:done'));
  }

  if (!root.classList.contains('is-loading')) { finish(); return; }   // reduced motion
  var gsap = window.gsap;
  if (!gsap) { finish(); return; }
  /* From here this file guarantees its own ending; the 6 s CSS
     safety net in <head> would only cut a slow start short. */
  clearTimeout(window.__loaderSafety);
  if (ONCE_PER_SESSION) {
    try {
      if (sessionStorage.getItem('loader-seen')) { finish(); return; }
      sessionStorage.setItem('loader-seen', '1');
    } catch (e) {}
  }

  /* The show starts at the top of the page (unless a link sent us
     to a section). */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' });

  var bg     = el.querySelector('.loader__bg');
  var stage  = el.querySelector('.loader__stage');
  var halfW  = el.querySelector('.loader__half--w');
  var halfA  = el.querySelector('.loader__half--a');
  var reveal = el.querySelector('.loader__reveal');
  var shots  = Array.prototype.slice.call(reveal.querySelectorAll('img'));

  /* Decode the shots up front so each swap is a single frame. */
  var decoded = Promise.all(shots.map(function (img) {
    return (img.decode ? img.decode() : Promise.resolve()).catch(function () {});
  }));
  var capped = Promise.race([decoded, new Promise(function (r) { setTimeout(r, WAIT_FOR_SHOTS); })]);

  /* The first shot is on screen from the start; the run begins once
     the rest are decoded (capped). */
  capped.then(run).catch(finish);

  function run() {
    var tl = gsap.timeline();

    /* 1 · flick --------------------------------------------------- */
    /* One eased counter over the whole run: each shot owns an equal
       slice of the *progress*, so under an in-out ease the first and
       last shots linger and the middle ones flash. */
    var reel = [shots[0]].concat(shots.slice(1).filter(function (img) {
      return img.complete && img.naturalWidth;
    }));
    var shown = 0, counter = { i: 0 };
    tl.to(counter, {
      i: reel.length - 0.001,
      duration: T.flick,
      ease: FLICK_EASE,
      onUpdate: function () {
        var k = Math.floor(counter.i);
        if (k === shown) return;
        reel[shown].style.visibility = 'hidden';
        reel[k].style.visibility = 'visible';
        shown = k;
      }
    });

    /* 2 · close --------------------------------------------------- */
    tl.addLabel('close')
      .to(halfW,  { xPercent: W_SHIFT, duration: T.close, ease: 'power4.in' }, 'close')
      .to(halfA,  { xPercent: A_SHIFT, duration: T.close, ease: 'power4.in' }, 'close')
      .fromTo(reveal, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 50% 0% 50%)', duration: T.close, ease: 'power4.in', immediateRender: false }, 'close')
      .addLabel('shut', 'close+=' + T.close)
      .set(reveal.parentNode, { visibility: 'hidden' }, 'shut')
      .fromTo(stage, { scale: 1.035 }, { scale: 1, duration: 0.35, ease: 'expo.out', immediateRender: false }, 'shut')
      .to(el, { '--lo-shared': RED, duration: 0.18, ease: 'none' }, 'shut')
      .to({}, { duration: T.hold });

    /* 3 · exit ---------------------------------------------------- */
    tl.addLabel('exit').call(dock, null, 'exit');
    tl.to(bg, { yPercent: -100, duration: T.exit, ease: 'expo.inOut', onUpdate: inkByEdge }, 'exit');

    var copy = document.querySelectorAll('.intro__text p');
    if (copy.length) {
      tl.fromTo(copy,
        { y: 48, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.07, clearProps: 'transform,opacity' },
        'exit+=' + T.exit * 0.45);
    }
    /* the copy keeps easing after the loader is gone — do not wait for it */
    tl.call(finish, null, 'exit+=' + T.exit);
    setTimeout(finish, (tl.duration() + 1) * 1000);   // if a frame callback ever throws
  }

  /* The logo is light while it is over the dark ground and dark once
     it is over the page. Rather than timing that by guess, follow the
     ground's lower edge as it sweeps up past the logo. */
  var toInk = null;
  function inkByEdge() {
    toInk = toInk || gsap.utils.interpolate(PAPER, INK);
    var edge = bg.getBoundingClientRect().bottom;
    var r = halfW.getBoundingClientRect();
    var f = Math.min(1, Math.max(0, (r.bottom - edge) / (r.height || 1)));
    el.style.setProperty('--lo-ink', toInk(f));
  }

  /* The flight has to be measured at the moment it starts: the scroll
     lock comes off first (a returning scrollbar would move the nav),
     then the whole logo is mapped onto the nav logo's box. */
  function dock() {
    root.classList.remove('is-locked');
    var n = navImg && navImg.getBoundingClientRect();
    var r = halfW.getBoundingClientRect();        // the W box = the whole logo's top-left and width
    if (!n || !n.width || !r.width) {
      gsap.to(stage, { opacity: 0, scale: 0.9, duration: T.exit * 0.6, ease: 'expo.inOut' });
      return;
    }
    var s = stage.getBoundingClientRect();
    navImg.style.visibility = 'hidden';
    gsap.set(stage, { transformOrigin: (r.left - s.left) + 'px ' + (r.top - s.top) + 'px' });
    gsap.to(stage, {
      x: n.left - r.left,
      y: n.top - r.top,
      scale: n.width / r.width,
      duration: T.exit,
      ease: 'expo.inOut'
    });
  }
})();
