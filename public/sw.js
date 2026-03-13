// public/sw.js
const CACHE_NAME = 'walkie-talkie-v2';

// Lista de todos os arquivos que o celular deve baixar e guardar
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/sound_1.mp3', // <-- Nosso arquivo de áudio agora é guardado offline!
    '/icon-192.png',
    '/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 Arquivos guardados no cache!');
            return cache.addAll(FILES_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
