// public/sw.js v4 — Minimal Service Worker
// Chi cache push notifications, KHONG cache bat ky request nao
// Tranh hydration mismatch va clone errors hoan toan

const CACHE_NAME = "enso-hr-v4";

// Install — xoa cache cu, khong pre-cache gi ca
self.addEventListener("install", () => self.skipWaiting());

// Activate — xoa TAT CA cache cu
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — KHONG intercept, de browser xu ly binh thuong
// (Khong respondWith = network passthrough)

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