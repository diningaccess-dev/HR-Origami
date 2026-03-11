"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import Link from "next/link";
import {
  Users,
  CalendarClock,
  ClipboardCheck,
  AlertCircle,
  TrendingUp,
  Palmtree,
  ArrowRightLeft,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────── */
type LocationStats = {
  id: string;
  label: string;
  totalEmp: number;
  workingToday: number;
  pendingLeaves: number;
  pendingShiftMarket: number;
  pendingAccounts: number;
};

const LOCATIONS = [
  { id: "origami", label: "Origami", initial: "O", color: "#f59e0b" },
  { id: "enso", label: "Enso", initial: "E", color: "#22c55e" },
  { id: "okyu", label: "Okyu", initial: "K", color: "#ef4444" },
];

/* ══════════════════════════════════════════════════════
   OwnerDashboard
   ══════════════════════════════════════════════════════ */
export default function OwnerDashboard() {
  const supabase = useRef(createClient());
  const [stats, setStats] = useState<LocationStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalShiftsToday, setTotalShiftsToday] = useState(0);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const sb = supabase.current;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    const results: LocationStats[] = [];

    for (const loc of LOCATIONS) {
      // Total active employees
      const { count: empCount } = await sb
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("location_id", loc.id)
        .in("status", ["active", "approved"]);

      // Shifts today
      const { count: shiftsToday } = await sb
        .from("shifts")
        .select("id", { count: "exact", head: true })
        .eq("location_id", loc.id)
        .gte("start_time", `${todayStr}T00:00:00`)
        .lte("start_time", `${todayStr}T23:59:59`)
        .neq("status", "cancelled");

      // Pending leave requests
      const { count: pendingLeaves } = await sb
        .from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("location_id", loc.id)
        .eq("status", "pending");

      // Pending marketplace shifts
      const { count: pendingMarket } = await sb
        .from("shifts")
        .select("id", { count: "exact", head: true })
        .eq("location_id", loc.id)
        .eq("is_marketplace", true)
        .eq("status", "filled");

      // Pending accounts
      const { count: pendingAccounts } = await sb
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("location_id", loc.id)
        .eq("status", "pending");

      results.push({
        id: loc.id,
        label: loc.label,
        totalEmp: empCount ?? 0,
        workingToday: shiftsToday ?? 0,
        pendingLeaves: pendingLeaves ?? 0,
        pendingShiftMarket: pendingMarket ?? 0,
        pendingAccounts: pendingAccounts ?? 0,
      });
    }

    setStats(results);
    setTotalShiftsToday(results.reduce((s, r) => s + r.workingToday, 0));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const totalEmp = stats.reduce((s, r) => s + r.totalEmp, 0);
  const totalPending = stats.reduce(
    (s, r) => s + r.pendingLeaves + r.pendingShiftMarket + r.pendingAccounts,
    0,
  );

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-3 animate-pulse">
        <div className="h-24 rounded-2xl bg-foreground/10" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-foreground/10" />
          ))}
        </div>
        <div className="h-20 rounded-2xl bg-foreground/10" />
      </div>
    );
  }

  return (
    <div className="px-4 space-y-3 animate-in fade-in duration-300">
      {/* ── Overview Card ─────────────────────────── */}
      <div
        className="rounded-2xl text-white p-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--brand-color), #1a1a1a)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}
      >

        <p className="text-xs font-medium opacity-70 mb-1">Tổng quan hôm nay</p>
        <div className="flex items-end gap-6">
          <div>
            <p className="text-3xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>
              {totalEmp}
            </p>
            <p className="text-[10px] opacity-60">Nhân viên</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>
              {totalShiftsToday}
            </p>
            <p className="text-[10px] opacity-60">Ca hôm nay</p>
          </div>
          {totalPending > 0 && (
            <div className="ml-auto flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1">
              <AlertCircle size={12} />
              <span className="text-xs font-bold">{totalPending} chờ duyệt</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Location Cards ────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((loc, i) => {
          const locInfo = LOCATIONS[i];
          const pending = loc.pendingLeaves + loc.pendingShiftMarket + loc.pendingAccounts;

          return (
            <div
              key={loc.id}
              className="rounded-2xl bg-white p-3 relative overflow-hidden"
              style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
            >
              {pending > 0 && (
                <div
                  className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: "#ef4444" }}
                >
                  {pending}
                </div>
              )}
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: locInfo.color }}
              >
                {locInfo.initial}
              </div>
              <p className="text-xs font-bold text-foreground mt-1">{loc.label}</p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Users size={10} style={{ color: locInfo.color }} />
                  <span className="text-[10px] text-foreground/50">
                    {loc.totalEmp} NV
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarClock size={10} style={{ color: locInfo.color }} />
                  <span className="text-[10px] text-foreground/50">
                    {loc.workingToday} ca
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Pending Section ───────────────────────── */}
      {totalPending > 0 && (
        <div
          className="rounded-2xl bg-white p-4 space-y-2"
          style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
        >
          <p className="text-xs font-bold text-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle size={12} className="text-amber-500" />
            Cần duyệt
          </p>
          {stats.map((loc) => {
            const items = [];
            if (loc.pendingLeaves > 0) items.push(`${loc.pendingLeaves} nghỉ phép`);
            if (loc.pendingShiftMarket > 0) items.push(`${loc.pendingShiftMarket} đổi ca`);
            if (loc.pendingAccounts > 0) items.push(`${loc.pendingAccounts} tài khoản`);
            if (items.length === 0) return null;

            return (
              <div key={loc.id} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground w-16">
                  {loc.label}
                </span>
                <span className="text-[11px] text-foreground/50">
                  {items.join(" · ")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Quick Links ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/schedule"
          className="flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 transition-transform active:scale-[0.97]"
          style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
        >
          <ClipboardCheck size={16} style={{ color: "var(--brand-color)" }} />
          <span className="text-xs font-semibold text-foreground">Lịch Grid</span>
        </Link>
        <Link
          href="/analytics"
          className="flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 transition-transform active:scale-[0.97]"
          style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
        >
          <TrendingUp size={16} style={{ color: "var(--brand-color)" }} />
          <span className="text-xs font-semibold text-foreground">Analytics</span>
        </Link>
        <Link
          href="/schedule/leave"
          className="flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 transition-transform active:scale-[0.97]"
          style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
        >
          <Palmtree size={16} style={{ color: "var(--brand-color)" }} />
          <span className="text-xs font-semibold text-foreground">Nghỉ phép</span>
        </Link>
        <Link
          href="/schedule/marketplace"
          className="flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 transition-transform active:scale-[0.97]"
          style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
        >
          <ArrowRightLeft size={16} style={{ color: "var(--brand-color)" }} />
          <span className="text-xs font-semibold text-foreground">Chợ ca</span>
        </Link>
      </div>
    </div>
  );
}
