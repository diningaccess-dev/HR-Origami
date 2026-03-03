"use client";

import { useState } from "react";

type PushStatus =
  | "idle"
  | "requesting"
  | "subscribed"
  | "denied"
  | "unsupported";

type UsePushReturn = {
  status: PushStatus;
  subscribe: () => Promise<void>;
};

/**
 * Hook để xin quyền + subscribe Web Push.
 * Gọi subscribe() khi muốn bật thông báo cho user.
 */
export function usePushNotification(profileId: string | null): UsePushReturn {
  // Khởi tạo status ngay khi mount, dựa vào Notification.permission hiện tại
  const [status, setStatus] = useState<PushStatus>(() => {
    if (typeof window === "undefined") return "idle";
    if (!("serviceWorker" in navigator) || !("PushManager" in window))
      return "unsupported";
    const perm = Notification.permission;
    if (perm === "denied") return "denied";
    if (perm === "granted") return "subscribed";
    return "idle";
  });

  // ── Xin quyền + subscribe ─────────────────────────────────
  async function subscribe(): Promise<void> {
    if (!profileId) return;

    // Không hỗ trợ
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setStatus("unsupported");
      return;
    }

    setStatus("requesting");

    try {
      // Xin quyền notification
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        console.log("[usePushNotification] User từ chối quyền notification");
        setStatus("denied");
        return;
      }

      // Lấy service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ) as BufferSource,
      });

      // Gửi subscription lên API để lưu DB
      const subJSON = subscription.toJSON();
      const res = await fetch("/api/push?action=subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: profileId,
          subscription: subJSON,
          user_agent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("[usePushNotification] Lỗi lưu subscription:", err);
        setStatus("idle");
        return;
      }

      setStatus("subscribed");
      console.log("[usePushNotification] ✅ Đã subscribe push notifications");
    } catch (err) {
      // User từ chối hoặc lỗi khác — không crash
      console.error("[usePushNotification] Lỗi:", err);
      const perm = Notification.permission;
      setStatus(perm === "denied" ? "denied" : "idle");
    }
  }

  return { status, subscribe };
}

// ── Helper: chuyển base64 VAPID key sang Uint8Array ──────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}
