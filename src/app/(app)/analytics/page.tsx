"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

/* ── Types ──────────────────────────────────────────── */
type EmpHours = {
  id: string;
  name: string;
  hours: number;
  shifts: number;
};

type LocationSummary = {
  id: string;
  label: string;
  initial: string;
  totalHours: number;
  totalShifts: number;
  totalEmp: number;
};

const LOCATIONS = [
  { id: "origami", label: "Origami", initial: "O", color: "#f59e0b" },
  { id: "enso", label: "Enso", initial: "E", color: "#22c55e" },
  { id: "okyu", label: "Okyu", initial: "K", color: "#ef4444" },
];

/* ══════════════════════════════════════════════════════
   AnalyticsPage
   ══════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const router = useRouter();
  const supabase = useRef(createClient());

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [locationId, setLocationId] = useState("enso");
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [offset, setOffset] = useState(0); // 0 = current, -1 = previous, etc.

  const [empHours, setEmpHours] = useState<EmpHours[]>([]);
  const [locSummary, setLocSummary] = useState<LocationSummary[]>([]);

  const isOwner = role === "owner";

  // ── Date range based on period + offset ──────────
  function getRange() {
    const now = new Date();
    if (period === "week") {
      const base = new Date(now);
      base.setDate(base.getDate() + offset * 7);
      return {
        start: startOfWeek(base, { weekStartsOn: 1 }),
        end: endOfWeek(base, { weekStartsOn: 1 }),
      };
    }
    const base = subMonths(now, -offset);
    return {
      start: startOfMonth(base),
      end: endOfMonth(base),
    };
  }

  const { start, end } = getRange();
  const rangeLabel =
    period === "week"
      ? `${format(start, "dd.MM")} — ${format(end, "dd.MM.yyyy")}`
      : format(start, "MMMM yyyy");

  // ── Load data ────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const sb = supabase.current;

    // Get profile
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;

    const { data: prof } = await sb
      .from("profiles")
      .select("role, location_id")
      .eq("id", user.id)
      .single();

    const userRole = prof?.role ?? "staff";
    const userLoc = prof?.location_id ?? "enso";
    setRole(userRole);
    setLocationId(userLoc);

    const isOwnerCheck = userRole === "owner";
    const startISO = start.toISOString();
    const endISO = end.toISOString();
    const locsToQuery = isOwnerCheck
      ? LOCATIONS.map((l) => l.id)
      : [userLoc];

    // ── Per-employee hours for current location ──
    const { data: shifts } = await sb
      .from("shifts")
      .select("id, profile_id, start_time, end_time, location_id")
      .in("location_id", locsToQuery)
      .gte("start_time", startISO)
      .lte("start_time", endISO)
      .neq("status", "cancelled");

    // Get employee names
    const profileIds = [...new Set((shifts ?? []).map((s) => s.profile_id).filter(Boolean))];
    const nameMap = new Map<string, string>();
    const locMap = new Map<string, string>();

    if (profileIds.length > 0) {
      const { data: profiles } = await sb
        .from("profiles")
        .select("id, full_name, location_id")
        .in("id", profileIds as string[]);
      (profiles ?? []).forEach((p: { id: string; full_name: string; location_id: string }) => {
        nameMap.set(p.id, p.full_name);
        locMap.set(p.id, p.location_id);
      });
    }

    // Calculate hours per employee
    const empMap = new Map<string, { hours: number; shifts: number; loc: string }>();
    for (const s of shifts ?? []) {
      if (!s.profile_id) continue;
      const hours =
        (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) /
        (1000 * 60 * 60);
      const existing = empMap.get(s.profile_id) || { hours: 0, shifts: 0, loc: s.location_id };
      existing.hours += hours;
      existing.shifts += 1;
      empMap.set(s.profile_id, existing);
    }

    // Sort by hours descending
    const empArr: EmpHours[] = Array.from(empMap.entries())
      .map(([id, data]) => ({
        id,
        name: nameMap.get(id) ?? "—",
        hours: Math.round(data.hours * 10) / 10,
        shifts: data.shifts,
      }))
      .sort((a, b) => b.hours - a.hours);

    setEmpHours(empArr);

    // ── Location summary ──
    if (isOwnerCheck) {
      const locStats: LocationSummary[] = LOCATIONS.map((loc) => {
        const locShifts = (shifts ?? []).filter((s) => s.location_id === loc.id);
        const totalH = locShifts.reduce((sum, s) => {
          return (
            sum +
            (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) /
              (1000 * 60 * 60)
          );
        }, 0);
        const uniqueEmps = new Set(locShifts.map((s) => s.profile_id).filter(Boolean));
        return {
          id: loc.id,
          label: loc.label,
          initial: loc.initial,
          totalHours: Math.round(totalH * 10) / 10,
          totalShifts: locShifts.length,
          totalEmp: uniqueEmps.size,
        };
      });
      setLocSummary(locStats);
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, offset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Max hours for bar width scaling
  const maxHours = empHours.length > 0 ? Math.max(...empHours.map((e) => e.hours)) : 1;

  return (
    <div
      className="min-h-dvh pb-28 animate-in fade-in duration-300"
      style={{ background: "#f8f9fa" }}
    >
      {/* ── Header ─────────────────────────────────── */}
      <div
        className="flex items-center gap-3 bg-white border-b border-black/5"
        style={{ padding: "14px 18px 10px" }}
      >
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 transition-transform active:scale-90"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <div>
          <h1
            style={{
              fontFamily: "Sora, sans-serif",
              fontSize: 17,
              fontWeight: 700,
              color: "#1a1a1a",
            }}
          >
            Analytics
          </h1>
          <p className="text-[10px] text-foreground/40">
            {isOwner ? "Tất cả quán" : LOCATIONS.find((l) => l.id === locationId)?.label}
          </p>
        </div>
      </div>

      <div className="px-4 pt-3 space-y-3">
        {/* ── Period toggle + navigation ────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(["week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPeriod(p);
                  setOffset(0);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                  period === p
                    ? "text-white"
                    : "bg-foreground/5 text-foreground/50"
                }`}
                style={
                  period === p
                    ? { backgroundColor: "var(--brand-color)" }
                    : undefined
                }
              >
                {p === "week" ? "Tuần" : "Tháng"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset((o) => o - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/5 transition-transform active:scale-90"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold text-foreground min-w-[120px] text-center">
              {rangeLabel}
            </span>
            <button
              onClick={() => setOffset((o) => Math.min(o + 1, 0))}
              disabled={offset === 0}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/5 transition-transform active:scale-90 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-foreground/10" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Location comparison (Owner) ──────── */}
            {isOwner && locSummary.length > 0 && (
              <div
                className="rounded-2xl bg-white p-4"
                style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
              >
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-3">
                  So sánh quán
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {locSummary.map((loc) => {
                    const locInfo = LOCATIONS.find((l) => l.id === loc.id)!;
                    const maxLocH = Math.max(...locSummary.map((l) => l.totalHours), 1);
                    const pct = (loc.totalHours / maxLocH) * 100;

                    return (
                      <div key={loc.id} className="text-center">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white mx-auto"
                          style={{ backgroundColor: locInfo.color }}
                        >
                          {loc.initial}
                        </div>
                        <p className="text-xs font-bold text-foreground mt-1">{loc.label}</p>
                        {/* Mini bar */}
                        <div className="mt-2 mx-auto w-full rounded-full bg-foreground/5 h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: locInfo.color,
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-foreground/40 mt-1">
                          {loc.totalHours}h · {loc.totalShifts} ca
                        </p>
                        <p className="text-[9px] text-foreground/30">
                          {loc.totalEmp} NV
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Emp hours bar chart ──────────────── */}
            <div
              className="rounded-2xl bg-white p-4"
              style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
            >
              <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-3">
                Giờ làm theo nhân viên
              </p>
              {empHours.length === 0 ? (
                <p className="text-sm text-foreground/30 text-center py-6">
                  Không có dữ liệu
                </p>
              ) : (
                <div className="space-y-2">
                  {empHours.map((emp, i) => {
                    const pct = (emp.hours / maxHours) * 100;
                    return (
                      <div key={emp.id} className="flex items-center gap-2.5">
                        {/* Rank */}
                        <span className="text-[10px] font-bold text-foreground/30 w-4 text-right">
                          {i + 1}
                        </span>
                        {/* Avatar */}
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: "var(--brand-color)" }}
                        >
                          {emp.name[0]}
                        </div>
                        {/* Name + bar */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {emp.name}
                            </span>
                            <span className="text-xs font-bold text-foreground/70 ml-2 shrink-0">
                              {emp.hours}h
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-foreground/5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: `linear-gradient(90deg, var(--brand-color), var(--brand-color-light, #86efac))`,
                              }}
                            />
                          </div>
                          <span className="text-[9px] text-foreground/30">
                            {emp.shifts} ca
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Total summary card ──────────────── */}
            <div
              className="rounded-2xl p-4 text-white"
              style={{
                background: "linear-gradient(135deg, var(--brand-color), #1a1a1a)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              }}
            >
              <p className="text-xs font-medium opacity-60 mb-2">
                Tổng kết {period === "week" ? "tuần" : "tháng"}
              </p>
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>
                    {empHours.reduce((s, e) => s + e.hours, 0).toFixed(1)}h
                  </p>
                  <p className="text-[10px] opacity-40">Tổng giờ</p>
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>
                    {empHours.reduce((s, e) => s + e.shifts, 0)}
                  </p>
                  <p className="text-[10px] opacity-40">Tổng ca</p>
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>
                    {empHours.length}
                  </p>
                  <p className="text-[10px] opacity-40">Nhân viên</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
