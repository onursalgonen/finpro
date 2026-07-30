const CACHE_NAME = 'finpro-sync-cache-v2'; // v1 -> v2: offline güvenilirliği artırıldı

// Uygulamanın kendi dosyaları
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// CDN kütüphaneleri - ilk kurulumda indirilip önbelleğe alınır
const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/exceljs/dist/exceljs.min.js',
  'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js'
];

// Kurulum: tüm dosyaları indirmeye çalış, biri başarısız olsa bile diğerleri
// önbelleğe alınsın diye Promise.allSettled kullanıyoruz (eski kodda tek bir
// CDN indirmesi başarısız olursa sessizce yutuluyordu ama biz burada ayrıca
// core dosyaların da tek tek garantiye alınmasını sağlıyoruz).
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
          // no-cors: bazı CDN'ler CORS header'ı göndermese bile dosya
          // (opak response olarak) önbelleğe alınabilsin ve script/link
          // etiketleri offline'da da çalışabilsin.
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

// Kullanıcı isterse (örn. ayarlar ekranından) mesaj göndererek
// güncellemeyi hemen etkinleştirebilir.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const request = event.request;

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => {
      // Arka planda ağdan tazele (varsa), ama asıl cevabı önbellekten hemen ver.
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
        // Cache-first: internet olmasa da anında önbellekten döner.
        networkFetch.catch(() => {});
        return cached;
      }

      // Önbellekte yoksa ağı dene; o da başarısız olursa (offline ise)
      // sayfa isteği için ana sayfayı, diğerleri için boş/başarısız cevap yerine
      // anlamlı bir fallback döndür.
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
