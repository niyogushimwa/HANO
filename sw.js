/* HANO service worker - offline app shell.
   API calls are deliberately NOT cached: reports must stay current. */
const CACHE = 'hano-shell-v3-clean';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/styles.css',
  './assets/js/app.js',
  './assets/js/i18n.js',
  './assets/js/demo.js',
  './assets/img/logo.svg',
  './assets/img/logo.png',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.pathname.includes('/api/') || url.pathname.includes('/uploads/')) return;
  if (url.origin !== self.location.origin) return;

  // Network first so code updates are picked up; cached shell is the offline fallback.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
