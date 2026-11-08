/* ============================================================
   Case page

   The case is full screen — no bar, so none of js/main.js. Two
   small jobs for the contents rail, which is sticky in CSS:

     · mark the section being read
     · fade the rail out while the cover passes behind it — the
       cover runs edge to edge, and grey labels over a screenshot
       read as noise
   ============================================================ */
/* ── Decision videos ──────────────────────────────────────────
   Each holds on the before state, then turns into the after. They
   load nothing until near the window (preload="none", the poster is
   the before still), play while at least a third is on screen and
   pause when it leaves.

   Each frame gets a bar: play/pause, a scrub line and the time. It
   shows while the pointer is over the frame, or on keyboard focus;
   on a touch screen a tap shows it for a few seconds.
   A pause by the reader sticks — scrolling back does not restart
   that video until they press play. Under reduced motion nothing
   starts on its own. */
(function () {
  'use strict';

  var videos = Array.prototype.slice.call(document.querySelectorAll('.case__video'));
  if (!videos.length) return;

  var still = matchMedia('(prefers-reduced-motion: reduce)').matches ||
              !('IntersectionObserver' in window);

  var ICON_PLAY  = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" fill="currentColor"/></svg>';

  function clock(t) {
    t = Math.max(0, Math.floor(t || 0));
    var s = t % 60;
    return Math.floor(t / 60) + ':' + (s < 10 ? '0' : '') + s;
  }

  function attach(v) {
    var frame = v.parentNode;
    var bar = document.createElement('div');
    bar.className = 'vctl';
    bar.innerHTML =
      '<button class="vctl__play" type="button"></button>' +
      '<input class="vctl__seek" type="range" min="0" max="1000" step="1" value="0" aria-label="Seek">' +
      '<span class="vctl__time" aria-hidden="true">0:00 / 0:00</span>';
    frame.appendChild(bar);
    frame.classList.add('has-vctl');

    var btn  = bar.querySelector('.vctl__play');
    var seek = bar.querySelector('.vctl__seek');
    var time = bar.querySelector('.vctl__time');
    var scrubbing = false, resume = false, raf = 0;

    v.userPaused = still;

    function paint() {
      var d = v.duration || 0;
      var p = d ? v.currentTime / d : 0;
      if (!scrubbing) seek.value = Math.round(p * 1000);
      seek.style.setProperty('--p', (seek.value / 10) + '%');
      time.textContent = clock(v.currentTime) + ' / ' + clock(d);
      seek.setAttribute('aria-valuetext', clock(v.currentTime) + ' of ' + clock(d));
    }
    function loop() { paint(); raf = v.paused ? 0 : requestAnimationFrame(loop); }
    function state() {
      var on = !v.paused;
      btn.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
      btn.setAttribute('aria-label', on ? 'Pause' : 'Play');
      frame.classList.toggle('is-paused', !on);
      /* paused by the reader, not by scrolling away (the editorial case
         keeps the bar up for exactly this) */
      frame.classList.toggle('is-held', !on && !!v.userPaused);
      if (on && !raf) raf = requestAnimationFrame(loop);
      paint();
    }

    function play() {
      var p = v.play();
      if (p && p.catch) p.catch(function () {});   /* a blocked autoplay leaves the poster */
    }
    function toggle() {
      if (v.paused) { v.userPaused = false; play(); }
      else          { v.userPaused = true;  v.pause(); }
    }

    /* Touch has no hover: a tap shows the bar for a few seconds, and
       any touch on the frame starts the count again. A tap on the
       video while the bar is hidden only shows it; with the bar up,
       a tap plays or pauses. */
    var touch = false, wasShown = false, hideT = 0;
    function show() {
      bar.classList.add('is-shown');
      clearTimeout(hideT);
      hideT = setTimeout(hide, 2500);
    }
    function hide() {
      if (scrubbing) { hideT = setTimeout(hide, 2500); return; }
      bar.classList.remove('is-shown');
    }
    frame.addEventListener('pointerdown', function (e) {
      touch = e.pointerType === 'touch';
      if (!touch) return;
      wasShown = bar.classList.contains('is-shown');
      show();
    }, true);

    btn.addEventListener('click', toggle);
    v.addEventListener('click', function () {
      if (touch && !wasShown) return;
      toggle();
    });

    /* Scrubbing holds the video, then picks up where it was. */
    seek.addEventListener('pointerdown', function () {
      if (scrubbing) return;
      scrubbing = true; resume = !v.paused; v.pause();
    });
    seek.addEventListener('input', function () {
      var d = v.duration;
      if (!d) { v.preload = 'auto'; return; }
      v.currentTime = seek.value / 1000 * d;
      paint();
    });
    function release() {
      if (!scrubbing) return;
      scrubbing = false;
      if (resume) play();
      if (touch) show();
    }
    seek.addEventListener('pointerup', release);
    seek.addEventListener('pointercancel', release);
    seek.addEventListener('change', release);

    ['play', 'pause', 'loadedmetadata', 'durationchange'].forEach(function (e) {
      v.addEventListener(e, state);
    });
    v.addEventListener('seeked', paint);
    state();
  }

  videos.forEach(attach);

  if (still) {
    videos.forEach(function (v) { v.preload = 'metadata'; });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting && e.intersectionRatio >= 0.33) {
        if (v.userPaused) return;
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { threshold: [0, 0.33] });
  videos.forEach(function (v) { io.observe(v); });
})();

(function () {
  'use strict';

  var rail  = document.querySelector('.contents');
  var cover = document.querySelector('.case__cover');
  var links = Array.prototype.slice.call(
    document.querySelectorAll('.contents__list a[href^="#"]')
  );
  if (!rail || !links.length) return;

  var targets = links
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);
  if (targets.length !== links.length) return;

  var current = -1, hidden = false;

  /* A section is current once its top has passed a line a little
     below the top of the window, so a heading that has only just
     arrived does not flip the mark while it is still being read. */
  function update() {
    var line = window.innerHeight * 0.25;
    var i = 0;
    for (var k = 0; k < targets.length; k++) {
      if (targets[k].getBoundingClientRect().top <= line) i = k;
    }
    if (i !== current) {
      current = i;
      links.forEach(function (a, k) { a.classList.toggle('is-current', k === i); });
    }

    /* Overlap of the rail's box and the cover's, vertically. Only
       where the rail floats over the page — on narrow screens it is a
       strip with its own ground and stays. */
    var over = false;
    if (cover && getComputedStyle(rail).position === 'sticky' && window.innerWidth >= 1024) {
      var r = rail.getBoundingClientRect(), c = cover.getBoundingClientRect();
      over = r.bottom > c.top && r.top < c.bottom;
    }
    if (over !== hidden) {
      hidden = over;
      rail.classList.toggle('is-hidden', over);
    }
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
