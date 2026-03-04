// public/sw.js v6 — Self-destruct
// Tu huy dang ky + xoa toan bo cache ngay khi activate
// Khong cache bat ky request nao

// Install: skip waiting de kich hoat ngay
self.addEventListener("install", () => self.skipWaiting());

// Activate: xoa cache + claim + tu huy dang ky
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
      await self.registration.unregister();
    })()
  );
});
