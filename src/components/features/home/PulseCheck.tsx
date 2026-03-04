"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MOODS = [
  { value: 1, emoji: "😴" },
  { value: 2, emoji: "😐" },
  { value: 3, emoji: "🙂" },
  { value: 4, emoji: "😄" },
  { value: 5, emoji: "🤩" },
] as const;

type PulseCheckProps = {
  attendanceId: string;
};

export default function PulseCheck({ attendanceId }: PulseCheckProps) {
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleMood(mood: number) {
    if (saving) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase
        .from("attendances")
        .update({ pulse_mood: mood })
        .eq("id", attendanceId);
      setDismissed(true);
    } catch {
      // Lỗi im lặng — không block UX
    } finally {
      setSaving(false);
    }
  }

  if (dismissed) return null;

  return (
    <div className="px-4 mb-[18px]">
      <h2
        style={{
          fontFamily: "Sora, sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#999",
          marginBottom: 10,
        }}
      >
        Tâm trạng hôm nay?
      </h2>

      <div
        className="flex items-center justify-between rounded-2xl"
        style={{
          padding: "14px 15px",
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 500, color: "#444" }}>
          Bạn cảm thấy thế nào?
        </p>
        <div className="flex gap-1">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => handleMood(m.value)}
              disabled={saving}
              className="transition-transform active:scale-90 disabled:opacity-50"
              style={{ fontSize: 18, lineHeight: 1, padding: "2px" }}
            >
              {m.emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
