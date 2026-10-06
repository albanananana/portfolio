/* ============================================================
   Folder-tab navigation

   The visual trick lives in CSS (see the z-index sandwich note
   in style.css). This file only decides three things:

     · which tab is active
     · how far through that section you are  (0 → 1)
     · what colour the current section is

   and writes them to the DOM as a class, a --p custom property
   and two custom properties on :root.
   ============================================================ */
(function () {
  'use strict';

  /* Tab geometry, exported straight from the Figma vector
     (Portfolio › Desktop - 9 › Nav, node 239:1243).
     PLATE is the closed shape; EDGE is the same contour with the
     bottom removed — that edge is the nav hairline, drawn once
     as .nav__rule and shared by every tab. */
  var TAB_W = 155.694;
  var PLATE =
    'M4 4V28C4 30.2091 2.20914 32 0 32H155.694C154.611 32 153.575 31.561 152.821 30.7832' +
    'L129.188 6.38867C125.233 2.30538 119.791 0 114.105 0H8C5.79086 0 4 1.79086 4 4Z';
  var EDGE =
    'M0 32C2.20914 32 4 30.2091 4 28V4C4 1.79086 5.79086 0 8 0H114.105' +
    'C119.791 0 125.233 2.30538 129.188 6.38867L152.821 30.7832C153.575 31.561 154.611 32 155.694 32';

  /* 'solid'    — the tab fills the moment it becomes active (as designed)
     'progress' — the tab fills left to right as you read the section */
  var FILL_MODE = 'solid';

  var root     = document.documentElement;
  var body     = document.body;

  /* Every navigable band carries data-nav. Selecting on that rather
     than on `main section` is what lets the contact band be a real
     <footer> outside <main> and still own tab 06. querySelectorAll
     returns document order, so the tabs come out in page order. */
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
  var strip    = document.getElementById('tabs');
  var menu     = document.getElementById('menu');
  var burger   = document.querySelector('.burger');

  if (!sections.length || !strip) return;

  var tabs    = [];
  var fills   = [];
  var links   = [];
  var bounds  = [];
  var active  = -1;
  var painted = [];                    // last fill width written per tab

  /* ── Build the tabs and the mobile menu from the sections ──── */
  sections.forEach(function (section, i) {
    var num   = String(i + 1).padStart(2, '0');
    var label = section.dataset.nav || section.id;

    var tab = document.createElement('a');
    tab.className = 'tab';
    tab.href = '#' + section.id;
    tab.innerHTML =
      '<svg class="tab__svg" viewBox="0 0 155.694 32" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
        '<path class="tab__plate" d="' + PLATE + '"/>' +
        '<rect class="tab__fill" clip-path="url(#tab-clip)" x="0" y="0" width="0" height="32"/>' +
        '<path class="tab__edge" d="' + EDGE + '"/>' +
      '</svg>' +
      '<span class="tab__label tab__label--base"><b>' + num + '</b>' + label + '</span>' +
      '<span class="tab__label tab__label--fill" aria-hidden="true"><b>' + num + '</b>' + label + '</span>';
    strip.appendChild(tab);
    tabs.push(tab);
    fills.push(tab.querySelector('.tab__fill'));

    var link = document.createElement('a');
    link.href = '#' + section.id;
    link.innerHTML = '<b>' + num + '</b>' + label;
    menu.appendChild(link);
    links.push(link);
  });

  /* ── Measure where each section takes over ─────────────────── */
  /* Measure the bar itself rather than reading --nav-h. A custom
     property comes back from getComputedStyle as its substituted
     token stream, not a used value, so `round(max(64px, …), 1px)`
     parseFloats to NaN and every boundary silently lost the bar's
     height. The rendered box is the value we actually want anyway. */
  var navEl = document.getElementById('nav');
  function navHeight() {
    return navEl ? navEl.getBoundingClientRect().height : 0;
  }

  function measure() {
    var maxScroll = Math.max(0, root.scrollHeight - window.innerHeight);
    var nav = navHeight();

    bounds = sections.map(function (section, i) {
      return i === 0 ? 0 : Math.max(0, section.offsetTop - nav);
    });
    bounds.push(maxScroll);            // sentinel: end of the last section

    /* A section shorter than the viewport can never bring its own
       top up to the nav line, so without this the last tab would
       only light up on the final pixel of the page. Walk back from
       the end and give every tab at least a third of a screen. */
    var minSpan = Math.round(window.innerHeight * 0.35);
    for (var i = bounds.length - 2; i > 0; i--) {
      bounds[i] = Math.max(0, Math.min(bounds[i], bounds[i + 1] - minSpan));
    }
  }

  /* ── Paint ─────────────────────────────────────────────────── */
  function update() {
    var y = window.scrollY;

    /* Skip any section squeezed to a zero-length span — otherwise a
       page that fits entirely in the viewport (every bound at 0)
       would light up the last tab instead of the first. */
    var i = 0;
    for (var k = 0; k < sections.length; k++) {
      if (y >= bounds[k] - 1 && bounds[k + 1] > bounds[k]) i = k;
    }

    var span = Math.max(1, bounds[i + 1] - bounds[i]);
    var p = Math.min(1, Math.max(0, (y - bounds[i]) / span));

    if (i !== active) {
      active = i;
      var section = sections[i];
      root.style.setProperty('--section-bg', section.dataset.bg);
      root.style.setProperty('--section-fg', section.dataset.fg);
      tabs.forEach(function (tab, k) { tab.classList.toggle('is-active', k === i); });
      links.forEach(function (link, k) { link.classList.toggle('is-active', k === i); });
    }

    /* Only touch a tab whose fill actually changed. Writing inline
       styles on all six every scroll frame invalidated their style
       for nothing — in solid mode the values only change when the
       active tab does. */
    tabs.forEach(function (tab, k) {
      var v = k !== i ? 0 : (FILL_MODE === 'progress' ? p : 1);
      var w = (v * TAB_W).toFixed(2);
      if (painted[k] === w) return;
      painted[k] = w;
      tab.style.setProperty('--p', v);
      fills[k].setAttribute('width', w);   // fallback for older engines
      fills[k].style.width = w + 'px';     // transitionable in solid mode
    });
  }

  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; update(); });
  }

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

  /* ── Go ────────────────────────────────────────────────────── */
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); update(); });

  measure();
  update();

  /* Paint the first state, THEN turn transitions on — otherwise the
     opening tab visibly fills itself in on every page load. */
  requestAnimationFrame(function () {
    body.classList.add('fill-' + FILL_MODE);
  });

  /* Webfonts land after first paint and move everything down a few
     pixels — remeasure once they are in. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { measure(); update(); });
  }
  window.addEventListener('load', function () { measure(); update(); });
})();
