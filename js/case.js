/* ============================================================
   Case page

   Two small jobs. js/main.js is not loaded here — it builds the
   tabs from the page's own [data-nav] bands, and on a case page
   the bar must keep pointing at the home page instead.

     · the burger, same behaviour as the home page
     · which contents link is current

   The contents list itself is sticky in CSS; this only marks the
   section you are reading.
   ============================================================ */
(function () {
  'use strict';

  var body   = document.body;
  var burger = document.querySelector('.burger');
  var menu   = document.getElementById('menu');

  /* ── Mobile menu ───────────────────────────────────────────── */
  function closeMenu() {
    body.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
  }

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('menu-open')) closeMenu();
    });
  }

  /* ── Shot tabs ─────────────────────────────────────────────
     One shot can carry two states (decision 01: the filter row
     expanded and collapsed). The panels are plain divs; this only
     swaps which one is shown. */
  Array.prototype.forEach.call(document.querySelectorAll('.shot__tabs'), function (strip) {
    var tabs = Array.prototype.slice.call(strip.querySelectorAll('.shot__tab'));
    strip.addEventListener('click', function (e) {
      var tab = e.target.closest('.shot__tab');
      if (!tab) return;
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
    });
  });

  /* ── Contents ──────────────────────────────────────────────── */
  var links = Array.prototype.slice.call(
    document.querySelectorAll('.contents__list a[href^="#"]')
  );
  if (!links.length) return;

  var targets = links
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);
  if (targets.length !== links.length) return;

  var navEl = document.getElementById('nav');
  var current = -1;

  /* A section is current once its top has passed under the bar. The
     line is a little below the bar itself so a heading that has just
     arrived does not flip the mark while it is still being read. */
  function update() {
    var line = (navEl ? navEl.getBoundingClientRect().height : 0) + 80;
    var i = 0;
    for (var k = 0; k < targets.length; k++) {
      if (targets[k].getBoundingClientRect().top <= line) i = k;
    }
    /* The last link wins at the foot of the page, where the final
       section may be too short to reach the line on its own. */
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      i = targets.length - 1;
    }
    if (i === current) return;
    current = i;
    links.forEach(function (a, k) { a.classList.toggle('is-current', k === i); });
  }

  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; update(); });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', update);
  update();
})();
