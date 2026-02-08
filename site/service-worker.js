var CACHE_NAME = "onanti-v3";
var ASSETS = [
  "/",
  "/index.html",
  "/app.js",
  "/style.css",
  "/tokens.css",
  "/kene-patterns.js",
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

  // For navigation requests, use network-first
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

  // For app assets (JS/CSS), use network-first with cache fallback
  if (event.request.url.endsWith("/app.js") || event.request.url.endsWith("/style.css") || event.request.url.endsWith("/tokens.css") || event.request.url.endsWith("/kene-patterns.js")) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        return caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, response.clone());
          return response;
        });
      }).catch(function () {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Everything else (icons, manifest, fonts): cache-first
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request);
    })
  );
});
