// iHotel Conference Center — Service Worker
// Caches the app shell for offline/fast load on iPadOS 15+

const CACHE = 'ihotel-v3';
const BASE = '/iHotel-messaging';
const SHELL = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/icon-192.png',
  BASE + '/icon-512.png',
  BASE + '/icon-orange-192.png',
  BASE + '/icon-orange-512.png',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Ovo&display=swap',
  'https://raw.githubusercontent.com/avtechsatthei-blip/iHotel-messaging/80922d6d8b278759b9a9bbe2b799bec443976fd7/Ihotel%20Logo%20White.png',
  'https://raw.githubusercontent.com/avtechsatthei-blip/iHotel-messaging/80922d6d8b278759b9a9bbe2b799bec443976fd7/Ihotel%20Logo%20Grey.png',
];

// Install — cache shell assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', e => {
  // Don't intercept Firebase requests — always go to network
  if (e.request.url.includes('firebaseio.com') ||
      e.request.url.includes('firebase') ||
      e.request.url.includes('gstatic.com/firebasejs')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      // Cache successful GET responses for shell assets
      if (e.request.method === 'GET' && resp.status === 200) {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }))
  );
});

// Push notifications (iOS 16.4+ only — graceful no-op on 15)
self.addEventListener('push', e => {
  if (!e.data) return;
  const d = e.data.json();
  e.waitUntil(
    self.registration.showNotification(d.title || 'iHotel', {
      body:      d.body  || 'New message received',
      icon:      '/icon-192.png',
      badge:     '/icon-192.png',
      tag:       'ihotel-msg',
      renotify:  true
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
