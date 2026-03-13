// sw.js
const CACHE_NAME = 'walkie-talkie-v1';
// Lista de todos os arquivos visuais e lógicos do nosso rádio
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json'
];

// Passo 1: Instalação. O navegador baixa os arquivos e guarda na memória do celular
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 Arquivos guardados no cache!');
            return cache.addAll(FILES_TO_CACHE);
        })
    );
});

// Passo 2: Interceptação. Toda vez que o app pedir um arquivo, ele verifica o cache primeiro
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Se encontrou no cache, entrega rapidinho. Se não, busca na internet.
            return response || fetch(event.request);
        })
    );
});