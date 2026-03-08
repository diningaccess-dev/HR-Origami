"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/* ── Types ─────────────────────────────────────── */
type CompletedItem = {
  index: number;
  done_by: string;
  done_by_name: string;
  done_at: string;
};

type Template = {
  id: string;
  name: string;
  type: string;
  items: string[];
};

type Run = {
  id: string;
  template_id: string;
  date: string;
  completed_items: CompletedItem[];
  progress: number;
};

/* ══════════════════════════════════════════════════
   ChecklistPage
   ══════════════════════════════════════════════════ */
export default function ChecklistPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [runs, setRuns] = useState<Record<string, Run>>({});
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [toggling, setToggling] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);

  const today = useRef(format(new Date(), "yyyy-MM-dd"));

  /* ── helpers ─────────────────────────────────── */
  function flash(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* ── fetch user ──────────────────────────────── */
  const fetchUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    setUserName(profile?.full_name ?? "");
  }, []);

  /* ── fetch templates + runs ──────────────────── */
  const fetchData = useCallback(async () => {
    // 1) fetch templates for user's location
    const { data: tpls } = await supabase
      .from("checklist_templates")
      .select("id, name, type, items, assigned_to")
      .order("type", { ascending: true });

    if (!tpls || tpls.length === 0) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    // Lọc: chỉ hiện template được gán cho user (hoặc chưa gán ai = tất cả thấy)
    const filtered = tpls.filter((t) => {
      const assigned = (t as Record<string, unknown>).assigned_to as
        | string[]
        | null;
      if (!assigned || assigned.length === 0) return true;
      return assigned.includes(userId);
    });

    if (filtered.length === 0 && userId) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    setTemplates(filtered as Template[]);

    // 2) fetch today's runs for these templates
    const templateIds = filtered.map((t) => t.id);
    const { data: existingRuns } = await supabase
      .from("checklist_runs")
      .select("id, template_id, date, completed_items, progress")
      .in("template_id", templateIds)
      .eq("date", today.current);

    // 3) create missing runs for today
    const existingMap: Record<string, Run> = {};
    for (const r of existingRuns ?? []) {
      existingMap[r.template_id] = r as Run;
    }

    const missingTemplates = filtered.filter((t) => !existingMap[t.id]);
    if (missingTemplates.length > 0) {
      const newRuns = missingTemplates.map((t) => ({
        template_id: t.id,
        date: today.current,
        completed_items: [],
        progress: 0,
      }));

      const { data: inserted } = await supabase
        .from("checklist_runs")
        .insert(newRuns)
        .select("id, template_id, date, completed_items, progress");

      for (const r of inserted ?? []) {
        existingMap[r.template_id] = r as Run;
      }
    }

    setRuns(existingMap);

    // default tab
    if (!activeTab && filtered.length > 0) {
      setActiveTab(filtered[0].id);
    }

    setLoading(false);
  }, [activeTab, userId]);

  /* ── init ────────────────────────────────────── */
  useEffect(() => {
    fetchUser();
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── realtime subscription ───────────────────── */
  useEffect(() => {
    const channel = supabase
      .channel("checklist-runs-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "checklist_runs",
        },
        (payload) => {
          const updated = payload.new as Run;
          // Only update if it's a run for today
          if (updated.date === today.current) {
            setRuns((prev) => ({
              ...prev,
              [updated.template_id]: updated,
            }));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ── toggle item ─────────────────────────────── */
  async function toggleItem(templateId: string, itemIndex: number) {
    const run = runs[templateId];
    if (!run || toggling !== null) return;

    setToggling(itemIndex);

    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const totalItems = template.items.length;
    const currentCompleted: CompletedItem[] = [...run.completed_items];
    const existingIdx = currentCompleted.findIndex(
      (c) => c.index === itemIndex,
    );

    if (existingIdx >= 0) {
      // untick
      currentCompleted.splice(existingIdx, 1);
    } else {
      // tick
      currentCompleted.push({
        index: itemIndex,
        done_by: userId,
        done_by_name: userName,
        done_at: new Date().toISOString(),
      });
    }

    const newProgress = Math.round(
      (currentCompleted.length / totalItems) * 100,
    );

    // Optimistic update
    setRuns((prev) => ({
      ...prev,
      [templateId]: {
        ...run,
        completed_items: currentCompleted,
        progress: newProgress,
      },
    }));

    const { error } = await supabase
      .from("checklist_runs")
      .update({
        completed_items: currentCompleted,
        progress: newProgress,
      })
      .eq("id", run.id);

    if (error) {
      // Revert
      setRuns((prev) => ({
        ...prev,
        [templateId]: run,
      }));
      flash("Không thể cập nhật. Thử lại.", "err");
    }

    setToggling(null);
  }

  /* ── loading state ───────────────────────────── */
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

  /* ── empty state ─────────────────────────────── */
  if (templates.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
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
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75"
          />
        </svg>
        <p className="text-sm text-muted-foreground">
          Chưa có checklist nào cho quán này
        </p>
      </div>
    );
  }

  /* ── active template + run ───────────────────── */
  const currentTemplate =
    templates.find((t) => t.id === activeTab) ?? templates[0];
  const currentRun = runs[currentTemplate.id];
  const completedMap = new Map(
    (currentRun?.completed_items ?? []).map((c) => [c.index, c]),
  );
  const progress = currentRun?.progress ?? 0;

  /* ── render ──────────────────────────────────── */
  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-5">
      {/* ── header ────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Checklist</h1>
        <span className="text-xs text-muted-foreground">
          {format(new Date(), "dd.MM.yyyy")}
        </span>
      </div>

      {/* ── tabs: open / close / custom ───────── */}
      <div className="flex gap-2">
        {templates.map((tpl) => {
          const isActive = tpl.id === currentTemplate.id;
          const tplRun = runs[tpl.id];
          const tplProgress = tplRun?.progress ?? 0;

          return (
            <button
              key={tpl.id}
              onClick={() => setActiveTab(tpl.id)}
              className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "text-white"
                  : "bg-foreground/5 text-muted-foreground"
              }`}
              style={
                isActive ? { backgroundColor: "var(--brand-color)" } : undefined
              }
            >
              <div>{tpl.name}</div>
              <div
                className={`text-xs mt-0.5 ${isActive ? "text-white/70" : "text-muted-foreground/60"}`}
              >
                {tplProgress}%
              </div>
            </button>
          );
        })}
      </div>

      {/* ── progress bar ──────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Tiến độ</span>
          <span className="font-bold" style={{ color: "var(--brand-color)" }}>
            {progress}%
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: "var(--brand-color)",
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {completedMap.size} / {currentTemplate.items.length} mục hoàn thành
        </p>
      </div>

      {/* ── checklist items ───────────────────── */}
      <div className="space-y-2">
        {currentTemplate.items.map((item, idx) => {
          const completed = completedMap.get(idx);
          const isDone = !!completed;

          return (
            <button
              key={idx}
              onClick={() => toggleItem(currentTemplate.id, idx)}
              disabled={toggling !== null}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                isDone
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                  : "border-border bg-background active:bg-foreground/5"
              }`}
            >
              {/* checkbox */}
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                  isDone
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-muted-foreground/30"
                }`}
              >
                {isDone && (
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>

              {/* content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    isDone
                      ? "text-emerald-700 line-through dark:text-emerald-400"
                      : "text-foreground"
                  }`}
                >
                  {item}
                </p>
                {completed && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {completed.done_by_name} ·{" "}
                    {format(new Date(completed.done_at), "HH:mm")}
                  </p>
                )}
              </div>

              {/* spinner while toggling this item */}
              {toggling === idx && (
                <div
                  className="mt-0.5 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  style={{ color: "var(--brand-color)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── 100% complete banner ──────────────── */}
      {progress === 100 && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
            <svg
              className="h-5 w-5 text-white"
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
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Hoàn thành!
            </p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60">
              Tất cả mục đã được kiểm tra
            </p>
          </div>
        </div>
      )}

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
