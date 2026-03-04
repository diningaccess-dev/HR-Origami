// public/sw.js — Service Worker cho PWA
// Cache-first: /_next/static/ + icons. Network-only: HTML, manifest, API

const CACHE_NAME = "enso-hr-v3";
const PRECACHE = ["/icons/icon-192.png", "/icons/icon-512.png"];

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate — xoa tat ca cache cu
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Bo qua API + Supabase
  if (url.pathname.startsWith("/api") || url.hostname.includes("supabase")) {
    return;
  }

  // /_next/static/ — content-addressed, cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((res) => {
            if (res.ok) {
              caches
                .open(CACHE_NAME)
                .then((c) => c.put(event.request, res.clone()));
            }
            return res;
          })
      )
    );
    return;
  }

  // Icons — cache-first
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/_next/image/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((res) => {
            if (res.ok) {
              caches
                .open(CACHE_NAME)
                .then((c) => c.put(event.request, res.clone()));
            }
            return res;
          })
      )
    );
    return;
  }

  // HTML pages + manifest.json: LUON lay tu network, fallback cache chi khi offline
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push notification
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "Enso HR", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [100, 50, 100],
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});