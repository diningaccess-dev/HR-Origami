"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function PendingPage() {
  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* ── Icon ─────────────────────────────────────────── */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-foreground/5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground/40"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>

        {/* ── Text ─────────────────────────────────────────── */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Tài khoản đang chờ duyệt
          </h1>
          <p className="text-sm text-foreground/50">
            Quản lý sẽ duyệt tài khoản của bạn sớm
          </p>
        </div>

        {/* ── Sign out ──────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-lg border border-foreground/10 px-4 py-2.5 text-sm font-medium text-foreground/70 transition hover:bg-foreground/5"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
