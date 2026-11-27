// Mise en cache réseau d'abord avec repli hors ligne pour les pages déjà visitées.
const CACHE = 'capmuscu-v2';
const OFFLINE_FALLBACK = '/seance/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(['/', '/seance/', '/historique/']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Réseau d'abord (contenu à jour), cache en secours.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/') ||
      url.pathname === '/api/admin' || url.pathname.startsWith('/api/admin/')) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(req);
      if (response.ok) {
        event.waitUntil(caches.open(CACHE)
          .then((cache) => cache.put(req, response.clone()))
          .catch((error) => console.error('CapMuscu: cache update failed.', error)));
      }
      return response;
    } catch {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const fallback = await caches.match(OFFLINE_FALLBACK);
        if (fallback) return fallback;
      }
      return new Response('Hors ligne : cette ressource n’a pas encore été mise en cache.', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  })());
});
