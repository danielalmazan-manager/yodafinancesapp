const CACHE_NAME = 'yoda-v1';
const urlsToCache = [
    '/',
    '/app.php',
    '/css/style.css',
    '/css/app.css',
    '/js/app/core.js',
    '/js/app/dashboard.js',
    '/js/app/income.js',
    '/js/app/expenses.js',
    '/js/app/debt.js',
    '/js/app/goals.js',
    '/js/app/auth.js',
    '/js/app/offline.js',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName !== CACHE_NAME;
                }).map(cacheName => {
                    return caches.delete(cacheName);
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Network first strategy for API calls
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Clone the response before caching
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(event.request, responseToCache));
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(event.request)
                        .then(response => {
                            if (response) {
                                return response;
                            }
                            // Return offline response for API calls
                            return new Response(
                                JSON.stringify({ success: false, message: 'Sin conexión', offline: true }),
                                { headers: { 'Content-Type': 'application/json' } }
                            );
                        });
                })
        );
    } else {
        // Cache first strategy for static assets
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request)
                        .then(response => {
                            // Don't cache non-successful responses
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, responseToCache));
                            return response;
                        });
                })
                .catch(() => {
                    // Return offline page if available
                    return new Response('Sin conexión a Internet', { status: 503 });
                })
        );
    }
});

// Handle messages from the client
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
