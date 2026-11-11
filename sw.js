const CACHE = 'attend-v6';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// اول شبکه (آخرین نسخه). اگر آفلاین بود یا سرور خطا داد (404، 500، قطعی هاست)، از نسخه ذخیره‌شده باز می‌شود.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const fallback = res => caches.match(e.request).then(h =>
    h || (e.request.mode === 'navigate' ? caches.match('./index.html') : null) || res || Response.error());
  e.respondWith(
    fetch(e.request, { cache: 'no-store' }).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }
      return fallback(res);
    }).catch(() => fallback(null))
  );
});
