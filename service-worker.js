const CACHE_NAME = 'pwa-login-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
    // Agrega aquí todos los demás archivos que quieras cachear
];

// Evento de instalación: Cachea los recursos esenciales
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caché abierto');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Activa el nuevo service worker inmediatamente
    );
});

// Evento de activación: Limpia los cachés antiguos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Eliminando caché antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Toma control de los clientes existentes inmediatamente
    );
});

// Evento fetch: Primero la red, luego el caché como respaldo
self.addEventListener('fetch', event => {
    // Para solicitudes de navegación, intenta la red primero, luego el caché
    if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Si la red tiene éxito, cachea la respuesta
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Si la red falla, intenta obtener del caché
                    return caches.match(event.request);
                })
        );
    } else {
        // Para otros recursos (CSS, JS, imágenes), usa la estrategia de caché primero
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    return response || fetch(event.request).then(fetchResponse => {
                        return caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, fetchResponse.clone());
                            return fetchResponse;
                        });
                    });
                })
                .catch(() => {
                    // Fallback para cuando tanto el caché como la red fallan
                    // Aquí podrías devolver una página offline
                    return new Response('Estás offline y este contenido no está cacheado.');
                })
        );
    }
});
