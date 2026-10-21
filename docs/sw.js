// Offline cache for the ptiLU PWA. VERSION changes with every build, which replaces the cache.
const VERSION = "dba8f75f22";
const CACHE = "ptilu-" + VERSION;
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable.png", "apple-touch-icon.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => (k.startsWith("ptilu-") || k.startsWith("minios-")) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Google Fonts: serve from cache, refresh in the background
  if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    event.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // Pages and the manifest: network first (always the latest when online), saved copy when offline.
  // "no-cache" revalidates with the server, so an unchanged page costs a tiny 304 response.
  const isPage = req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith(".webmanifest");
  if (isPage) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const fresh = await fetch(req, { cache: "no-cache", signal: ctrl.signal });
        clearTimeout(timer);
        if (fresh.ok) cache.put(req.mode === "navigate" ? "index.html" : req, fresh.clone());
        return fresh;
      } catch (e) {
        return (await cache.match(req, { ignoreSearch: true })) || (await cache.match("index.html"));
      }
    })());
    return;
  }
  // Icons and other files: saved copy first, network as fallback
  event.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)));
});
