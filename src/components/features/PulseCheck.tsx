"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const MOODS = [
  { value: 1, emoji: "😞", label: "Tệ" },
  { value: 2, emoji: "😕", label: "Không tốt" },
  { value: 3, emoji: "😐", label: "Bình thường" },
  { value: 4, emoji: "🙂", label: "Tốt" },
  { value: 5, emoji: "😄", label: "Tuyệt vời" },
] as const;

type PulseCheckProps = {
  attendanceId: string;
  onDismiss: () => void;
};

export default function PulseCheck({
  attendanceId,
  onDismiss,
}: PulseCheckProps) {
  async function handleMood(mood: number) {
    await supabase
      .from("attendances")
      .update({ pulse_mood: mood })
      .eq("id", attendanceId);

    onDismiss();
  }

  return (
    /* backdrop */
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8 sm:items-center sm:pb-0">
      {/* modal */}
      <div className="w-full max-w-sm space-y-5 rounded-3xl bg-background p-6 shadow-xl">
        {/* header */}
        <div className="space-y-1 text-center">
          <p className="text-2xl">✨</p>
          <h2 className="text-base font-bold text-foreground">
            Ca làm kết thúc!
          </h2>
          <p className="text-sm text-muted-foreground">
            Hôm nay bạn cảm thấy thế nào?
          </p>
        </div>

        {/* mood selector */}
        <div className="flex items-end justify-between gap-1">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => handleMood(m.value)}
              className="flex flex-1 flex-col items-center gap-1 rounded-2xl py-3 transition-colors active:bg-foreground/5"
            >
              <span className="text-3xl leading-none">{m.emoji}</span>
              <span className="text-[10px] text-muted-foreground">
                {m.label}
              </span>
            </button>
          ))}
        </div>

        {/* skip */}
        <button
          onClick={onDismiss}
          className="w-full py-2 text-sm text-muted-foreground transition-colors active:text-foreground"
        >
          Bỏ qua
        </button>
      </div>
    </div>
  );
}
