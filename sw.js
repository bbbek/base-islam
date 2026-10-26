// Base Islam service worker.
// App shell: network-first, so updates reach users; cached copy when offline.
// Quran text (api.alquran.cloud): cache-first, it never changes. Fonts and the Telegram SDK: cache-first.
// Cache names keep the old "ns-" prefix so text users already saved stays available.
const SHELL = 'ns-shell-v6', DATA = 'ns-data-v1', STATIC = 'ns-static-v1';
const FILES = ['./', 'index.html', 'styles.css', 'lib.js', 'names.js', 'app.js', 'config.js', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-180.png'];
const KEEP = [SHELL, DATA, STATIC];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('ns-') && !KEEP.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim())));

const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
async function cacheFirst(req, name) {
  const c = await caches.open(name), hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok || r.type === 'opaque') c.put(req, r.clone());
  return r;
}
async function networkFirst(req) {
  const c = await caches.open(SHELL);
  try {
    // no-cache: revalidate with the server (cheap 304) instead of trusting the HTTP cache, so a new version shows up at once.
    const r = await timeout(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }), 6000);
    if (r.ok) c.put(req, r.clone());
    return r;
  } catch (e) {
    const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' && await c.match('index.html'));
    if (hit) return hit;
    throw e;
  }
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.hostname === 'api.alquran.cloud') e.respondWith(cacheFirst(req, DATA));
  else if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com' || u.href.startsWith('https://telegram.org/js/')) e.respondWith(cacheFirst(req, STATIC));
  else if (u.origin === location.origin) e.respondWith(networkFirst(req));
});
