const CACHE_NAME = "tyr-gallery-v1";
const FALLBACK_PAGE = "/gallery.html";
const CORE_ASSETS = [
  "/",
  "/gallery.html",
  "/favorites.html",
  "/gallery.js",
  "/pwa-register.js",
  "/manifest.webmanifest",
  "/logo.png",
  "/app-icon-192.png",
  "/app-icon-512.png",
  "/lib/fancybox.css",
  "/lib/fancybox.umd.js",
  "/lib/imagesloaded.pkgd.min.js",
  "/lib/lozad.min.js",
  "/lib/masonry.pkgd.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(CORE_ASSETS.map((asset) => cache.add(asset)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") {
    return;
  }

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin/") || url.pathname.startsWith("/image/")) {
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(FALLBACK_PAGE))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
