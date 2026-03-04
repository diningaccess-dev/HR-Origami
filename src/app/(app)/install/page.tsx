"use client";

import { useState } from "react";

const STEPS_ANDROID = [
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253"
        />
      </svg>
    ),
    title: "Mở app trên Chrome",
    desc: "Truy cập địa chỉ app bằng trình duyệt Chrome trên Android",
  },
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
        />
      </svg>
    ),
    title: "Nhấn menu ⋮ (3 chấm)",
    desc: "Góc trên bên phải màn hình Chrome",
  },
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
    title: '"Thêm vào màn hình chính"',
    desc: "Tìm và nhấn tuỳ chọn này trong menu",
  },
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 12.75l6 6 9-13.5"
        />
      </svg>
    ),
    title: 'Nhấn "Thêm" để xác nhận',
    desc: "App sẽ xuất hiện trên màn hình chính như ứng dụng thật",
  },
];

const STEPS_IOS = [
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253"
        />
      </svg>
    ),
    title: "Mở app trên Safari",
    desc: "Truy cập địa chỉ app bằng Safari — không dùng Chrome hay app khác",
  },
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      </svg>
    ),
    title: "Nhấn nút Share ↑",
    desc: "Nút hình ô vuông với mũi tên hướng lên, ở thanh công cụ giữa màn hình",
  },
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
    title: '"Thêm vào màn hình chính"',
    desc: "Cuộn xuống trong menu Share và nhấn tuỳ chọn này",
  },
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 12.75l6 6 9-13.5"
        />
      </svg>
    ),
    title: 'Nhấn "Thêm" góc trên phải',
    desc: "App sẽ xuất hiện trên màn hình chính như ứng dụng thật",
  },
];

export default function InstallPage() {
  const [tab, setTab] = useState<"android" | "ios">("android");

  const steps = tab === "android" ? STEPS_ANDROID : STEPS_IOS;

  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-6">
      {/* ── Header ──────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">Cài đặt ứng dụng</h1>
        <p className="text-sm text-muted-foreground">
          Thêm app vào màn hình chính để dùng như ứng dụng thật
        </p>
      </div>

      {/* ── App preview card ────────────────────── */}
      <div
        className="flex items-center gap-4 rounded-2xl p-4 text-white"
        style={{ backgroundColor: "var(--brand-color)" }}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold">
          E
        </div>
        <div>
          <p className="font-bold">Enso Group HR</p>
          <p className="text-sm text-white/70">Ứng dụng quản lý nhân sự</p>
        </div>
      </div>

      {/* ── OS Tabs ─────────────────────────────── */}
      <div className="flex rounded-xl bg-foreground/5 p-1 gap-1">
        <button
          onClick={() => setTab("android")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            tab === "android"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          {/* Android icon */}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.523 15.341a.625.625 0 11-1.25 0 .625.625 0 011.25 0zm-9.796 0a.625.625 0 11-1.25 0 .625.625 0 011.25 0zM3.14 8.267l1.902-3.295a.4.4 0 01.694.397L3.84 8.664A11.522 11.522 0 0012 6.545c3.09 0 5.9 1.213 7.984 3.19L18.6 7.083a.4.4 0 01.694-.397l1.901 3.295c2.393 2.485 3.805 5.787 3.805 9.219H-.666c0-3.432 1.413-6.734 3.806-9.219z" />
          </svg>
          Android
        </button>
        <button
          onClick={() => setTab("ios")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            tab === "ios"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          {/* Apple icon */}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          iOS Safari
        </button>
      </div>

      {/* ── Steps ───────────────────────────────── */}
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="flex gap-4 rounded-2xl border border-border bg-background p-4"
          >
            {/* step number + icon */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: "var(--brand-color)" }}
              >
                {step.icon}
              </div>
              {idx < steps.length - 1 && (
                <div className="w-px flex-1 bg-border" />
              )}
            </div>

            {/* content */}
            <div className="space-y-0.5 pb-2">
              <p className="text-sm font-semibold text-foreground">
                <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                {step.title}
              </p>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tip box ─────────────────────────────── */}
      <div className="rounded-2xl bg-foreground/5 px-4 py-3 flex gap-3 items-start">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <p className="text-xs text-muted-foreground">
          {tab === "ios"
            ? "iOS chỉ hỗ trợ cài PWA qua Safari. Nếu đang dùng Chrome hoặc app khác, hãy mở lại bằng Safari."
            : "Nếu Chrome không hiện tuỳ chọn, thử nhấn vào thanh địa chỉ rồi tìm biểu tượng cài đặt."}
        </p>
      </div>
    </div>
  );
}
