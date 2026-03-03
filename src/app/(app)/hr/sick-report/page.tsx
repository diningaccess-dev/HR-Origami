"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type SickReport = {
  id: string;
  date: string;
  au_code: string | null;
  au_image_url: string | null;
  status: string;
  created_at: string;
};

export default function SickReportPage() {
  const [reports, setReports] = useState<SickReport[]>([]);
  const [todayReport, setTodayReport] = useState<SickReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);

  // AU inputs
  const [auCode, setAuCode] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Fetch lịch sử báo ốm ──────────────────────────────────
  useEffect(() => {
    let ignore = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || ignore) return;

      const { data } = await supabase
        .from("sick_reports")
        .select("id, date, au_code, au_image_url, status, created_at")
        .eq("profile_id", user.id)
        .order("date", { ascending: false })
        .limit(20);

      if (!ignore) {
        const list = data ?? [];
        setReports(list);
        // Kiểm tra đã báo ốm hôm nay chưa
        const existing = list.find((r) => r.date === today);
        if (existing) setTodayReport(existing);
        setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [today]);

  // ── Báo ốm ────────────────────────────────────────────────
  async function handleSubmit() {
    setShowConfirm(false);
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      showToast("Không thể xác thực. Vui lòng đăng nhập lại", "err");
      setSubmitting(false);
      return;
    }

    // 1. Tạo sick_reports record
    const { data: report, error } = await supabase
      .from("sick_reports")
      .insert({
        profile_id: user.id,
        date: today,
        au_code: auCode.trim() || null,
      })
      .select("id, date, au_code, au_image_url, status, created_at")
      .single();

    if (error) {
      showToast("Lỗi khi báo ốm: " + error.message, "err");
      setSubmitting(false);
      return;
    }

    // 2. Tìm shift hôm nay → hủy ca
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: shifts } = await supabase
      .from("shifts")
      .select("id")
      .eq("profile_id", user.id)
      .neq("status", "cancelled")
      .gte("start_time", todayStart.toISOString())
      .lte("start_time", todayEnd.toISOString());

    if (shifts && shifts.length > 0) {
      const shiftIds = shifts.map((s) => s.id);
      await supabase
        .from("shifts")
        .update({ status: "cancelled" })
        .in("id", shiftIds);
    }

    // Cập nhật state
    setTodayReport(report);
    setReports((prev) => [report, ...prev]);
    showToast("Đã báo ốm thành công. Chúc bạn mau khỏe!");
    setSubmitting(false);
  }

  // ── Upload ảnh AU ──────────────────────────────────────────
  async function handleUploadAU(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !todayReport) return;

    setUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      showToast("Không thể xác thực", "err");
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${todayReport.id}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("au-images")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      showToast("Upload ảnh thất bại: " + uploadErr.message, "err");
      setUploading(false);
      return;
    }

    // Lấy public URL
    const { data: urlData } = supabase.storage
      .from("au-images")
      .getPublicUrl(path);

    const imageUrl = urlData?.publicUrl ?? null;

    // Cập nhật record
    await supabase
      .from("sick_reports")
      .update({ au_image_url: imageUrl })
      .eq("id", todayReport.id);

    setTodayReport((prev) =>
      prev ? { ...prev, au_image_url: imageUrl } : prev,
    );
    setReports((prev) =>
      prev.map((r) =>
        r.id === todayReport.id ? { ...r, au_image_url: imageUrl } : r,
      ),
    );

    showToast("Đã upload ảnh AU");
    setUploading(false);
  }

  // ── Cập nhật mã eAU sau khi báo ốm ───────────────────────
  async function handleUpdateAuCode() {
    if (!todayReport || !auCode.trim()) return;

    await supabase
      .from("sick_reports")
      .update({ au_code: auCode.trim() })
      .eq("id", todayReport.id);

    setTodayReport((prev) =>
      prev ? { ...prev, au_code: auCode.trim() } : prev,
    );
    setReports((prev) =>
      prev.map((r) =>
        r.id === todayReport.id ? { ...r, au_code: auCode.trim() } : r,
      ),
    );
    showToast("Đã cập nhật mã eAU");
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-foreground/50">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
          Đang tải...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background px-4 py-6">
      <div className="mx-auto max-w-sm space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Báo ốm</h1>

        {/* ── Toast ────────────────────────────────────────── */}
        {toast && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              toast.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* ── Đã báo ốm hôm nay ──────────────────────────── */}
        {todayReport ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center space-y-2 dark:border-emerald-800 dark:bg-emerald-950">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-600 dark:text-emerald-400"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Đã báo ốm hôm nay
              </p>
              <p className="text-xs text-emerald-600/60 dark:text-emerald-400/60">
                Ca hôm nay đã được hủy tự động
              </p>
            </div>

            {/* ── Upload AU ──────────────────────────────────── */}
            <div className="rounded-xl border border-foreground/10 p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">
                Giấy AU / eAU
              </p>

              {/* Ảnh AU */}
              {todayReport.au_image_url ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={todayReport.au_image_url}
                    alt="Ảnh AU"
                    className="w-full rounded-lg border border-foreground/10 object-cover"
                  />
                  <p className="text-xs text-foreground/40 text-center">
                    Đã upload ảnh AU
                  </p>
                </div>
              ) : (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleUploadAU}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-foreground/20 py-3 text-sm text-foreground/50 transition hover:bg-foreground/5 disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
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
                        Đang upload...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                          <circle cx="12" cy="13" r="3" />
                        </svg>
                        Chụp / Upload ảnh AU
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Mã eAU */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={auCode}
                  onChange={(e) => setAuCode(e.target.value)}
                  placeholder={todayReport.au_code ?? "Nhập mã eAU (tùy chọn)"}
                  className="flex-1 rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
                />
                <button
                  type="button"
                  onClick={handleUpdateAuCode}
                  disabled={!auCode.trim()}
                  className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-white transition disabled:opacity-40"
                  style={{ backgroundColor: "var(--brand-color)" }}
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Chưa báo ốm → Nút lớn ─────────────────────── */
          <div className="space-y-4">
            {/* Mã eAU trước khi báo */}
            <div className="rounded-xl border border-foreground/10 p-4 space-y-2">
              <label className="block text-xs font-medium text-foreground/60">
                Mã eAU (tùy chọn)
              </label>
              <input
                type="text"
                value={auCode}
                onChange={(e) => setAuCode(e.target.value)}
                placeholder="Nhập nếu có"
                className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
              className="w-full rounded-xl py-4 text-lg font-semibold text-white transition disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-color)" }}
            >
              {submitting ? "Đang gửi..." : "Báo ốm hôm nay"}
            </button>

            <p className="text-center text-xs text-foreground/40">
              Ca hôm nay sẽ được hủy tự động
            </p>
          </div>
        )}

        {/* ── Confirm dialog ──────────────────────────────── */}
        {showConfirm && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-xs rounded-2xl bg-background p-6 space-y-4 shadow-lg">
              <p className="text-base font-semibold text-foreground text-center">
                Xác nhận báo ốm?
              </p>
              <p className="text-sm text-foreground/50 text-center">
                Ca hôm nay sẽ được hủy. Hành động không thể hoàn tác.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-lg border border-foreground/10 py-2.5 text-sm font-medium text-foreground/70 transition hover:bg-foreground/5"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 rounded-lg py-2.5 text-sm font-medium text-white transition"
                  style={{ backgroundColor: "var(--brand-color)" }}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Lịch sử báo ốm ─────────────────────────────── */}
        {reports.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-foreground/60">Lịch sử</p>
            {reports.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-foreground/10 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-1 rounded-full"
                    style={{ backgroundColor: "var(--brand-color)" }}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(r.date), "dd.MM.yyyy")}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-foreground/40">
                      {r.au_code && <span>eAU: {r.au_code}</span>}
                      {r.au_image_url && <span>📎 AU</span>}
                    </div>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    r.status === "confirmed"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                  }`}
                >
                  {r.status === "confirmed" ? "Đã xác nhận" : "Chờ xác nhận"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
