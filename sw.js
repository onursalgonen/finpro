const CACHE_NAME = 'finpro-v8.2-full-cache-v4';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './libs/tailwindcss.js',
    './libs/chart.min.js',
    './libs/exceljs.min.js',
    './libs/peerjs.min.js',
    './libs/material-icons.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
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
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;

            const fetchRequest = fetch(event.request);
            const timeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Ağ zaman aşımı')), 3000);
            });

            return Promise.race([fetchRequest, timeout]).catch(() => {
                console.log("Kısıtlı Wi-Fi algılandı, lokal veri devrede: ", event.request.url);
                return new Response('', { status: 408, statusText: 'Request Timeout' });
            });
        })
    );
});
