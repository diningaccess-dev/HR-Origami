"use client";

// Đăng ký service worker khi client load
import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[SW] Đăng ký thành công, scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[SW] Đăng ký thất bại:", err);
        });
    }
  }, []);

  return null;
}
