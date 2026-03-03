"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";

// ── Types ────────────────────────────────────────────────────
type Shift = {
  id: string;
  location_id: string;
  profile_id: string | null;
  role_tag: string;
  start_time: string;
  end_time: string;
  status: string;
  is_marketplace: boolean;
  // Join
  owner_name?: string;
};

type Profile = {
  id: string;
  full_name: string;
  role: string;
  location_id: string;
};

const ROLE_TAG_LABELS: Record<string, string> = {
  bar: "Bar",
  kitchen: "Bếp",
  service: "Service",
  all: "Tất cả",
};

// ── Component ────────────────────────────────────────────────
export default function MarketplacePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // shift id đang xử lý
  const [toast, setToast] = useState<string | null>(null);

  const supabase = useRef(createClient());
  const isManager = profile?.role === "manager" || profile?.role === "owner";
  const brandColor = "var(--brand-color)";

  // ── Toast tự ẩn ────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Load profile + marketplace shifts ─────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const sb = supabase.current;

    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;

    // Lấy profile
    const { data: prof } = await sb
      .from("profiles")
      .select("id, full_name, role, location_id")
      .eq("id", user.id)
      .single();

    if (!prof) {
      setIsLoading(false);
      return;
    }
    setProfile(prof);

    // Lấy ca marketplace của location
    const { data: marketShifts } = await sb
      .from("shifts")
      .select(
        "id, location_id, profile_id, role_tag, start_time, end_time, status, is_marketplace",
      )
      .eq("location_id", prof.location_id)
      .eq("is_marketplace", true)
      .neq("status", "cancelled")
      .order("start_time", { ascending: true });

    if (!marketShifts) {
      setIsLoading(false);
      return;
    }

    // Lấy tên người đăng ca
    const ownerIds = [
      ...new Set(marketShifts.map((s) => s.profile_id).filter(Boolean)),
    ] as string[];

    const ownerMap = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: owners } = await sb
        .from("profiles")
        .select("id, full_name")
        .in("id", ownerIds);
      (owners ?? []).forEach((o: { id: string; full_name: string }) =>
        ownerMap.set(o.id, o.full_name),
      );
    }

    const mapped: Shift[] = marketShifts.map((s) => ({
      ...s,
      owner_name: s.profile_id ? (ownerMap.get(s.profile_id) ?? "—") : "Trống",
    }));

    setShifts(mapped);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Nhận ca (staff) ───────────────────────────────────────
  async function handleTakeShift(shiftId: string) {
    if (!profile || actionLoading) return;
    setActionLoading(shiftId);

    const { error } = await supabase.current
      .from("shifts")
      .update({ profile_id: profile.id, status: "filled" })
      .eq("id", shiftId);

    if (error) {
      setToast("Không thể nhận ca. Thử lại sau.");
    } else {
      setToast("Đã nhận ca — chờ manager duyệt ✓");
      await loadData();
    }
    setActionLoading(null);
  }

  // ── Manager: duyệt ca (xác nhận filled) ───────────────────
  async function handleApprove(shiftId: string) {
    if (actionLoading) return;
    setActionLoading(shiftId);

    const { error } = await supabase.current
      .from("shifts")
      .update({ is_marketplace: false, status: "scheduled" })
      .eq("id", shiftId);

    if (error) {
      setToast("Không thể duyệt. Thử lái sau.");
    } else {
      setToast("Đã duyệt ca ✓");
      await loadData();
    }
    setActionLoading(null);
  }

  // ── Manager: từ chối ca ───────────────────────────────────
  async function handleReject(shiftId: string) {
    if (actionLoading) return;
    setActionLoading(shiftId);

    const { error } = await supabase.current
      .from("shifts")
      .update({ profile_id: null, status: "open" })
      .eq("id", shiftId);

    if (error) {
      setToast("Không thể từ chối. Thử lại sau.");
    } else {
      setToast("Đã từ chối ✗");
      await loadData();
    }
    setActionLoading(null);
  }

  // ── Skeleton loading ───────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-6 space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-foreground/10" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl bg-foreground/10"
          />
        ))}
      </div>
    );
  }

  // ── Phân loại ca ──────────────────────────────────────────
  const openShifts = shifts.filter((s) => s.status === "open");
  const pendingShifts = shifts.filter((s) => s.status === "filled");

  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Chợ Ca</h1>
        <p className="text-xs text-foreground/50">
          {isManager ? "Duyệt hoán đổi ca" : "Nhận ca từ đồng nghiệp"}
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.04] px-4 py-3 text-center text-sm text-foreground">
          {toast}
        </div>
      )}

      {/* ── Ca đang chờ duyệt (Manager thấy) ────────────────── */}
      {isManager && pendingShifts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Chờ duyệt ({pendingShifts.length})
          </h2>
          {pendingShifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              isManager={isManager}
              currentUserId={profile?.id ?? ""}
              actionLoading={actionLoading}
              onTake={handleTakeShift}
              onApprove={handleApprove}
              onReject={handleReject}
              brandColor={brandColor}
            />
          ))}
        </section>
      )}

      {/* ── Ca đang mở ───────────────────────────────────────── */}
      <section className="space-y-2">
        {(isManager || pendingShifts.length > 0) && (
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Đang tìm người ({openShifts.length})
          </h2>
        )}

        {openShifts.length === 0 && pendingShifts.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center py-16 text-center">
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
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">
              Không có ca nào đang cần người
            </p>
            <p className="mt-1 text-xs text-foreground/50">
              Quay lại sau khi có ca mới đăng
            </p>
          </div>
        ) : (
          openShifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              isManager={isManager}
              currentUserId={profile?.id ?? ""}
              actionLoading={actionLoading}
              onTake={handleTakeShift}
              onApprove={handleApprove}
              onReject={handleReject}
              brandColor={brandColor}
            />
          ))
        )}
      </section>
    </div>
  );
}

