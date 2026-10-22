const CACHE_NAME = "cognac-badminton-v1";
const APP_SHELL = new URL("./", self.registration.scope);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch(new Request(APP_SHELL, { cache: "reload" }));
      if (!response.ok)
        throw new Error(`Impossible de charger l’application : ${response.status}`);

      const html = await response.clone().text();
      const assets = [
        ...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/gi),
      ]
        .map((match) => new URL(match[1], APP_SHELL))
        .filter((asset) => asset.origin === self.location.origin);
      const cache = await caches.open(CACHE_NAME);
      await cache.put(APP_SHELL, response);
      await cache.addAll([
        new URL("./manifest.webmanifest", self.registration.scope),
        new URL("./pwa-192.png", self.registration.scope),
        new URL("./pwa-512.png", self.registration.scope),
        ...assets,
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith("cognac-badminton-") &&
                cacheName !== CACHE_NAME,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);
  if (request.method !== "GET" || requestUrl.origin !== self.location.origin)
    return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) =>
              cache.put(request, copy),
            );
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(request)) ??
            (await cache.match(APP_SHELL)) ??
            Response.error()
          );
        }),
    );
    return;
  }

  if (!["script", "style", "image", "font", "worker"].includes(request.destination))
    return;

  event.respondWith(
    caches.match(request).then(
      (cachedResponse) =>
        cachedResponse ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) =>
              cache.put(request, copy),
            );
          }
          return response;
        }),
    ),
  );
});
