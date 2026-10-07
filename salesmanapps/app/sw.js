/* Service worker for the Salesman app.
 *
 * The rule that matters: nothing from the database is ever cached. A salesman
 * standing in a shop must not be shown last week's outstanding balance because
 * his signal dropped — a stale figure is worse than no figure, because he will
 * act on it. Supabase traffic is network-only and fails loudly.
 *
 * What is cached is the shell: the page, its icons, its manifest. That is what
 * makes the app open instantly from the home screen and show something useful
 * when there is no signal, rather than the browser's dinosaur.
 */
const VERSION = 'v1';
const SHELL = 'shell-' + VERSION;

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL)
      /* One bad URL must not fail the whole install, or the app never gets a
         shell at all and offline opening stays broken forever. */
      .then((c) => Promise.allSettled(SHELL_FILES.map((f) => c.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Live data, auth and uploads: straight to the network, never stored.
     Signed storage URLs expire, so caching those would serve dead links. */
  if (url.hostname.endsWith('.supabase.co')) return;

  /* The page itself: try the network so a deploy is picked up, fall back to
     the cached shell when there is no signal. */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  /* Same-origin assets: serve from cache first, and refresh in the background
     so the next open is current without ever blocking this one. */
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const live = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(SHELL).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => hit);
        return hit || live;
      })
    );
  }

  /* Anything else — a CDN library, a font — is left to the browser. */
});
