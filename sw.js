const CACHE_NAME = 'finpro-v8.2-cache';
const URLS_TO_CACHE = [
  './',
  './index.html', // Ana HTML dosyanızın adı index.html ise
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/exceljs/dist/exceljs.min.js',
  'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js'
];

// Kurulum (Install) Aşaması: Belirtilen dosyaları önbelleğe al
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Dosyalar önbelleğe alınıyor...');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// Etkinleştirme (Activate) Aşaması: Eski önbellekleri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eski önbellek siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Getirme (Fetch) Aşaması: İnternet yoksa önbellekten yükle
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Önbellekte varsa onu döndür, yoksa internetten çek
        return response || fetch(event.request).catch(() => {
          // Çevrimdışıysak ve sayfa isteniyorsa ana sayfayı döndür
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
