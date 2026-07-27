const CACHE_NAME = 'finpro-v8.2-offline-cache-v1';
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

// Kurulum Aşamasında Dosyaları İndir ve Cihaza Göm
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Offline dosyalar önbelleğe alınıyor...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Eski Cache'leri Temizle
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            );
        })
    );
});

// İnternet yokken (Fetch) Cihaz Hafızasından (Cache) Ver
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            // Cache'de varsa onu ver, yoksa internetten çek
            return response || fetch(event.request).catch(() => {
                console.log("İnternet bağlantısı koptu. Uygulama lokal bellekten çalışıyor.");
            });
        })
    );
});
