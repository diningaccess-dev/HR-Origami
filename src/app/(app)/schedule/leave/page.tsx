"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Plus, X, Calendar, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { format, differenceInCalendarDays } from "date-fns";

const LEAVE_TYPES = [
  { value: "urlaub", label: "🏖️ Urlaub", color: "#3b82f6" },
  { value: "krank", label: "🤒 Krank (Ốm)", color: "#ef4444" },
  { value: "sonderurlaub", label: "👨‍👧 Sonderurlaub", color: "#8b5cf6" },
];

const STATUS_MAP: Record<
  string,
  { label: string; bg: string; text: string; emoji: string }
> = {
  pending: {
    label: "Chờ duyệt",
    bg: "#fef3c7",
    text: "#d97706",
    emoji: "⏳",
  },
  approved: {
    label: "Đã duyệt",
    bg: "#d1fae5",
    text: "#059669",
    emoji: "✅",
  },
  rejected: {
    label: "Từ chối",
    bg: "#fee2e2",
    text: "#dc2626",
    emoji: "❌",
  },
};

type LeaveRequest = {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  created_at: string;
  // For manager view
  profile_id: string;
  requester_name?: string;
};

type Profile = {
  id: string;
  role: string;
  location_id: string;
  leave_days_per_year: number;
};

