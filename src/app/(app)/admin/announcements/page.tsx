"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/* ── Types ─────────────────────────────────────── */
type Announcement = {
  id: string;
  location_id: string;
  title: string;
  body: string;
  is_urgent: boolean;
  confirmed_by: string[];
  created_by: string;
  created_at: string;
};

/* ══════════════════════════════════════════════════
   AnnouncementsPage — Manager tạo, Staff xem
   ══════════════════════════════════════════════════ */
export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [locationId, setLocationId] = useState("");

  /* ── form state (manager only) ───────────────── */
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);

  const initDone = useRef(false);

  /* ── helpers ─────────────────────────────────── */
  function flash(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* ── fetch announcements ─────────────────────── */
  const fetchAnnouncements = useCallback(async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    setAnnouncements((data ?? []) as Announcement[]);
  }, []);

  /* ── init ────────────────────────────────────── */
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, location_id")
        .eq("id", user.id)
        .single();

      setUserRole(profile?.role ?? "staff");
      setLocationId(profile?.location_id ?? "");

      await fetchAnnouncements();
      setLoading(false);
    })();
  }, [fetchAnnouncements]);

  /* ── realtime ────────────────────────────────── */
  useEffect(() => {
    const channel = supabase
      .channel("announcements-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => {
          fetchAnnouncements();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAnnouncements]);

  /* ── create announcement ─────────────────────── */
  async function handleCreate() {
    if (!title.trim() || !body.trim() || submitting) return;
    setSubmitting(true);

    const { error } = await supabase.from("announcements").insert({
      location_id: locationId,
      title: title.trim(),
      body: body.trim(),
      is_urgent: isUrgent,
      created_by: userId,
    });

    if (error) {
      flash("Không thể tạo thông báo. Thử lại.", "err");
    } else {
      flash("Đã tạo thông báo!", "ok");
      setTitle("");
      setBody("");
      setIsUrgent(false);
      setShowForm(false);
      await fetchAnnouncements();
    }

    setSubmitting(false);
  }

  /* ── confirm read ────────────────────────────── */
  async function confirmRead(announcement: Announcement) {
    if (confirming) return;
    setConfirming(announcement.id);

    const updatedConfirmed = [...announcement.confirmed_by, userId];

    const { error } = await supabase
      .from("announcements")
      .update({ confirmed_by: updatedConfirmed })
      .eq("id", announcement.id);

    if (error) {
      flash("Lỗi xác nhận. Thử lại.", "err");
    }

    setConfirming(null);
  }

  const isManager = userRole === "manager" || userRole === "owner";

  /* ── loading ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-[3px] border-current border-t-transparent"
          style={{ color: "var(--brand-color)" }}
        />
      </div>
    );
  }

  /* ── render ──────────────────────────────────── */
  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-5">
      {/* ── header ────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Thông báo</h1>

        {isManager && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity active:opacity-80"
            style={{ backgroundColor: "var(--brand-color)" }}
          >
            {showForm ? "Đóng" : "+ Tạo mới"}
          </button>
        )}
      </div>

      {/* ── create form (manager) ─────────────── */}
      {isManager && showForm && (
        <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
          <input
            type="text"
            placeholder="Tiêu đề..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2"
            style={
              {
                "--tw-ring-color": "var(--brand-color)",
              } as React.CSSProperties
            }
          />

          <textarea
            placeholder="Nội dung thông báo..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2"
            style={
              {
                "--tw-ring-color": "var(--brand-color)",
              } as React.CSSProperties
            }
          />

          {/* urgent toggle */}
          <button
            type="button"
            onClick={() => setIsUrgent(!isUrgent)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              isUrgent
                ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                : "bg-foreground/5 text-muted-foreground"
            }`}
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
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            {isUrgent ? "Khẩn cấp — BẬT" : "Đánh dấu khẩn cấp"}
          </button>

          <button
            disabled={!title.trim() || !body.trim() || submitting}
            onClick={handleCreate}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40 active:opacity-80"
            style={{ backgroundColor: "var(--brand-color)" }}
          >
            {submitting ? "Đang tạo..." : "Gửi thông báo"}
          </button>
        </div>
      )}

      {/* ── empty state ───────────────────────── */}
      {announcements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg
            className="mb-3 h-12 w-12 text-muted-foreground/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          <p className="text-sm text-muted-foreground">Chưa có thông báo nào</p>
        </div>
      )}

      {/* ── announcement list ─────────────────── */}
      <div className="space-y-3">
        {announcements.map((a) => {
          const isConfirmed = a.confirmed_by.includes(userId);
          const confirmCount = a.confirmed_by.length;

          return (
            <div
              key={a.id}
              className={`rounded-2xl border p-4 space-y-3 ${
                a.is_urgent
                  ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                  : "border-border bg-background"
              }`}
            >
              {/* badge + date */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {a.is_urgent && (
                    <span className="rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                      KHẨN
                    </span>
                  )}
                  <h3
                    className={`text-sm font-bold ${
                      a.is_urgent
                        ? "text-red-800 dark:text-red-300"
                        : "text-foreground"
                    }`}
                  >
                    {a.title}
                  </h3>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {format(new Date(a.created_at), "dd.MM HH:mm")}
                </span>
              </div>

              {/* body */}
              <p
                className={`text-sm whitespace-pre-wrap ${
                  a.is_urgent
                    ? "text-red-700 dark:text-red-400/80"
                    : "text-muted-foreground"
                }`}
              >
                {a.body}
              </p>

              {/* confirm / status */}
              <div className="flex items-center justify-between">
                {isConfirmed ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Đã xác nhận
                  </span>
                ) : (
                  <button
                    onClick={() => confirmRead(a)}
                    disabled={confirming === a.id}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50 active:opacity-80"
                    style={{ backgroundColor: "var(--brand-color)" }}
                  >
                    {confirming === a.id ? "..." : "Đã đọc ✓"}
                  </button>
                )}

                {isManager && (
                  <span className="text-xs text-muted-foreground">
                    {confirmCount} đã xác nhận
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── toast ─────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-lg ${
            toast.type === "ok" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
