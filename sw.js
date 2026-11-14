/* Tokyo Haritası service worker: the app works offline after the first visit.
   App shell: stale-while-revalidate (new versions arrive on the next launch). Map tiles + fonts: cache-first. */
const APP = 'tokyo-app-e256723958', TILES = 'tokyo-tiles-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tokyo-app-') && k !== APP).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url); if (u.origin !== location.origin) return;          // GitHub API, Google links etc. go straight to the network
  const scope = new URL(self.registration.scope).pathname;
  const path = u.pathname.startsWith(scope) ? u.pathname.slice(scope.length) : u.pathname;
  if (req.mode === 'navigate' || path === '' || path === 'index.html') {
    e.respondWith(caches.open(APP).then(async c => {
      const hit = await c.match('index.html');
      const net = fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })).then(r => { if (r.ok) c.put('index.html', r.clone()); return r; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || new Response('Çevrimdışı', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }));
    return;
  }
  const data = /^(tiles|fonts)\//.test(path);
  e.respondWith(caches.open(data ? TILES : APP).then(async c => {
    const hit = await c.match(path, { ignoreSearch: true }) || await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const r = await fetch(req); if (r.ok && data) c.put(path, r.clone()); return r;
  }));
});
