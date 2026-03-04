"use client";

// Đăng ký service worker + xóa cache cũ để tránh hydration mismatch
import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Bước 1: Xóa TẤT CẢ cache cũ ngay lập tức
    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((k) => caches.delete(k));
      });
    }

    // Bước 2: Đăng ký SW mới + force update
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          console.log("[SW] Đăng ký thành công, scope:", reg.scope);
          // Force check update mỗi lần load
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn("[SW] Đăng ký thất bại:", err);
        });
    }
  }, []);

  return null;
}
