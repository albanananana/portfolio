/* Analytics and the cookie banner: Google Analytics 4, Microsoft
   Clarity, Hotjar / Contentsquare.

   Fill in the IDs below. An empty ID means that service is not loaded;
   with all four empty there is no banner. The banner says "analytics
   tools" and links to /privacy, which names each one: keep that page
   in step with the IDs switched on here.

   Nothing loads before the visitor clicks Accept (Polish PKE art. 399,
   GDPR art. 6(1)(a)). The choice is kept in localStorage for a year,
   then the banner asks again. "cookie settings" in the footer and on
   /privacy (any [data-consent-open] element) brings it back, and any
   [data-consent-ui] element is shown only while analytics is on; Decline
   after an Accept deletes the services' cookies and reloads the page.

   The banner shows on any host, so it can be checked locally, but the
   services load only on the live domain: local work and Vercel
   previews stay out of the stats.

   Your own visits: open https://wlad.design/?notrack=1 once in each
   browser you use and that browser is no longer counted.
   ?notrack=0 turns counting back on. */
(function () {
  var IDS = {
    // GA4 → Admin → Data streams → your stream → Measurement ID, "G-XXXXXXXXXX"
    ga4: 'G-FSLDCZ6XJQ',
    // Clarity → Settings → Overview → Project ID, about 10 characters
    clarity: 'zfkjcnj748',
    // Old Hotjar account only: Sites & Organizations → Site ID, digits only
    hotjar: '',
    // Contentsquare (Hotjar's successor): the tag ID, the part after
    // --tag-id in its install command or before .js in its tag URL
    contentsquare: '9ef8242e38586'
  };

  var LIVE_HOSTS = ['wlad.design', 'www.wlad.design'];
  var KEY = 'analytics-consent';
  var YEAR = 365 * 24 * 60 * 60 * 1000;

  if (!IDS.ga4 && !IDS.clarity && !IDS.hotjar && !IDS.contentsquare) return;

  var live = LIVE_HOSTS.indexOf(location.hostname) !== -1;
  var notrack = false;
  try {
    var flag = new URLSearchParams(location.search).get('notrack');
    if (flag === '1') localStorage.setItem('notrack', '1');
    if (flag === '0') localStorage.removeItem('notrack');
    notrack = localStorage.getItem('notrack') === '1';
  } catch (e) {}

  function readChoice() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY));
      if (c && (c.v === 'granted' || c.v === 'denied') && Date.now() - c.t < YEAR) return c.v;
    } catch (e) {}
    return null;
  }
  function saveChoice(v) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: v, t: Date.now() })); } catch (e) {}
  }

  /* ── The services ─────────────────────────────────────────── */
  var started = false;

  function load(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function start() {
    if (started || !live || notrack) return;
    started = true;

    // Google Analytics 4. Page views, scroll depth, outbound links and
    // PDF downloads (the CV) come from Enhanced measurement, on by
    // default for a new web stream. Analytics storage only: no ads.
    if (IDS.ga4) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { dataLayer.push(arguments); };
      gtag('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
      });
      gtag('js', new Date());
      gtag('config', IDS.ga4);
      load('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(IDS.ga4));
    }

    // Microsoft Clarity: heatmaps and session recordings. For visits
    // from the EEA, UK and Switzerland it waits for this consent call
    // and otherwise records each page as a separate, cookieless visit.
    if (IDS.clarity) {
      window.clarity = window.clarity || function () {
        (window.clarity.q = window.clarity.q || []).push(arguments);
      };
      clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
      load('https://www.clarity.ms/tag/' + encodeURIComponent(IDS.clarity));
    }

    // Hotjar, classic tracking code (accounts made before the move to
    // Contentsquare).
    if (IDS.hotjar) {
      window.hj = window.hj || function () {
        (window.hj.q = window.hj.q || []).push(arguments);
      };
      window._hjSettings = { hjid: Number(IDS.hotjar), hjsv: 6 };
      load('https://static.hotjar.com/c/hotjar-' + window._hjSettings.hjid + '.js?sv=6');
    }

    // Contentsquare tag (what new Hotjar sign-ups get now). It starts
    // tracking as soon as it loads, so loading it only after Accept is
    // the consent; there is no separate opt-in call for the web tag.
    if (IDS.contentsquare) load('https://t.contentsquare.net/uxa/' + encodeURIComponent(IDS.contentsquare) + '.js');
  }

  // Withdrawn consent: the first-party cookies and storage the services
  // left on this domain go, on the host and on its parent domain.
  function erase() {
    if (window.clarity) clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
    var host = location.hostname;
    var domains = ['', host, '.' + host, '.' + host.split('.').slice(-2).join('.')];
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (!/^(_ga|_gid|_gat|_cl[a-z]|_hj|_cs_)/.test(name)) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
      });
    });
    try {
      [localStorage, sessionStorage].forEach(function (store) {
        Object.keys(store).forEach(function (k) { if (/^(_hj|_cs_)/.test(k)) store.removeItem(k); });
      });
    } catch (e) {}
  }

  /* ── The banner ───────────────────────────────────────────── */
  var banner;

  function build() {
    banner = document.createElement('section');
    banner.className = 'consent';
    banner.setAttribute('aria-labelledby', 'consent-title');
    banner.innerHTML =
      '<div class="consent__copy">' +
        '<p class="consent__title" id="consent-title">Analytics cookies</p>' +
        '<p class="consent__text">I’d like to use analytics tools to see which projects people read. Nothing is loaded or sent until you agree, and you can change your mind any time. <a href="privacy">Privacy</a></p>' +
      '</div>' +
      '<div class="consent__actions">' +
        '<button type="button" class="consent__btn consent__btn--tertiary" data-consent="denied">Decline</button>' +
        '<button type="button" class="consent__btn consent__btn--primary" data-consent="granted">Accept</button>' +
      '</div>';
    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-consent]');
      if (btn) choose(btn.getAttribute('data-consent'));
    });
    document.body.appendChild(banner);
  }

  function show() {
    if (!banner) build();
    banner.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { banner.classList.add('is-in'); });
    });
  }

  function hide() {
    if (!banner) return;
    banner.classList.remove('is-in');
    setTimeout(function () { if (!banner.classList.contains('is-in')) banner.hidden = true; }, 400);
  }

  function choose(v) {
    var before = readChoice();
    saveChoice(v);
    hide();
    if (v === 'granted') start();
    else if (before === 'granted' || started) { erase(); location.reload(); }
  }

  // On the home page the banner waits for the loader to lift.
  function afterLoader(fn) {
    var root = document.documentElement;
    if (!root.classList.contains('is-loading')) return fn();
    var watch = new MutationObserver(function () {
      if (root.classList.contains('is-loading')) return;
      watch.disconnect();
      setTimeout(fn, 600);
    });
    watch.observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-consent-open]')) { e.preventDefault(); show(); }
  });

  function ready() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-consent-open], [data-consent-ui]'), function (el) {
      el.hidden = false;
    });
    if (!readChoice()) afterLoader(show);
  }

  if (readChoice() === 'granted') start();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
