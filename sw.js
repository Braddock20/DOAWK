/* Glass Journal — service worker (v1.1) */
const VERSION = 'gj-v1.1.0';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-mono.svg',
  './src/css/app.css',
  './src/js/util.js',
  './src/js/dom.js',
  './src/js/api.js',
  './src/js/store.js',
  './src/js/components/feed.js',
  './src/js/components/composer.js',
  './src/js/components/recorder.js',
  './src/js/components/thread.js',
  './src/js/components/search.js',
  './src/js/components/pins.js',
  './src/js/components/tags.js',
  './src/js/components/media.js',
  './src/js/components/settings.js',
  './src/js/app.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('onrender.com')) {
    event.respondWith(networkFirst(req));
  } else if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req));
  }
});
async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}
async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req);
  const network = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
  return cached || network;
}
