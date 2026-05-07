const CACHE_NAME = 'animeku-v104';
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

// FIX v104: Strategi cerdas — cache-first untuk aset statis, network-first untuk API
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // API dan Firebase: selalu network-first
    if (url.pathname.startsWith('/api/') || url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }
    
    // Aset statis (JS, CSS, gambar): cache-first untuk speed
    if (url.pathname.match(/\.(js|css|jpg|jpeg|png|webp|svg|ico|woff2?)(\?|$)/)) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                const networkFetch = fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    }
                    return response;
                }).catch(() => cached);
                return cached || networkFetch;
            })
        );
        return;
    }
    
    // HTML dan lainnya: network-first, fallback cache
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});