const CACHE_NAME = "bimmercodes-v39-engineering-2026";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/all.html",
  "/parts.html",
  "/forum.html",
  "/vin.html",
  "/topic.html",
  "/css/tokens.css",
  "/css/style.css",
  "/css/parts-finder.css",
  "/css/vin-page.css",
  "/css/forum.css",
  "/css/ai-chat.css",
  "/js/script.js",
  "/js/translations.js",
  "/js/footer.js",
  "/js/forum.js",
  "/js/topic.js",
  "/js/live.js",
  "/data/codes.json",
  "/assets/icons/ico.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith("http")) return;

  // Navigation requests: Network-First with offline fallback
  if (event.request.mode === "navigate") {
    const path = url.pathname;
    const isAdminNav = path === "/admin" || path === "/admin/" || path === "/admin.html";
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request);
        } catch (_) {
          if (isAdminNav) {
            const adminPage = await caches.match("/admin.html");
            if (adminPage) return adminPage;
          }
          const cached = await caches.match(event.request);
          return cached || caches.match("/index.html");
        }
      })()
    );
    return;
  }

  // Static CSS/JS/JSON assets: Network-First with cache update & offline fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
