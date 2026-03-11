"use client";

import { useMemo } from "react";
import {
  startOfWeek,
  eachDayOfInterval,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  format,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Tên thứ viết tắt tiếng Việt
const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type WeekStripProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  /** Danh sách ngày có ca (dùng để hiện dot) */
  daysWithShifts: string[];
};

export default function WeekStrip({
  selectedDate,
  onSelectDate,
  daysWithShifts,
}: WeekStripProps) {
  // 7 ngày tuần hiện tại (thứ 2 → CN)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }),
    [weekStart],
  );

  // Set cho lookup nhanh
  const shiftDaySet = useMemo(() => new Set(daysWithShifts), [daysWithShifts]);

  // Swipe prev/next week
  function goWeek(dir: -1 | 1) {
    if ("vibrate" in navigator) navigator.vibrate(5);
    const fn = dir === -1 ? subWeeks : addWeeks;
    onSelectDate(fn(selectedDate, 1));
  }

  // Month label
  const monthLabel = format(weekStart, "MMMM yyyy");

  return (
    <div className="bg-white border-b border-black/5">
      {/* Month + week nav */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "10px 14px 2px" }}
      >
        <button
          onClick={() => goWeek(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/5 transition-transform active:scale-90"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <span
          className="text-xs font-semibold text-foreground/50 capitalize"
          style={{ fontFamily: "Sora, sans-serif" }}
        >
          {monthLabel}
        </span>
        <button
          onClick={() => goWeek(1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/5 transition-transform active:scale-90"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Day buttons */}
      <div
        className="flex gap-1.5"
        style={{ padding: "8px 14px 10px" }}
      >
        {days.map((day, i) => {
          const active = isSameDay(day, selectedDate);
          const todayDay = isToday(day);
          const dateStr = format(day, "yyyy-MM-dd");
          const hasShift = shiftDaySet.has(dateStr);
          const dayNum = format(day, "d");
          const isSun = i === 6;

          return (
            <button
              key={dateStr}
              onClick={() => {
                if ("vibrate" in navigator) navigator.vibrate(5);
                onSelectDate(day);
              }}
              className="flex flex-1 flex-col items-center gap-1 rounded-[14px] py-1.5 transition-all duration-200 active:scale-[0.93]"
              style={{
                background: active ? "var(--brand-color)" : "transparent",
              }}
            >
              {/* Tên thứ */}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase" as const,
                  color: active
                    ? "#fff"
                    : isSun
                      ? "#ef4444"
                      : "#aaa",
                }}
              >
                {DAY_LABELS[i]}
              </span>

              {/* Số ngày */}
              <span
                style={{
                  fontFamily: "Sora, sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  color: active ? "#fff" : todayDay ? "var(--brand-color)" : "#444",
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                }}
              >
                {dayNum}
              </span>

              {/* Dot: hiện khi ngày có ca */}
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  background: active
                    ? "rgba(255,255,255,0.6)"
                    : hasShift
                      ? "var(--brand-color)"
                      : "transparent",
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
