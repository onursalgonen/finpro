const CACHE_NAME = 'finpro-sync-cache-v2';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/exceljs/dist/exceljs.min.js',
  'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);
      await Promise.all(
        CDN_ASSETS.map((url) =>
          fetch(url, { mode: 'cors' })
            .then((res) => { if (res && res.ok) cache.put(url, res); })
            .catch(() => {})
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Önbellekte varsa hızlıca döndür
      if (cachedResponse) return cachedResponse;

      // Önbellekte yoksa ağa git, ama 3 saniye zaman aşımı (Timeout) koy
      const fetchRequest = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });

      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Ağ zaman aşımı (Kısıtlı Wi-Fi)')), 3000);
      });

      // Hangisi önce sonuçlanırsa (Yarış durumu)
      return Promise.race([fetchRequest, timeout]).catch(() => {
        console.log("Bağlantı kısıtlı, istek iptal edildi: ", event.request.url);
        // Beyaz ekranı önlemek için boş ama geçerli bir 408 yanıtı dönüyoruz
        return new Response('', { status: 408, statusText: 'Request Timeout' });
      });
    })
  );
});
