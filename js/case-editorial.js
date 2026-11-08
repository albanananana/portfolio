/* ============================================================
   Case page, editorial (bondata-editorial.html)

   On top of js/case.js, which runs the videos:

     · home — the corner chip leaves on the way down and comes back on
       the way up
     · contents — one nav fixed on the left at mid-height, shown while
       the bands are on screen, the band being read marked
     · zoom — images open full screen on a click and close on another
     · tabs — the research tables, one at a time (dishcover.html)
     · figures — the stat figures, the chart and the findings come in once, when
       they reach the window: bars grow from zero like a progress bar
       and the number beside each counts up from 0 (GSAP)

   Under reduced motion, without IntersectionObserver or without GSAP
   the figures are simply shown as they are in the markup, and the
   zoom opens and closes without moving.
   ============================================================ */
(function () {
  'use strict';

  var gsap = window.gsap;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var moving = !!gsap && !still;

  /* ── Home and contents: both follow the scroll ────────────── */
  var home = document.querySelector('.ed-home');
  var nav = document.querySelector('.ed-toc');
  var links = nav ? Array.prototype.slice.call(nav.querySelectorAll('a')) : [];
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  // Shown from the first band to the last one. Overview is the hero, which the
  // contents stay off: there they would sit on top of the title.
  var bands = targets.filter(function (t) { return t && t.classList.contains('ed-sec'); });
  var first = bands[0], last = bands[bands.length - 1];
  var lastY = window.scrollY, current = -1;

  function onScroll() {
    var y = window.scrollY, vh = window.innerHeight;

    // Home: in at the top and on any scroll up, away on a scroll down.
    if (home) {
      if (y < 40 || y < lastY - 4) home.classList.remove('is-away');
      else if (y > lastY + 4 && document.activeElement !== home) home.classList.add('is-away');
    }
    lastY = y;

    if (!nav || !first || !last) return;
    // Contents: only while the bands cross the middle of the window.
    var mid = vh * 0.5;
    var on = first.getBoundingClientRect().top <= mid && last.getBoundingClientRect().bottom >= mid;
    nav.classList.toggle('is-shown', on);

    /* A band is current once its top has passed a line a quarter of
       the way down the window; the early results band has no entry of
       its own and leaves the entry before it marked. */
    var line = vh * 0.25, i = 0;
    targets.forEach(function (t, k) { if (t && t.getBoundingClientRect().top <= line) i = k; });
    if (i !== current) {
      current = i;
      links.forEach(function (a, k) { a.classList.toggle('is-current', k === i); });
    }
  }
  var queued = false;
  window.addEventListener('scroll', function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; onScroll(); });
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ── Zoom ─────────────────────────────────────────────────── */
  var zooms = Array.prototype.slice.call(document.querySelectorAll('.ed-zoom'));
  if (zooms.length) {
    var box = document.createElement('div');
    box.className = 'ed-lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Image, full screen');
    box.innerHTML = '<img alt=""><button class="ed-lightbox__close" type="button">Close</button>';
    document.body.appendChild(box);
    var big = box.querySelector('img'), close = box.querySelector('.ed-lightbox__close');
    var opener = null, busy = false;

    function open(trigger) {
      if (busy || !box.hidden) return;
      var src = trigger.querySelector('img');
      opener = trigger;
      big.src = src.currentSrc || src.src;
      big.alt = src.alt;
      box.hidden = false;
      document.documentElement.classList.add('ed-locked');
      close.focus({ preventScroll: true });
      if (!moving) return;
      // Grow out of the image on the page.
      var a = src.getBoundingClientRect(), b = big.getBoundingClientRect();
      busy = true;
      gsap.fromTo(box, { backgroundColor: 'rgba(18,18,18,0)' }, { backgroundColor: 'rgba(18,18,18,.92)', duration: 0.35, ease: 'power2.out' });
      gsap.fromTo(close, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.2 });   // opacity only: a hidden button would drop the focus
      gsap.fromTo(big, {
        x: a.left + a.width / 2 - (b.left + b.width / 2),
        y: a.top + a.height / 2 - (b.top + b.height / 2),
        scale: a.width / b.width
      }, { x: 0, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', onComplete: function () { busy = false; } });
    }

    function shut() {
      if (busy || box.hidden) return;
      function done() {
        box.hidden = true;
        gsap && gsap.set([box, big, close], { clearProps: 'all' });
        document.documentElement.classList.remove('ed-locked');
        if (opener) opener.focus({ preventScroll: true });
        busy = false;
      }
      if (!moving) { done(); return; }
      // Back into the image on the page.
      var a = opener.querySelector('img').getBoundingClientRect(), b = big.getBoundingClientRect();
      busy = true;
      gsap.to(close, { opacity: 0, duration: 0.15 });
      gsap.to(box, { backgroundColor: 'rgba(18,18,18,0)', duration: 0.35, ease: 'power2.in' });
      gsap.to(big, {
        x: a.left + a.width / 2 - (b.left + b.width / 2),
        y: a.top + a.height / 2 - (b.top + b.height / 2),
        scale: a.width / b.width,
        duration: 0.4, ease: 'power3.inOut', onComplete: done
      });
    }

    zooms.forEach(function (z) {
      z.addEventListener('click', function () { open(z); });
      z.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(z); }
      });
    });
    box.addEventListener('click', shut);
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); shut(); }
      else if (e.key === 'Tab') { e.preventDefault(); close.focus(); }   // one control: focus stays on it
    });
  }

  /* ── Tabs ─────────────────────────────────────────────────── */
  /* A tablist: a click or Enter opens a tab; the arrows, Home and End
     move along the list and open the tab they land on. */
  Array.prototype.forEach.call(document.querySelectorAll('.ed-tabs'), function (box) {
    var tabs = Array.prototype.slice.call(box.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      // On a phone the list scrolls sideways: bring the open tab into it.
      var list = tab.parentNode, l = list.getBoundingClientRect(), r = tab.getBoundingClientRect();
      if (r.left < l.left || r.right > l.right) list.scrollLeft += r.right > l.right ? r.right - l.right : r.left - l.left;
      if (focus) tab.focus({ preventScroll: true });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        select(tabs[(to + tabs.length) % tabs.length], true);
      });
    });
  });

  /* ── Figures ──────────────────────────────────────────────── */
  if (!moving || !('IntersectionObserver' in window)) return;

  var EASE = 'power3.out';

  /* "+137%", "−63%", "~40", "2 of 8", "3.5", "2.3K": the first number
     counts, keeping its decimals; whatever sits around it stays. It
     counts from 0, or from data-from: an "after" from its "before". */
  function counter(el) {
    if (!el) return null;                       // a figure with nothing to count, like a stage number
    var text = el.textContent;
    var m = text.match(/^(\D*?)(\d+(?:\.\d+)?)([\s\S]*)$/);
    if (!m) return null;
    var dp = (m[2].split('.')[1] || '').length;
    var from = parseFloat(el.getAttribute('data-from')) || 0;
    var end = parseFloat(m[2]), state = { n: from };
    function paint() { el.textContent = m[1] + state.n.toFixed(dp) + m[3]; }
    paint();
    return function (opts) {
      return gsap.to(state, Object.assign({ n: end, onUpdate: paint, onComplete: function () { el.textContent = text; } }, opts));
    };
  }

  /* Each group is set to its start the moment the script runs (all of
     them sit below the first screen) and plays once on arrival. */
  var groups = [];

  // Stat figures: rise in one after another, the value counting up.
  Array.prototype.forEach.call(document.querySelectorAll('.ed-stats'), function (list) {
    var items = list.querySelectorAll('.ed-stat');
    var counts = Array.prototype.map.call(items, function (it) { return counter(it.querySelector('[data-count]')); });
    gsap.set(items, { autoAlpha: 0, y: 24 });
    groups.push({ el: list, play: function () {
      gsap.to(items, { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE, stagger: 0.12 });
      counts.forEach(function (c, i) { if (c) c({ duration: 1.4, ease: 'power2.out', delay: 0.15 + i * 0.12 }); });
    } });
  });

  // Before → after list: the items come in one after another, and each
  // "after" counts from its "before" (18 up to 31, 74 s down to 22 s).
  Array.prototype.forEach.call(document.querySelectorAll('.ed-deltas'), function (fig) {
    var items = fig.querySelectorAll('.ed-delta');
    var counts = Array.prototype.map.call(items, function (it) { return counter(it.querySelector('[data-count]')); });
    var cap = fig.querySelector('.ed-caption');
    gsap.set(items, { autoAlpha: 0, y: 16 });
    if (cap) gsap.set(cap, { autoAlpha: 0 });
    groups.push({ el: fig, play: function () {
      gsap.to(items, { autoAlpha: 1, y: 0, duration: 0.6, ease: EASE, stagger: 0.1 });
      counts.forEach(function (c, i) { if (c) c({ duration: 1.2, ease: 'power2.out', delay: 0.25 + i * 0.1 }); });
      if (cap) gsap.to(cap, { autoAlpha: 1, duration: 0.6, delay: 0.8 });
    } });
  });

  // Findings: the rows come in one after another; a row with a bar
  // loads it from the left, its value counting beside it.
  Array.prototype.forEach.call(document.querySelectorAll('.ed-bars'), function (fig) {
    var rows = Array.prototype.slice.call(fig.querySelectorAll('li'));
    var bars = rows.filter(function (r) { return r.querySelector('.ed-bar__fill'); });
    var fills = bars.map(function (r) { return r.querySelector('.ed-bar__fill'); });
    var counts = bars.map(function (r) { return counter(r.querySelector('[data-count]')); });
    gsap.set(rows, { autoAlpha: 0, y: 12 });
    gsap.set(fills, { width: 0 });
    groups.push({ el: fig, play: function () {
      gsap.to(rows, { autoAlpha: 1, y: 0, duration: 0.5, ease: EASE, stagger: 0.1 });
      fills.forEach(function (fill, i) {
        var at = 0.15 + rows.indexOf(bars[i]) * 0.1;   // with its own row
        gsap.set(fill, { clearProps: 'width' });
        var w = fill.offsetWidth;
        gsap.fromTo(fill, { width: 0 }, {
          width: w, duration: 1.2, ease: EASE, delay: at,
          onComplete: function () { gsap.set(fill, { clearProps: 'width' }); }
        });
        if (counts[i]) counts[i]({ duration: 1.2, ease: EASE, delay: at });
      });
    } });
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      groups.forEach(function (g) { if (g.el === e.target) g.play(); });
    });
  }, { threshold: 0.25 });
  groups.forEach(function (g) { io.observe(g.el); });
})();