// ── Shift Card ───────────────────────────────────────────────
function ShiftCard({
  shift,
  isManager,
  currentUserId,
  actionLoading,
  onTake,
  onApprove,
  onReject,
  brandColor,
}: {
  shift: Shift;
  isManager: boolean;
  currentUserId: string;
  actionLoading: string | null;
  onTake: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  brandColor: string;
}) {
  const isPending = shift.status === "filled";
  const isLoading = actionLoading === shift.id;
  const isOwner = shift.profile_id === currentUserId;

  return (
    <div
      className={`rounded-2xl border p-4 space-y-3 ${
        isPending
          ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
          : "border-foreground/10 bg-background"
      }`}
    >
      {/* Top row: ngày + badge */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground/50">
          {format(new Date(shift.start_time), "EEEE, dd.MM.yyyy", {
            locale: de,
          })}
        </p>
        {isPending ? (
          <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            Chờ duyệt
          </span>
        ) : (
          <span className="rounded-full bg-foreground/[0.06] px-2.5 py-0.5 text-[10px] font-medium text-foreground/60">
            Đang mở
          </span>
        )}
      </div>

      {/* Giờ + khu vực */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
          style={{ backgroundColor: brandColor }}
        >
          {ROLE_TAG_LABELS[shift.role_tag]?.slice(0, 2) ?? "CA"}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {format(new Date(shift.start_time), "HH:mm")} —{" "}
            {format(new Date(shift.end_time), "HH:mm")}
          </p>
          <p className="text-xs text-foreground/50">
            {ROLE_TAG_LABELS[shift.role_tag] ?? shift.role_tag}
            {shift.owner_name && shift.owner_name !== "Trống" && (
              <> · Đăng bởi: {shift.owner_name}</>
            )}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {/* Manager: duyệt / từ chối khi có người nhận */}
        {isManager && isPending && (
          <>
            <button
              onClick={() => onApprove(shift.id)}
              disabled={isLoading}
              className="flex-1 rounded-xl py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: brandColor }}
            >
              {isLoading ? "..." : "✓ Duyệt"}
            </button>
            <button
              onClick={() => onReject(shift.id)}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-foreground/10 py-2 text-xs font-semibold text-foreground/60 transition-colors hover:bg-foreground/[0.04] disabled:opacity-40"
            >
              ✕ Từ chối
            </button>
          </>
        )}

        {/* Staff: nhận ca nếu đang open và không phải ca của mình */}
        {!isManager && !isPending && !isOwner && (
          <button
            onClick={() => onTake(shift.id)}
            disabled={isLoading}
            className="flex-1 rounded-xl py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: brandColor }}
          >
            {isLoading ? "Đang xử lý..." : "Nhận ca"}
          </button>
        )}

        {/* Ca của mình */}
        {isOwner && (
          <p className="flex-1 text-center text-xs text-foreground/40">
            Ca của bạn
          </p>
        )}
      </div>
    </div>
  );
}
