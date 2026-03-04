"use client";

// Đăng ký service worker + hủy các SW cũ để tránh hydration mismatch
import { useEffect } from "react";

// Phiên bản app — tăng lên mỗi khi cần invalidate cache
const APP_VERSION = "v5";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const run = async () => {
      // Bước 1: Hủy TOÀN BỘ SW cũ (kể cả SW đang HTML cache)
      const registrations = await navigator.serviceWorker.getRegistrations();
      const oldSWs = registrations.filter((r) => {
        // Chỉ giữ lại nếu SW đang active và là phiên bản mới
        const sw = r.active;
        return !(sw && sw.scriptURL.includes("/sw.js") &&
          sessionStorage.getItem("sw_version") === APP_VERSION);
      });

      if (oldSWs.length > 0) {
        await Promise.all(oldSWs.map((r) => r.unregister()));
        // Xóa toàn bộ cache cũ
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        // Đánh dấu version đã xử lý + reload trang để lấy HTML mới
        sessionStorage.setItem("sw_version", APP_VERSION);
        window.location.reload();
        return;
      }

      // Bước 2: Đăng ký SW mới
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none",
        });
        sessionStorage.setItem("sw_version", APP_VERSION);
        console.log("[SW] Đăng ký thành công, scope:", reg.scope);
        reg.update().catch(() => {});
      } catch (err) {
        console.warn("[SW] Đăng ký thất bại:", err);
      }
    };

    run();
  }, []);

  return null;
}
