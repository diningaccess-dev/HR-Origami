"use client";

import { createClient } from "@supabase/supabase-js";
import { useState } from "react";

/* ────────────────────────────────────────────────
   Supabase client WITHOUT auth headers.
   Uses the anon key only — no session token attached.
   This ensures the insert is truly anonymous.
   ──────────────────────────────────────────────── */
const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const CATEGORIES = [
  { value: "harassment", label: "Quấy rối / Phân biệt đối xử" },
  { value: "policy_violation", label: "Vi phạm quy định" },
  { value: "safety", label: "An toàn lao động" },
  { value: "other", label: "Khác" },
] as const;

export default function WhistleblowerPage() {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);

  /* ── helpers ─────────────────────────────────── */
  function flash(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const canSubmit = category !== "" && description.trim().length >= 10;

  /* ── submit ──────────────────────────────────── */
  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    const { error } = await anonClient
      .from("whistleblower_reports")
      .insert({ category, description: description.trim() });

    if (error) {
      flash("Gửi thất bại. Vui lòng thử lại.", "err");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  /* ── success screen ──────────────────────────── */
  if (submitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        {/* checkmark */}
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--brand-color)" }}
        >
          <svg
            className="h-8 w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-foreground">
          Báo cáo đã gửi ẩn danh
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          Không có thông tin nào liên kết đến bạn. Cảm ơn bạn đã lên tiếng.
        </p>

        <button
          onClick={() => {
            setSubmitted(false);
            setCategory("");
            setDescription("");
          }}
          className="mt-8 rounded-xl px-6 py-2.5 text-sm font-medium text-white transition-opacity active:opacity-80"
          style={{ backgroundColor: "var(--brand-color)" }}
        >
          Gửi báo cáo khác
        </button>
      </div>
    );
  }

  /* ── form ────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6">
      {/* ── header ────────────────────────────── */}
      <h1 className="text-xl font-bold text-foreground">Báo cáo ẩn danh</h1>

      {/* ── anonymous notice ──────────────────── */}
      <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/30">
        <svg
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v.01M12 12V8m0 13a9 9 0 110-18 9 9 0 010 18z"
          />
        </svg>
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            Hoàn toàn ẩn danh
          </p>
          <p className="text-amber-700 dark:text-amber-400/80">
            Báo cáo này không lưu bất kỳ thông tin cá nhân nào. Không ai có thể
            biết bạn là người gửi.
          </p>
        </div>
      </div>

      {/* ── category dropdown ─────────────────── */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Danh mục <span className="text-red-500">*</span>
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2"
          style={
            { "--tw-ring-color": "var(--brand-color)" } as React.CSSProperties
          }
        >
          <option value="" disabled>
            Chọn danh mục...
          </option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── description textarea ──────────────── */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Mô tả chi tiết <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder="Mô tả sự việc cần báo cáo (tối thiểu 10 ký tự)..."
          className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2"
          style={
            { "--tw-ring-color": "var(--brand-color)" } as React.CSSProperties
          }
        />
        <p className="text-xs text-muted-foreground text-right">
          {description.length} ký tự
        </p>
      </div>

      {/* ── submit button ─────────────────────── */}
      <button
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
        className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40 active:opacity-80"
        style={{ backgroundColor: "var(--brand-color)" }}
      >
        {submitting ? "Đang gửi..." : "Gửi báo cáo ẩn danh"}
      </button>

      {/* ── toast ─────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-lg ${
            toast.type === "ok" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
