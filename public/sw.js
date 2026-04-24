const CACHE_NAME = 'risyadhanime-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Fetch Strategy: Network First (Agar data API selalu update), fallback ke Cache jika offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Jika request sukses, clone responnya ke cache (opsional untuk aset statis)
                // Tapi untuk RiyadhAnime kita biarkan browser handle cache standar
                return response;
            })
            .catch(() => {
                // Jika offline, coba ambil dari cache
                return caches.match(event.request);
            })
    );
});