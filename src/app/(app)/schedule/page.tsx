"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  eachDayOfInterval,
  isSameDay,
  format,
  isToday,
} from "date-fns";
import { de } from "date-fns/locale";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Shift = {
  id: string;
  start_time: string;
  end_time: string;
  role_tag: string | null;
  status: string;
  location_id: string | null;
};

// ── Role tag label ────────────────────────────────────────────
const ROLE_TAG_LABELS: Record<string, string> = {
  bar: "Bar",
  kitchen: "Küche",
  service: "Service",
  all: "Alle",
};

// ── Skeleton loader ───────────────────────────────────────────
function SkeletonDay() {
  return (
    <div className="space-y-2">
      <div className="h-4 w-24 rounded bg-foreground/10 animate-pulse" />
      <div className="rounded-xl border border-foreground/10 p-4">
        <div className="h-4 w-32 rounded bg-foreground/10 animate-pulse mb-2" />
        <div className="h-3 w-20 rounded bg-foreground/8 animate-pulse" />
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // Tuần hiện tại tính từ offset (thứ 2 → CN)
  const baseDate = addWeeks(new Date(), weekOffset);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Label tuần — tiếng Việt
  const weekLabel =
    weekOffset === 0
      ? "Tuần này"
      : weekOffset === 1
        ? "Tuần sau"
        : weekOffset === -1
          ? "Tuần trước"
          : `${format(weekStart, "dd.MM")} – ${format(weekEnd, "dd.MM.yyyy")}`;

  // ── Fetch shifts của user theo tuần ───────────────────────
  useEffect(() => {
    let ignore = false;
    setLoading(true);

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || ignore) return;

      supabase
        .from("shifts")
        .select("id, start_time, end_time, role_tag, status, location_id")
        .eq("profile_id", user.id)
        .gte("start_time", weekStart.toISOString())
        .lte("start_time", weekEnd.toISOString())
        .order("start_time", { ascending: true })
        .then(({ data }) => {
          if (!ignore) {
            setShifts(data ?? []);
            setLoading(false);
          }
        });
    });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  // ── Shifts theo từng ngày ─────────────────────────────────
  function shiftsForDay(day: Date): Shift[] {
    return shifts.filter((s) => isSameDay(new Date(s.start_time), day));
  }

  return (
    <div className="min-h-dvh bg-background px-4 py-6">
      <div className="mx-auto max-w-lg space-y-5">
        {/* ── Header tuần ─────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-foreground/10 text-foreground/60 transition hover:bg-foreground/5"
            aria-label="Tuần trước"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{weekLabel}</p>
            <p className="text-xs text-foreground/40">
              {format(weekStart, "dd.MM")} – {format(weekEnd, "dd.MM.yyyy")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-foreground/10 text-foreground/60 transition hover:bg-foreground/5"
            aria-label="Tuần sau"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* ── Nút về tuần hiện tại ─────────────────────────── */}
        {weekOffset !== 0 && (
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="w-full rounded-lg border border-foreground/10 py-1.5 text-xs text-foreground/50 transition hover:bg-foreground/5"
          >
            Về tuần này
          </button>
        )}

        {/* ── Danh sách ngày ───────────────────────────────── */}
        {loading ? (
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonDay key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {days.map((day) => {
              const dayShifts = shiftsForDay(day);
              const dayName = format(day, "EEEE", { locale: de });
              const dayDate = format(day, "dd.MM");
              const today = isToday(day);

              return (
                <div key={day.toISOString()} className="space-y-2">
                  {/* Tên ngày */}
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium capitalize"
                      style={{
                        color: today ? "var(--brand-color)" : undefined,
                      }}
                    >
                      {dayName}
                    </span>
                    <span className="text-xs text-foreground/40">
                      {dayDate}
                    </span>
                    {today && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: "var(--brand-color)" }}
                      >
                        Hôm nay
                      </span>
                    )}
                  </div>

                  {/* Ca làm */}
                  {dayShifts.length === 0 ? (
                    <p className="text-sm text-foreground/30 pl-1">
                      Không có ca
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dayShifts.map((shift) => (
                        <ShiftCard key={shift.id} shift={shift} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ShiftCard ────────────────────────────────────────────────
function ShiftCard({ shift }: { shift: Shift }) {
  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time);
  const startStr = format(start, "HH:mm");
  const endStr = format(end, "HH:mm");
  const roleLabel = shift.role_tag
    ? (ROLE_TAG_LABELS[shift.role_tag] ?? shift.role_tag)
    : null;

  const isCancelled = shift.status === "cancelled";

  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
        isCancelled
          ? "border-foreground/8 opacity-40"
          : "border-foreground/10 bg-background"
      }`}
    >
      {/* Giờ */}
      <div className="flex items-center gap-3">
        <div
          className="h-8 w-1 rounded-full"
          style={{
            backgroundColor: isCancelled ? undefined : "var(--brand-color)",
            opacity: isCancelled ? 0.3 : 1,
          }}
        />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {startStr} – {endStr}
          </p>
          {roleLabel && (
            <p className="text-xs text-foreground/50">{roleLabel}</p>
          )}
        </div>
      </div>

      {/* Status badge */}
      {isCancelled && (
        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] text-foreground/50">
          Hủy
        </span>
      )}
    </div>
  );
}
