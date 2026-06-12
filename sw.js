// iHotel Conference Center — Service Worker v4
const CACHE = 'ihotel-v4';

// Only cache static assets — never cache index.html itself
// so the app always loads the latest version
const STATIC = [
  '/iHotel-messaging/icon-192.png',
  '/iHotel-messaging/icon-512.png',
  '/iHotel-messaging/icon-orange-192.png',
  '/iHotel-messaging/icon-orange-512.png',
  '/iHotel-messaging/manifest.json',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Ovo&display=swap',
  'https://raw.githubusercontent.com/avtechsatthei-blip/iHotel-messaging/80922d6d8b278759b9a9bbe2b799bec443976fd7/Ihotel%20Logo%20White.png',
  'https://raw.githubusercontent.com/avtechsatthei-blip/iHotel-messaging/80922d6d8b278759b9a9bbe2b799bec443976fd7/Ihotel%20Logo%20Grey.png',
];

self.addEventListener('install', e => {
  self.skipWaiting(); // activate immediately
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC)).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // NEVER cache or intercept:
  // - The HTML page itself (always fetch fresh)
  // - Firebase requests (real-time data)
  // - Firebase SDK
  if (url.includes('index.html') ||
      url.endsWith('/') ||
      url.includes('firebaseio.com') ||
      url.includes('firebase') ||
      url.includes('gstatic.com/firebasejs')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // For static assets: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (e.request.method === 'GET' && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});

// Push notifications (iOS 16.4+ PWA only)
self.addEventListener('push', e => {
  if (!e.data) return;
  const d = e.data.json();
  e.waitUntil(
    self.registration.showNotification(d.title || 'iHotel', {
      body: d.body || 'New message received',
      icon: '/iHotel-messaging/icon-192.png',
      tag: 'ihotel-msg',
      renotify: true
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/iHotel-messaging/'));
});
