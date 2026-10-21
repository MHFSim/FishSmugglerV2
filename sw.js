// FishSmuggler Service Worker: lädt immer zuerst die neueste Version aus dem Netz,
// fällt ohne Internet auf die zuletzt gespeicherte Version zurück.
const CACHE = 'fishsmuggler-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req))
  );
});

// Hunger-Erinnerung (nur Browser mit "Periodic Background Sync", z. B. Chrome-App auf Android)
self.addEventListener('periodicsync', e => {
  if (e.tag !== 'hunger') return;
  e.waitUntil((async () => {
    try {
      const c = await caches.open('fs-meta'); const r = await c.match('/__hunger'); if (!r) return;
      const d = await r.json(); if (!d.next || Date.now() < d.next) return;
      await self.registration.showNotification('🐠 Dein Fisch hat Hunger!', { body: (d.name || 'Ein Fisch') + ' braucht bald Futter.', icon: 'icon-192.png', badge: 'icon-192.png', tag: 'hunger' });
      await c.put('/__hunger', new Response(JSON.stringify({ next: 0 })));
    } catch (err) {}
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
