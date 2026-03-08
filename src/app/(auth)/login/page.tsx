"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState, type FormEvent } from "react";
import Link from "next/link";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }

  // ── Google OAuth ────────────────────────────────────────────
  async function handleGoogleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      showToast("Không thể kết nối. Thử lại sau");
      setLoading(false);
    }
    // Nếu thành công, browser sẽ redirect đi → không cần setLoading(false)
  }

  // ── Email + Password ───────────────────────────────────────
  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        showToast("Vui lòng xác nhận email");
      } else if (
        error.message.includes("Invalid login credentials") ||
        error.message.includes("Invalid email or password")
      ) {
        showToast("Email hoặc mật khẩu không đúng");
      } else {
        showToast("Không thể kết nối. Thử lại sau");
      }
      setLoading(false);
      return;
    }

    // Login thành công → middleware sẽ redirect đúng trang
    window.location.href = "/";
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* ── Logo / App name ──────────────────────────────── */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Enso
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Đăng nhập để tiếp tục
          </p>
        </div>

        {/* ── Toast ────────────────────────────────────────── */}
        {toast && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {toast}
          </div>
        )}

        {/* ── Google ───────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-foreground/10 bg-foreground/3 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-foreground/7 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Đăng nhập bằng Google
        </button>

        {/* ── Divider ──────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-foreground/10" />
          <span className="text-xs text-foreground/40">hoặc</span>
          <div className="h-px flex-1 bg-foreground/10" />
        </div>

        {/* ── Email + Password form ────────────────────────── */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-foreground/80"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-foreground/10 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-foreground/80"
            >
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-foreground/10 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="relative w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Đang xử lý...
              </span>
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>

        {/* ── Divider ──────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-foreground/10" />
          <span className="text-xs text-foreground/40">chưa có tài khoản?</span>
          <div className="h-px flex-1 bg-foreground/10" />
        </div>

        {/* ── Link đăng ký ─────────────────────────────────── */}
        <Link
          href="/register"
          className="block w-full rounded-lg border border-foreground/10 bg-foreground/3 px-4 py-2.5 text-center text-sm font-medium text-foreground transition hover:bg-foreground/7"
        >
          Tạo tài khoản nhân viên mới
        </Link>
      </div>
    </div>
  );
}
