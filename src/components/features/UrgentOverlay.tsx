"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useRef } from "react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type UrgentAnnouncement = {
  id: string;
  title: string;
  body: string;
  confirmed_by: string[];
};

/* ══════════════════════════════════════════════════
   UrgentOverlay
   Full-screen lock khi có thông báo khẩn chưa đọc
   Render trong (app)/layout.tsx
   ══════════════════════════════════════════════════ */
export default function UrgentOverlay() {
  const [urgent, setUrgent] = useState<UrgentAnnouncement | null>(null);
  const [userId, setUserId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const initDone = useRef(false);

  /* ── fetch unconfirmed urgent announcements ──── */
  async function fetchUrgent(uid: string) {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, body, confirmed_by")
      .eq("is_urgent", true)
      .order("created_at", { ascending: false });

    if (!data) return;

    // Find first urgent not yet confirmed by this user
    const unconfirmed = data.find(
      (a) => !(a.confirmed_by as string[]).includes(uid),
    );

    setUrgent((unconfirmed as UrgentAnnouncement) ?? null);
  }

  /* ── init ──────────────────────────────────── */
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      await fetchUrgent(user.id);
    })();
  }, []);

  /* ── realtime: listen for new announcements ──── */
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("urgent-overlay")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => {
          fetchUrgent(userId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  /* ── confirm read ────────────────────────────── */
  async function handleConfirm() {
    if (!urgent || confirming) return;
    setConfirming(true);

    const updatedConfirmed = [...urgent.confirmed_by, userId];

    const { error } = await supabase
      .from("announcements")
      .update({ confirmed_by: updatedConfirmed })
      .eq("id", urgent.id);

    if (!error) {
      // Check if there are more unconfirmed urgent announcements
      await fetchUrgent(userId);
    }

    setConfirming(false);
  }

  /* ── nothing to show ─────────────────────────── */
  if (!urgent) return null;

  /* ── full-screen overlay ─────────────────────── */
  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-red-600 p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* warning icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
          <svg
            className="h-10 w-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* label */}
        <p className="text-sm font-bold uppercase tracking-widest text-white/70">
          Thông báo khẩn cấp
        </p>

        {/* title */}
        <h1 className="text-2xl font-bold text-white">{urgent.title}</h1>

        {/* body */}
        <p className="whitespace-pre-wrap text-base leading-relaxed text-white/90">
          {urgent.body}
        </p>

        {/* confirm button */}
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="mt-4 w-full rounded-2xl bg-white py-4 text-base font-bold text-red-600 shadow-lg transition-opacity disabled:opacity-60 active:opacity-90"
        >
          {confirming ? "Đang xác nhận..." : "Đã đọc ✓"}
        </button>
      </div>
    </div>
  );
}
