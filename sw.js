const CACHE_NAME = 'finpro-sync-cache-v40';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const CDN_ASSETS = [
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/exceljs/dist/exceljs.min.js',
  'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js',
  'https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js'
];

function isLiveApiRequest(url) {
  return /frankfurter|exchangerate|metals|gold|silver|coingecko|binance|api\./i.test(url);
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.log('Core cache hatası:', url, err))
        )
      );
      await Promise.allSettled(
        CDN_ASSETS.map((url) =>
          fetch(url, { mode: 'no-cors', cache: 'reload' })
            .then((res) => { if (res) return cache.put(url, res); })
            .catch((err) => console.log('CDN cache hatası:', url, err))
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  if (!request.url.startsWith('http')) return;

  // Canlı kur / altın / gümüş API istekleri için Network-First (offline'da önbellek fallback)
  if (isLiveApiRequest(request.url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Statik varlıklar ve CDN dosyaları için Cache-First + arka planda güncelleme
  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && (response.status === 200 || response.type === 'opaque')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        networkFetch.catch(() => {});
        return cached;
      }

      return networkFetch.then((response) => {
        if (response) return response;
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 504, statusText: 'Offline ve önbellekte yok' });
      });
    })
  );
});
