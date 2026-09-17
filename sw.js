const CACHE = "horoub-v10";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./style.css",
  "./game.js",
  "./sisi.png",
  "./char-fady.png",
  "./char-wageeh.png",
  "./char-koko.png",
  "./char-tony.png",
  "./appear-long.mp3",
  "./appear-front.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(CORE.map((url) => cache.add(url).catch(function () {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const res = await fetch(event.request);
      if (res && res.ok && new URL(event.request.url).origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      }
      return res;
    } catch (err) {
      if (event.request.mode === "navigate") {
        const fallback = await caches.match("./index.html");
        if (fallback) return fallback;
      }
      return Response.error();
    }
  })());
});
