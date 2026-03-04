"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import {
  calculateTipDistribution,
  type AttendanceInput,
  type TipDistribution,
} from "@/lib/utils/tip-calculator";
import FloatToast from "@/components/ui/FloatToast";

// ── Types ────────────────────────────────────────────────────
type Profile = {
  id: string;
  full_name: string;
  role: string;
  location_id: string;
};

type SavedTipPool = {
  id: string;
  total_amount: number;
  distributions: TipDistribution[];
  date: string;
  created_at: string;
};

// ── Component ────────────────────────────────────────────────
export default function TipPoolPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [totalAmount, setTotalAmount] = useState("");
  const [preview, setPreview] = useState<ReturnType<
    typeof calculateTipDistribution
  > | null>(null);
  const [savedPool, setSavedPool] = useState<SavedTipPool | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useRef(createClient());
  const isManager = profile?.role === "manager" || profile?.role === "owner";
  const brandColor = "var(--brand-color)";

  // ── Toast tự ẩn ────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
  }

  // ── Load profile ───────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const sb = supabase.current;
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return;

      const { data: prof } = await sb
        .from("profiles")
        .select("id, full_name, role, location_id")
        .eq("id", user.id)
        .single();

      if (prof) setProfile(prof);
      setIsLoading(false);
    }
    load();
  }, []);

  // ── Load existing tip pool cho ngày đã chọn ────────────────
  const loadSavedPool = useCallback(async () => {
    if (!profile) return;
    const sb = supabase.current;

    const { data } = await sb
      .from("tip_pools")
      .select("id, total_amount, distributions, date, created_at")
      .eq("location_id", profile.location_id)
      .eq("date", selectedDate)
      .single();

    setSavedPool(data as SavedTipPool | null);
  }, [profile, selectedDate]);

  useEffect(() => {
    if (profile) {
      setPreview(null);
      setError(null);
      loadSavedPool();
    }
  }, [profile, selectedDate, loadSavedPool]);

  // ── Tính preview ───────────────────────────────────────────
  async function handleCalculate() {
    if (!profile || !totalAmount) return;

    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Vui lòng nhập số tiền hợp lệ.");
      return;
    }

    setIsCalculating(true);
    setError(null);
    setPreview(null);

    const sb = supabase.current;

    // Lấy attendances trong ngày, cho location này
    const dayStart = `${selectedDate}T00:00:00`;
    const dayEnd = `${selectedDate}T23:59:59`;

    const { data: attendances, error: attErr } = await sb
      .from("attendances")
      .select(
        `
        profile_id, checkin_at, checkout_at,
        shifts!shift_id ( end_time ),
        profiles!profile_id ( full_name, role )
      `,
      )
      .gte("checkin_at", dayStart)
      .lte("checkin_at", dayEnd);

    if (attErr) {
      console.error("Lỗi load attendances:", attErr);
      setError("Không thể tải dữ liệu chấm công.");
      setIsCalculating(false);
      return;
    }

    if (!attendances || attendances.length === 0) {
      setError("Không có dữ liệu chấm công ngày này.");
      setIsCalculating(false);
      return;
    }

    // Lọc CHỈ staff + azubi trong cùng location
    // Cần lấy profile để check role + location
    const { data: locationProfiles } = await sb
      .from("profiles")
      .select("id, role, location_id")
      .eq("location_id", profile.location_id)
      .in("role", ["staff", "azubi"]);

    const staffIds = new Set(
      (locationProfiles ?? []).map((p: { id: string }) => p.id),
    );

    // Map sang AttendanceInput, chỉ giữ staff/azubi
    const inputs: AttendanceInput[] = attendances
      .filter((a: Record<string, unknown>) =>
        staffIds.has(a.profile_id as string),
      )
      .map((a: Record<string, unknown>) => {
        const prof = a.profiles as { full_name: string; role: string } | null;
        const shift = a.shifts as { end_time: string } | null;

        return {
          profile_id: a.profile_id as string,
          full_name: prof?.full_name ?? "Unknown",
          checkin_at: a.checkin_at as string | null,
          checkout_at: a.checkout_at as string | null,
          shift_end_time: shift?.end_time ?? null,
        };
      });

    if (inputs.length === 0) {
      setError("Không có nhân viên (staff/azubi) nào chấm công ngày này.");
      setIsCalculating(false);
      return;
    }

    // Tính tip
    const result = calculateTipDistribution(inputs, amount);

    if (!result) {
      setError("Tổng giờ làm = 0, không thể chia tip.");
      setIsCalculating(false);
      return;
    }

    setPreview(result);
    setIsCalculating(false);
  }

  // ── Lưu tip pool ──────────────────────────────────────────
  async function handleSave() {
    if (!preview || !profile || isSaving) return;

    setIsSaving(true);
    const sb = supabase.current;

    const {
      data: { user },
    } = await sb.auth.getUser();

    const { error: insertErr } = await sb.from("tip_pools").insert({
      location_id: profile.location_id,
      date: selectedDate,
      total_amount: preview.totalAmount,
      distributions: preview.distributions,
      created_by: user?.id,
    });

    if (insertErr) {
      console.error("Lỗi lưu tip pool:", insertErr);
      if (insertErr.code === "23505") {
        showToast("Ngày này đã có tip pool. Chỉ được tạo 1 lần/ngày.", "err");
      } else {
        showToast("Không thể lưu. Thử lại sau.", "err");
      }
      setIsSaving(false);
      return;
    }

    showToast("Đã lưu tip pool thành công ✓", "ok");
    setPreview(null);
    setTotalAmount("");
    await loadSavedPool();
    setIsSaving(false);
  }

  // ── Render ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-6 space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-foreground/10" />
        <div className="h-10 animate-pulse rounded-xl bg-foreground/10" />
        <div className="h-40 animate-pulse rounded-2xl bg-foreground/10" />
      </div>
    );
  }

  // ── Staff view: chỉ xem tip của mình ──────────────────────
  if (!isManager) {
    return (
      <div className="mx-auto max-w-md px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tip của tôi</h1>
          <p className="text-xs text-foreground/50">Xem tiền tip theo ngày</p>
        </div>

        {/* Chọn ngày */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 text-sm text-foreground focus:outline-none"
        />

        {/* Hiển thị tip */}
        {savedPool ? (
          <div className="rounded-2xl border border-foreground/10 bg-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {format(new Date(savedPool.date), "dd.MM.yyyy")}
              </p>
              <p className="text-sm font-bold" style={{ color: brandColor }}>
                Tổng: {savedPool.total_amount.toFixed(2)} €
              </p>
            </div>

            {/* Tìm phần của user hiện tại */}
            {(() => {
              const myDist = savedPool.distributions?.find(
                (d: TipDistribution) => d.profile_id === profile?.id,
              );
              if (!myDist) {
                return (
                  <p className="text-sm text-foreground/50">
                    Bạn không có trong tip pool ngày này.
                  </p>
                );
              }
              return (
                <div className="rounded-xl bg-foreground/[0.04] p-3 space-y-1">
                  <p className="text-xs text-foreground/50">Tiền tip của bạn</p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: brandColor }}
                  >
                    {myDist.amount.toFixed(2)} €
                  </p>
                  <p className="text-xs text-foreground/40">
                    {myDist.hours}h làm · {(myDist.ratio * 100).toFixed(1)}%
                    tổng giờ
                  </p>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <div
              className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
              style={{ backgroundColor: brandColor }}
            >
              <svg
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">
              Chưa có dữ liệu tip ngày này
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Manager view ───────────────────────────────────────────
  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Chia Tip</h1>
        <p className="text-xs text-foreground/50">
          Nhập tổng tip → hệ thống tự chia theo giờ làm
        </p>
      </div>

      {/* Toast */}
      {toast && <FloatToast message={toast.msg} type={toast.type} />}

      {/* Chọn ngày */}
      <div>
        <label className="mb-1 block text-xs text-foreground/50">Ngày</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 text-sm text-foreground focus:outline-none"
        />
      </div>

      {/* Nếu đã có tip pool ngày này → hiện kết quả */}
      {savedPool ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Đã chốt
            </span>
            <span className="text-sm font-bold" style={{ color: brandColor }}>
              {savedPool.total_amount.toFixed(2)} €
            </span>
          </div>

          <DistributionTable distributions={savedPool.distributions ?? []} />
        </div>
      ) : (
        <>
          {/* Input tổng tiền */}
          <div>
            <label className="mb-1 block text-xs text-foreground/50">
              Tổng tiền tip (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="Ví dụ: 150.00"
              className="w-full rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none"
            />
          </div>

          {/* Nút tính */}
          <button
            onClick={handleCalculate}
            disabled={!totalAmount || isCalculating}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: brandColor }}
          >
            {isCalculating ? "Đang tính..." : "Xem Preview"}
          </button>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Preview bảng */}
          {preview && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  Preview chia tip
                </p>
                <p className="text-xs text-foreground/50">
                  Tổng: {preview.totalHours}h
                </p>
              </div>

              <DistributionTable distributions={preview.distributions} />

              {/* Nút lưu */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full rounded-xl border-2 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: brandColor }}
              >
                {isSaving ? "Đang lưu..." : "✓ Xác nhận & Lưu"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Bảng phân phối tip ───────────────────────────────────────
function DistributionTable({
  distributions,
}: {
  distributions: TipDistribution[];
}) {
  const brandColor = "var(--brand-color)";

  return (
    <div className="overflow-hidden rounded-2xl border border-foreground/10">
      {/* Header */}
      <div className="grid grid-cols-4 gap-1 bg-foreground/[0.04] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
        <span className="col-span-1">Tên</span>
        <span className="text-right">Giờ</span>
        <span className="text-right">Tỷ lệ</span>
        <span className="text-right">Nhận</span>
      </div>

      {/* Rows */}
      {distributions.map((d) => (
        <div
          key={d.profile_id}
          className="grid grid-cols-4 gap-1 border-t border-foreground/5 px-3 py-2.5"
        >
          <span className="col-span-1 truncate text-sm font-medium text-foreground">
            {d.full_name}
          </span>
          <span className="text-right text-sm text-foreground/60">
            {d.hours}h
          </span>
          <span className="text-right text-sm text-foreground/60">
            {(d.ratio * 100).toFixed(1)}%
          </span>
          <span
            className="text-right text-sm font-bold"
            style={{ color: brandColor }}
          >
            {d.amount.toFixed(2)}€
          </span>
        </div>
      ))}

      {/* Tổng */}
      <div className="grid grid-cols-4 gap-1 border-t border-foreground/10 bg-foreground/[0.02] px-3 py-2.5">
        <span className="col-span-1 text-xs font-bold text-foreground">
          Tổng
        </span>
        <span className="text-right text-xs font-bold text-foreground">
          {distributions.reduce((s, d) => s + d.hours, 0).toFixed(1)}h
        </span>
        <span className="text-right text-xs font-bold text-foreground">
          100%
        </span>
        <span
          className="text-right text-xs font-bold"
          style={{ color: brandColor }}
        >
          {distributions.reduce((s, d) => s + d.amount, 0).toFixed(2)}€
        </span>
      </div>
    </div>
  );
}
