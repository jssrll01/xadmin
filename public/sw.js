const CACHE = 'xadmin-v4';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});

const routeFor = (t) => {
  t = String(t || '').toLowerCase();
  if (t.includes('creator withdrawal')) return '/creator-mgmt';
  if (t.includes('creator application')) return '/creators';
  if (t.includes('content to review')) return '/creator-mgmt';
  if (t.includes('top-up')) return '/topups';
  if (t.includes('withdrawal')) return '/payouts';
  if (t.includes('order')) return '/orders';
  if (t.includes('return')) return '/returns';
  if (t.includes('load')) return '/buy-load';
  if (t.includes('support ticket')) return '/reports';
  return '/';
};

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) {
    try { d = { body: event.data.text() }; } catch (e2) { d = {}; }
  }
  const url = d.url || (d.data && d.data.url) || routeFor(d.title);
  event.waitUntil(self.registration.showNotification(d.title || 'Xadmin', {
    body: d.body || '',
    tag: d.tag || undefined,
    data: { url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || routeFor(event.notification.title);
  const url = new URL(path, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    const c = cs[0];
    if (c) return c.navigate(url).then((x) => (x || c).focus()).catch(() => c.focus());
    return self.clients.openWindow(url);
  }));
});
