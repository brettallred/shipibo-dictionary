var CACHE_NAME = "onanti-v1";
var ASSETS = [
  "/",
  "/index.html",
  "/app.js",
  "/style.css",
  "/tokens.css",
  "/kene-patterns.js",
  "/data/entries.json",
  "/manifest.json",
  "/icon.png",
  "/icon.svg"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  // Don't cache API calls or OAuth callbacks
  if (event.request.url.includes("/api/") || event.request.url.includes("/auth/callback")) {
    return;
  }

  // For navigation requests (HTML pages), use network-first to pick up updates quickly
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then(function (response) {
        return caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, response.clone());
          return response;
        });
      }).catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match("/");
        });
      })
    );
    return;
  }

  // For app.js and style.css, use stale-while-revalidate to balance speed and freshness
  if (event.request.url.endsWith("/app.js") || event.request.url.endsWith("/style.css") || event.request.url.endsWith("/tokens.css") || event.request.url.endsWith("/kene-patterns.js")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(event.request).then(function (cached) {
          var fetchPromise = fetch(event.request).then(function (response) {
            cache.put(event.request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // Everything else: cache-first
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request);
    })
  );
});
