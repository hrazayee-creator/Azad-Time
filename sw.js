const CACHE = 'attend-v7';
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

// شروع فوری از حافظه گوشی + دریافت نسخه جدید در پس‌زمینه.
// اگر سرور خطا بدهد یا اینترنت قطع باشد، برنامه با نسخه ذخیره‌شده کار می‌کند.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isDoc = e.request.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(e.request);
    const net = fetch(e.request, { cache: 'no-store' }).then(async res => {
      if (res && (res.ok || res.type === 'opaque')) {
        try {
          if (hit && res.ok && isDoc) {
            const [a, b] = await Promise.all([hit.clone().text(), res.clone().text()]);
            if (a !== b) {
              const cs = await self.clients.matchAll();
              cs.forEach(c => c.postMessage({ type: 'updated' }));
            }
          }
        } catch (_) {}
        await cache.put(e.request, res.clone());
      }
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res && res.ok) return res;
    return (isDoc ? await cache.match('./index.html') : null) || res || Response.error();
  })());
});
