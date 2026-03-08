"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState, type FormEvent } from "react";
import Link from "next/link";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const LOCATIONS = [
  { value: "enso", label: "🍃 Enso" },
  { value: "origami", label: "🦢 Origami" },
  { value: "okyu", label: "🔴 Okyu" },
] as const;

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [locationId, setLocationId] = useState("enso");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"error" | "success">("error");
  const [done, setDone] = useState(false);

  function showToast(message: string, type: "error" | "success" = "error") {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 5000);
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email || !password) return;

    if (password.length < 6) {
      showToast("Mật khẩu tối thiểu 6 ký tự");
      return;
    }

    setLoading(true);

    // 1. Tạo auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        showToast("Email đã được sử dụng");
      } else {
        showToast("Không thể tạo tài khoản. Thử lại sau.");
        console.error(signUpError);
      }
      setLoading(false);
      return;
    }

    // 2. Cập nhật profile với location_id và phone (trigger đã tạo profile)
    if (data.user) {
      // Đợi trigger tạo profile xong
      await new Promise((r) => setTimeout(r, 500));

      const updates: Record<string, string> = {
        full_name: fullName.trim(),
        location_id: locationId,
      };
      if (phone.trim()) {
        updates.phone = phone.trim();
      }

      await supabase.from("profiles").update(updates).eq("id", data.user.id);
    }

    setLoading(false);
    setDone(true);
    showToast("Tạo tài khoản thành công! Chờ quản lý duyệt.", "success");
  }

  // ── Màn hình thành công ─────────────────────────────────────
  if (done) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
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
                className="text-emerald-500"
                aria-hidden="true"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">
              Đăng ký thành công!
            </h1>
            <p className="text-sm text-foreground/50">
              Tài khoản đang chờ quản lý duyệt.
              <br />
              Bạn sẽ được thông báo khi được duyệt.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-block w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-all duration-100 hover:bg-foreground/90 active:scale-[0.97]"
          >
            Về trang đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  // ── Form đăng ký ────────────────────────────────────────────
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* ── Logo / App name ──────────────────────────────── */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Enso
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Tạo tài khoản nhân viên mới
          </p>
        </div>

        {/* ── Toast ────────────────────────────────────────── */}
        {toast && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
              toastType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {toast}
          </div>
        )}

        {/* ── Form ─────────────────────────────────────────── */}
        <form onSubmit={handleRegister} className="space-y-4">
          {/* Họ tên */}
          <div>
            <label
              htmlFor="fullName"
              className="mb-1.5 block text-sm font-medium text-foreground/80"
            >
              Họ và tên <span className="text-red-400">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full rounded-lg border border-foreground/10 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          {/* Quán hiện tại */}
          <div>
            <label
              htmlFor="location"
              className="mb-1.5 block text-sm font-medium text-foreground/80"
            >
              Quán hiện tại <span className="text-red-400">*</span>
            </label>
            <select
              id="location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full rounded-lg border border-foreground/10 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-foreground/80"
            >
              Email <span className="text-red-400">*</span>
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

          {/* Mật khẩu */}
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-foreground/80"
            >
              Mật khẩu <span className="text-red-400">*</span>
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full rounded-lg border border-foreground/10 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          {/* Số điện thoại */}
          <div>
            <label
              htmlFor="phone"
              className="mb-1.5 block text-sm font-medium text-foreground/80"
            >
              Số điện thoại{" "}
              <span className="text-foreground/30">(không bắt buộc)</span>
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0172 xxx xxxx"
              className="w-full rounded-lg border border-foreground/10 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !fullName.trim() || !email || !password}
            className="relative w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-all duration-100 hover:bg-foreground/90 active:scale-[0.97] disabled:opacity-50"
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
              "Tạo tài khoản"
            )}
          </button>
        </form>

        {/* ── Divider ──────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-foreground/10" />
          <span className="text-xs text-foreground/40">hoặc</span>
          <div className="h-px flex-1 bg-foreground/10" />
        </div>

        {/* ── Link to login ────────────────────────────────── */}
        <Link
          href="/login"
          className="block w-full rounded-lg border border-foreground/10 bg-foreground/3 px-4 py-2.5 text-center text-sm font-medium text-foreground transition-all duration-100 hover:bg-foreground/7 active:scale-[0.97]"
        >
          Đã có tài khoản? Đăng nhập
        </Link>
      </div>
    </div>
  );
}
