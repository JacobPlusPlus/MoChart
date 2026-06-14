const CACHE_NAME = 'mochart-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/css/styles.css',
  '/assets/js/main.js',
  '/assets/js/ui.js',
  '/assets/js/store.js',
  '/assets/js/api.js',
  '/assets/js/charts.js',
  '/assets/js/utils.js',
  '/manifest.json',
  '/assets/icons/icon.png'
];

// Instalacja Service Workera i dodawanie plików do pamięci podręcznej (Cache)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Zwracanie plików z Cache, jeśli są dostępne
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Jeśli plik jest w cache, zwróć go. W przeciwnym wypadku pobierz z sieci.
        return response || fetch(event.request);
      })
  );
});

// Aktualizacja Cache'u gdy zmieni się wersja aplikacji
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});