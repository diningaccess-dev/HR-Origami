// public/sw.js — Service Worker cơ bản cho PWA
// Cache-first cho static assets, network-first cho API

const CACHE_NAME = "enso-hr-v1";
const STATIC_ASSETS = ["/", "/home", "/manifest.json"];

// Install — cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

// Activate — xóa cache cũ
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// Fetch — network-first, fallback cache
self.addEventListener("fetch", (event) => {
  // Bỏ qua các request không phải GET
  if (event.request.method !== "GET") return;

  // Bỏ qua API calls + Supabase
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api") || url.hostname.includes("supabase")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Lưu vào cache nếu thành công
        if (response.ok) {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Mất mạng → đọc từ cache
        return caches.match(event.request);
      }),
  );
});

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || "Enso HR";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [100, 50, 100],
    data: data.url ? { url: data.url } : undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — mở app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Nếu app đã mở → focus
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Chưa mở → mở mới
      return self.clients.openWindow(url);
    }),
  );
});
