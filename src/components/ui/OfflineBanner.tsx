"use client";

// components/ui/OfflineBanner.tsx
// Banner hiển thị khi mất mạng — tự ẩn khi có mạng lại

import { useEffect, useState } from "react";

export default function OfflineBanner() {
  // Khởi tạo lazy để tránh setState trong effect
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );

  useEffect(() => {
    function handleOffline() {
      setIsOffline(true);
    }

    function handleOnline() {
      setIsOffline(false);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-100 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-md"
      role="alert"
    >
      {/* Icon wifi off */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="2" y1="2" x2="22" y2="22" />
        <path d="M8.5 16.5a5 5 0 0 1 7 0" />
        <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
        <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
        <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
        <path d="M5 12.03a15 15 0 0 1 5.26-2.54" />
        <circle cx="12" cy="20" r="1" />
      </svg>
      Đang xem dữ liệu offline — Kết nối lại để cập nhật
    </div>
  );
}
