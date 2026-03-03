"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { de } from "date-fns/locale";

// ── Types ────────────────────────────────────────────────────
type AvailEntry = {
  id: string;
  profile_id: string;
  date: string;
  is_available: boolean;
  note: string | null;
};

type TeamMember = {
  id: string;
  full_name: string;
};

type Profile = {
  id: string;
  full_name: string;
  role: string;
  location_id: string;
};

// ── Component ────────────────────────────────────────────────
export default function AvailabilityPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<Map<string, AvailEntry>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [togglingDate, setTogglingDate] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Manager: chọn nhân viên để xem
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const supabase = useRef(createClient());
  const isManager = profile?.role === "manager" || profile?.role === "owner";

  // ID đang xem (chính mình hoặc nhân viên được chọn)
  const viewingId =
    isManager && selectedMemberId ? selectedMemberId : (profile?.id ?? null);

  const brandColor = "var(--brand-color)";

  // ── Toast tự ẩn ────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Load profile ────────────────────────────────────────────
  useEffect(() => {
    async function loadProfile() {
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

      if (!prof) return;
      setProfile(prof);

      // Manager: load danh sách team
      if (prof.role === "manager" || prof.role === "owner") {
        const { data: team } = await sb
          .from("profiles")
          .select("id, full_name")
          .eq("location_id", prof.location_id)
          .eq("status", "active")
          .neq("id", prof.id)
          .order("full_name");

        setTeamMembers(team ?? []);
      }
    }
    loadProfile();
  }, []);

  // ── Load availability cho tháng đang xem ──────────────────
  const loadAvailability = useCallback(async () => {
    if (!viewingId) return;
    setIsLoading(true);

    const sb = supabase.current;
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const { data } = await sb
      .from("availability")
      .select("id, profile_id, date, is_available, note")
      .eq("profile_id", viewingId)
      .gte("date", monthStart)
      .lte("date", monthEnd);

    const map = new Map<string, AvailEntry>();
    (data ?? []).forEach((e: AvailEntry) => map.set(e.date, e));
    setAvailability(map);
    setIsLoading(false);
  }, [viewingId, currentMonth]);

  useEffect(() => {
    if (profile) loadAvailability();
  }, [profile, loadAvailability]);

  // ── Toggle ngày (chỉ cho xem mình) ───────────────────────
  async function handleDayPress(dateStr: string) {
    // Manager xem người khác → không toggle
    if (!profile) return;
    if (isManager && selectedMemberId && selectedMemberId !== profile.id)
      return;

    if (togglingDate) return;
    setTogglingDate(dateStr);

    const sb = supabase.current;
    const existing = availability.get(dateStr);

    if (existing) {
      // Toggle is_available hoặc xóa nếu đã là "bận" rồi
      if (existing.is_available) {
        // rảnh → đổi thành bận
        const { error } = await sb
          .from("availability")
          .update({ is_available: false })
          .eq("id", existing.id);

        if (!error) {
          setAvailability((prev) => {
            const next = new Map(prev);
            next.set(dateStr, { ...existing, is_available: false });
            return next;
          });
        }
      } else {
        // bận → xóa (về lại xám)
        const { error } = await sb
          .from("availability")
          .delete()
          .eq("id", existing.id);

        if (!error) {
          setAvailability((prev) => {
            const next = new Map(prev);
            next.delete(dateStr);
            return next;
          });
        }
      }
    } else {
      // chưa đánh dấu → tạo mới (rảnh)
      const { data, error } = await sb
        .from("availability")
        .insert({
          profile_id: profile.id,
          date: dateStr,
          is_available: true,
        })
        .select("id, profile_id, date, is_available, note")
        .single();

      if (!error && data) {
        setAvailability((prev) => {
          const next = new Map(prev);
          next.set(dateStr, data as AvailEntry);
          return next;
        });
      }
    }

    setTogglingDate(null);
  }

  // ── Build calendar grid ────────────────────────────────────
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Số ô trống đầu tuần (Mon=0)
  const firstDayOfWeek = (getDay(monthStart) + 6) % 7; // 0=Mon..6=Sun

  const today = new Date();

  // ── Màu ô ngày ────────────────────────────────────────────
  function getDayColor(dateStr: string) {
    const entry = availability.get(dateStr);
    if (!entry) return "bg-foreground/[0.04] text-foreground/60"; // xám
    if (entry.is_available)
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"; // xanh
    return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"; // đỏ
  }

  const isReadOnly =
    isManager && !!selectedMemberId && selectedMemberId !== profile?.id;
  const viewingName = isReadOnly
    ? (teamMembers.find((m) => m.id === selectedMemberId)?.full_name ?? "—")
    : "của bạn";

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Lịch Availability</h1>
        <p className="text-xs text-foreground/50">
          {isReadOnly
            ? `Xem lịch: ${viewingName}`
            : "Tap ngày để đánh dấu rảnh/bận"}
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.04] px-4 py-3 text-center text-sm">
          {toast}
        </div>
      )}

      {/* Manager: chọn nhân viên */}
      {isManager && (
        <div>
          <label className="mb-1 block text-xs text-foreground/50">
            Xem lịch của
          </label>
          <select
            value={selectedMemberId ?? ""}
            onChange={(e) => setSelectedMemberId(e.target.value || null)}
            className="w-full rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 py-2.5 text-sm text-foreground focus:outline-none"
          >
            <option value="">Của tôi</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-foreground/60">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-emerald-400" /> Rảnh
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-red-400" /> Bận
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-foreground/15" /> Chưa đánh
          dấu
        </span>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl border border-foreground/10 bg-background overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/50 hover:bg-foreground/[0.06] transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </button>

          <p className="text-sm font-semibold text-foreground">
            {format(currentMonth, "MMMM yyyy", { locale: de })}
          </p>

          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/50 hover:bg-foreground/[0.06] transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </div>

        {/* Day headers: Mo Tu We Th Fr Sa Su */}
        <div className="grid grid-cols-7 border-b border-foreground/5">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[10px] font-bold text-foreground/40"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1 p-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-lg bg-foreground/[0.06]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 p-2">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isToday = isSameDay(day, today);
              const inMonth = isSameMonth(day, currentMonth);
              const isToggling = togglingDate === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayPress(dateStr)}
                  disabled={isReadOnly || isToggling}
                  className={`
                    relative flex aspect-square flex-col items-center justify-center rounded-lg
                    text-xs font-medium transition-all active:scale-95 disabled:cursor-default
                    ${getDayColor(dateStr)}
                    ${!inMonth ? "opacity-30" : ""}
                    ${isToggling ? "opacity-50" : ""}
                  `}
                >
                  <span>{format(day, "d")}</span>
                  {/* Hôm nay indicator */}
                  {isToday && (
                    <span
                      className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-background"
                      style={{ backgroundColor: brandColor }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            {
              label: "Rảnh",
              count: [...availability.values()].filter((e) => e.is_available)
                .length,
              color: "text-emerald-600 dark:text-emerald-400",
            },
            {
              label: "Bận",
              count: [...availability.values()].filter((e) => !e.is_available)
                .length,
              color: "text-red-500 dark:text-red-400",
            },
            {
              label: "Chưa đánh",
              count: days.length - [...availability.values()].length,
              color: "text-foreground/40",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-foreground/10 bg-background py-2"
            >
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[10px] text-foreground/50">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
