"use client";

import { useMemo } from "react";
import {
  startOfWeek,
  eachDayOfInterval,
  addDays,
  isSameDay,
  format,
  isToday,
} from "date-fns";

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

  return (
    <div
      className="flex gap-1.5 bg-white border-b border-black/5"
      style={{ padding: "12px 14px 10px" }}
    >
      {days.map((day, i) => {
        const active = isSameDay(day, selectedDate);
        const today = isToday(day);
        const dateStr = format(day, "yyyy-MM-dd");
        const hasShift = shiftDaySet.has(dateStr);
        const dayNum = format(day, "d");

        return (
          <button
            key={dateStr}
            onClick={() => onSelectDate(day)}
            className="flex flex-1 flex-col items-center gap-1 rounded-[14px] py-1.5 transition-all duration-200"
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
                color: active ? "#fff" : "#aaa",
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
                color: active ? "#fff" : today ? "var(--brand-color)" : "#444",
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
  );
}
