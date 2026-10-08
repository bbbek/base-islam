// App shell: network-first (updates reach users), cache fallback offline. Quran API: stale-while-revalidate, so read surahs work offline.
const SHELL = 'ns-shell-v2', DATA = 'ns-data-v1';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'config.js', 'manifest.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('ns-shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.hostname === 'api.alquran.cloud') {
    e.respondWith(caches.open(DATA).then(async c => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  } else if (u.origin === location.origin) {
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(SHELL).then(x => x.put(e.request, c)); } return r; })
      .catch(() => caches.match(e.request)));
  }
});
