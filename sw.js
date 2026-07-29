const CACHE_NAME = 'finpro-orijinal-cache-v1';

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // API İstekleri için 3 Saniye Kuralı (Beyaz Ekran Koruması)
    if (url.hostname === 'api.coingecko.com') {
        event.respondWith(
            new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), 3000);
                fetch(event.request).then(response => {
                    clearTimeout(timeout);
                    resolve(response);
                }).catch(err => {
                    clearTimeout(timeout);
                    reject(err);
                });
            }).catch(() => new Response('', { status: 408, statusText: 'Request Timeout' }))
        );
        return;
    }

    // Diğer her şey için (CDN'ler, Fontlar, HTML): Önce Cache, Yoksa İnternet
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse; // Cihaz hafızasından ver
            }
            return fetch(event.request).then(networkResponse => {
                // İnternetten çekileni bir dahaki sefere offline çalışsın diye hafızaya kaydet
                return caches.open(CACHE_NAME).then(cache => {
                    if (event.request.method === 'GET') {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            }).catch(() => {
                return new Response('Offline', { status: 503, statusText: 'Offline' });
            });
        })
    );
});
