"use client";

// Hủy toàn bộ Service Worker để tránh cache cũ gây hydration lỗi
// Push notifications sẽ được thêm lại sau khi SW ổn định
import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Xóa toàn bộ cache (Cache API)
    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((k) => caches.delete(k));
      });
    }

    // Hủy đăng ký TẤT CẢ service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister());
      });
    }
  }, []);

  return null;
}