export default function LeavePage() {
  const router = useRouter();
  const supabase = useRef(createClient());

  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);

  // Form state
  const [leaveType, setLeaveType] = useState("urlaub");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isManager = profile?.role === "manager" || profile?.role === "owner";

  // ── Toast auto-clear ───────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Load data ──────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const sb = supabase.current;
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;

    const { data: prof } = await sb
      .from("profiles")
      .select("id, role, location_id, leave_days_per_year")
      .eq("id", user.id)
      .single();

    if (!prof) {
      setLoading(false);
      return;
    }
    setProfile(prof);

    const isManagerRole = prof.role === "manager" || prof.role === "owner";

    if (isManagerRole) {
      // Manager: xem tất cả đơn trong location
      const { data: locProfiles } = await sb
        .from("profiles")
        .select("id, full_name")
        .eq("location_id", prof.location_id);

      const nameMap = new Map(
        (locProfiles ?? []).map((p: { id: string; full_name: string }) => [
          p.id,
          p.full_name,
        ]),
      );
      const ids = Array.from(nameMap.keys());

      if (ids.length > 0) {
        const { data } = await sb
          .from("leave_requests")
          .select("*")
          .in("profile_id", ids)
          .order("created_at", { ascending: false });

        setRequests(
          (data ?? []).map((r: Record<string, unknown>) => ({
            ...(r as LeaveRequest),
            requester_name: nameMap.get(r.profile_id as string) ?? "Unknown",
          })),
        );
      }
    } else {
      // Staff: chỉ xem đơn của mình
      const { data } = await sb
        .from("leave_requests")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false });

      setRequests((data ?? []) as LeaveRequest[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Tính ngày phép đã dùng ─────────────────────────────
  const currentYear = new Date().getFullYear();
  const usedDays = requests
    .filter(
      (r) =>
        r.status === "approved" &&
        r.type === "urlaub" &&
        new Date(r.start_date).getFullYear() === currentYear &&
        r.profile_id === profile?.id,
    )
    .reduce((sum, r) => sum + r.days, 0);

  const totalDays = profile?.leave_days_per_year ?? 24;
  const remainDays = totalDays - usedDays;

  // ── Submit leave request ───────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate || submitting) return;

    const days =
      differenceInCalendarDays(new Date(endDate), new Date(startDate)) + 1;
    if (days <= 0) {
      setToast({ msg: "Ngày kết thúc phải sau ngày bắt đầu", type: "err" });
      return;
    }

    setSubmitting(true);
    const sb = supabase.current;
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;

    const { error } = await sb.from("leave_requests").insert({
      profile_id: user.id,
      location_id: profile?.location_id ?? "enso",
      type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days,
      reason: reason || null,
    });

    if (error) {
      setToast({ msg: "Không thể gửi đơn. Thử lại sau.", type: "err" });
    } else {
      setToast({ msg: "Đã gửi đơn nghỉ phép ✓", type: "ok" });
      setShowForm(false);
      setStartDate("");
      setEndDate("");
      setReason("");
      setLeaveType("urlaub");
      await loadData();
    }
    setSubmitting(false);
  }

  // ── Manager: approve/reject ────────────────────────────
  async function handleReview(id: string, status: "approved" | "rejected") {
    const sb = supabase.current;
    const {
      data: { user },
    } = await sb.auth.getUser();

    await sb
      .from("leave_requests")
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    setToast({
      msg: status === "approved" ? "Đã duyệt ✓" : "Đã từ chối",
      type: "ok",
    });
    await loadData();
  }

  // ── Computed days for form preview ─────────────────────
  const previewDays =
    startDate && endDate
      ? differenceInCalendarDays(new Date(endDate), new Date(startDate)) + 1
      : 0;

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-md px-4 py-5 pb-28 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 transition-transform active:scale-90"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Nghỉ phép</h1>
          <p className="text-xs text-muted-foreground">
            {isManager ? "Duyệt đơn nghỉ" : "Đăng ký nghỉ phép"}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-white transition-all active:scale-95"
          style={{ backgroundColor: "var(--brand-color)" }}
        >
          {showForm ? (
            <X size={16} strokeWidth={2.5} />
          ) : (
            <Plus size={16} strokeWidth={2.5} />
          )}
          {showForm ? "Đóng" : "Gửi đơn"}
        </button>
      </div>

      {/* ── Leave balance card ────────────────────── */}
      {!isManager && (
        <div
          className="mb-4 rounded-2xl p-4 text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-color), var(--brand-color-dark, #1a1a2e))",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-75">Ngày phép còn lại</p>
              <p className="text-2xl font-bold">
                {remainDays}{" "}
                <span className="text-sm font-normal opacity-60">
                  / {totalDays} ngày
                </span>
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
              🏖️
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{
                width: `${Math.max(0, Math.min(100, (remainDays / totalDays) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-[10px] opacity-60">
            Đã dùng {usedDays} ngày trong năm {currentYear}
          </p>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────── */}
      {toast && (
        <div
          className={`mb-3 rounded-xl px-4 py-2.5 text-center text-sm font-medium text-white animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.type === "ok" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Request Form ──────────────────────────── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-5 space-y-3 rounded-2xl border border-foreground/10 bg-background p-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <p className="text-sm font-bold text-foreground">📝 Đơn nghỉ phép</p>

          {/* Leave type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground/60">
              Loại nghỉ
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LEAVE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setLeaveType(t.value)}
                  className={`rounded-xl px-2 py-2.5 text-xs font-semibold transition-all duration-200 active:scale-[0.95] ${
                    leaveType === t.value
                      ? "text-white shadow-sm"
                      : "bg-foreground/5 text-foreground/60"
                  }`}
                  style={
                    leaveType === t.value
                      ? { backgroundColor: t.color }
                      : undefined
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/60">
                <Calendar size={12} className="inline mr-1" />
                Từ ngày
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/60">
                <Calendar size={12} className="inline mr-1" />
                Đến ngày
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
            </div>
          </div>

          {/* Days preview */}
          {previewDays > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
              <Clock size={14} />
              <span className="font-semibold">{previewDays} ngày</span>
              {leaveType === "urlaub" && (
                <span className="opacity-60">
                  · Còn lại: {remainDays - previewDays} ngày
                </span>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/60">
              Lý do (tùy chọn)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Du lịch gia đình"
              className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !startDate || !endDate}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-40"
            style={{ backgroundColor: "var(--brand-color)" }}
          >
            {submitting ? "Đang gửi..." : "Gửi đơn nghỉ"}
          </button>
        </form>
      )}

      {/* ── Loading ──────────────────────────────── */}
      {loading && (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-foreground/10 p-4"
            >
              <div className="h-10 w-10 animate-pulse rounded-xl bg-foreground/10" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-24 animate-pulse rounded bg-foreground/10" />
                <div className="h-3 w-32 animate-pulse rounded bg-foreground/8" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty ────────────────────────────────── */}
      {!loading && requests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-3xl mb-3">🏖️</p>
          <p className="text-sm font-medium text-foreground/50">
            {isManager ? "Chưa có đơn nghỉ nào" : "Chưa có đơn nghỉ"}
          </p>
          <p className="mt-1 text-xs text-foreground/30">
            Bấm &quot;Gửi đơn&quot; để đăng ký nghỉ
          </p>
        </div>
      )}

      {/* ── Manager: pending first ───────────────── */}
      {!loading &&
        isManager &&
        requests.filter((r) => r.status === "pending").length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider mb-2">
              ⏳ Chờ duyệt
            </p>
            <div className="space-y-2">
              {requests
                .filter((r) => r.status === "pending")
                .map((req) => {
                  const typeInfo = LEAVE_TYPES.find(
                    (t) => t.value === req.type,
                  );
                  return (
                    <div
                      key={req.id}
                      className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-4 animate-in fade-in duration-200"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                          style={{
                            backgroundColor: `${typeInfo?.color ?? "#666"}20`,
                          }}
                        >
                          {typeInfo?.label.split(" ")[0] ?? "📋"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">
                            {req.requester_name}
                          </p>
                          <p className="text-xs text-foreground/50">
                            {typeInfo?.label.split(" ").slice(1).join(" ") ??
                              req.type}{" "}
                            · {req.days} ngày
                          </p>
                          <p className="text-xs text-foreground/40 mt-1">
                            {format(new Date(req.start_date), "dd.MM")} →{" "}
                            {format(new Date(req.end_date), "dd.MM.yyyy")}
                          </p>
                          {req.reason && (
                            <p className="text-xs text-foreground/40 mt-0.5 italic">
                              &ldquo;{req.reason}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleReview(req.id, "approved")}
                          className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-white transition-all active:scale-[0.95]"
                        >
                          ✅ Duyệt
                        </button>
                        <button
                          onClick={() => handleReview(req.id, "rejected")}
                          className="flex-1 rounded-xl bg-red-500 py-2 text-xs font-bold text-white transition-all active:scale-[0.95]"
                        >
                          ❌ Từ chối
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

      {/* ── Request history ──────────────────────── */}
      {!loading && requests.length > 0 && (
        <div>
          {isManager &&
            requests.filter((r) => r.status === "pending").length > 0 && (
              <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider mb-2 mt-2">
                📋 Lịch sử
              </p>
            )}
          <div className="space-y-2">
            {requests
              .filter((r) => !isManager || r.status !== "pending")
              .map((req) => {
                const typeInfo = LEAVE_TYPES.find((t) => t.value === req.type);
                const statusInfo = STATUS_MAP[req.status] ?? STATUS_MAP.pending;

                return (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-background p-3.5 transition-all duration-200"
                  >
                    {/* Icon */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                      style={{
                        backgroundColor: `${typeInfo?.color ?? "#666"}15`,
                      }}
                    >
                      {typeInfo?.label.split(" ")[0] ?? "📋"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {isManager
                            ? req.requester_name
                            : typeInfo?.label.split(" ").slice(1).join(" ")}
                        </p>
                      </div>
                      <p className="text-xs text-foreground/40">
                        {format(new Date(req.start_date), "dd.MM")} →{" "}
                        {format(new Date(req.end_date), "dd.MM.yyyy")} ·{" "}
                        {req.days} ngày
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
                      style={{
                        backgroundColor: statusInfo.bg,
                        color: statusInfo.text,
                      }}
                    >
                      {statusInfo.emoji} {statusInfo.label}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
