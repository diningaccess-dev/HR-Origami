"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/* ── Types ─────────────────────────────────────── */
type LeaderEntry = {
  profile_id: string;
  full_name: string;
  avatar_url: string | null;
  total_xp: number;
};

/* ── XP Badges ─────────────────────────────────── */
function getBadge(xp: number): { label: string; stars: string } {
  if (xp >= 600) return { label: "Chuyên gia", stars: "👑" };
  if (xp >= 300) return { label: "Chuyên nghiệp", stars: "⭐⭐⭐" };
  if (xp >= 100) return { label: "Học viên", stars: "⭐⭐" };
  return { label: "Tân binh", stars: "⭐" };
}

const PODIUM_MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_COLORS = [
  { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" },
  { bg: "#F3F4F6", border: "#9CA3AF", text: "#374151" },
  { bg: "#FED7AA", border: "#EA580C", text: "#7C2D12" },
];

/* ══════════════════════════════════════════════════
   LeaderboardPage
   ══════════════════════════════════════════════════ */
export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [myEntry, setMyEntry] = useState<LeaderEntry | null>(null);
  const [myRank, setMyRank] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);

  const initRef = useRef(false);

  function flash(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* ── Fetch leaderboard ───────────────────────── */
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("location_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      // Lấy tất cả profiles của location
      const { data: locationProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("location_id", profile.location_id);

      if (!locationProfiles || locationProfiles.length === 0) return;

      const profileIds = locationProfiles.map((p) => p.id);

      // Lấy xp_transactions
      const { data: xpData } = await supabase
        .from("xp_transactions")
        .select("profile_id, amount")
        .in("profile_id", profileIds);

      // Tính tổng XP mỗi người
      const xpMap: Record<string, number> = {};
      (xpData ?? []).forEach((t) => {
        xpMap[t.profile_id] = (xpMap[t.profile_id] ?? 0) + t.amount;
      });

      // Ghép data + sort
      const leaderboard: LeaderEntry[] = locationProfiles
        .map((p) => ({
          profile_id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          total_xp: xpMap[p.id] ?? 0,
        }))
        .sort((a, b) => b.total_xp - a.total_xp);

      setEntries(leaderboard);

      // Tìm rank của mình
      const myIdx = leaderboard.findIndex((e) => e.profile_id === user.id);
      if (myIdx >= 0) {
        setMyEntry(leaderboard[myIdx]);
        setMyRank(myIdx + 1);
      }
    } catch {
      flash("Không thể tải bảng xếp hạng", "err");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchData();
  }, [fetchData]);

  /* ── Loading skeleton ────────────────────────── */
  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        <div className="h-7 w-40 animate-pulse rounded-lg bg-foreground/10" />
        {/* Podium skeleton */}
        <div className="flex items-end justify-center gap-3 py-4">
          <div className="h-28 w-20 animate-pulse rounded-xl bg-foreground/10" />
          <div className="h-36 w-24 animate-pulse rounded-xl bg-foreground/10" />
          <div className="h-24 w-20 animate-pulse rounded-xl bg-foreground/10" />
        </div>
        {/* List skeleton */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
            <div className="h-5 w-5 rounded bg-foreground/10" />
            <div className="h-9 w-9 rounded-full bg-foreground/10" />
            <div className="flex-1 h-4 rounded bg-foreground/10" />
            <div className="h-4 w-12 rounded bg-foreground/10" />
          </div>
        ))}
      </div>
    );
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3, 10);
  const hasXp = entries.some((e) => e.total_xp > 0);

  /* ── Empty state ─────────────────────────────── */
  if (!hasXp) {
    return (
      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        <Header onRefresh={() => fetchData(true)} refreshing={refreshing} />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-sm text-muted-foreground">
            Chưa ai tích lũy XP. Hãy là người đầu tiên!
          </p>
        </div>
      </div>
    );
  }

  // Sắp xếp podium: [1st giữa, 2nd trái, 3rd phải] → hiển thị: 2nd | 1st | 3rd
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumIndexMap = top3.length >= 3 ? [1, 0, 2] : top3.map((_, i) => i);

  /* ── Main ────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-6">
      <Header onRefresh={() => fetchData(true)} refreshing={refreshing} />

      {/* ── Podium ── */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-3 py-4">
          {podiumOrder.map((entry, i) => {
            const realRank = podiumIndexMap[i];
            const colors = PODIUM_COLORS[realRank];
            const isFirst = realRank === 0;

            return (
              <div
                key={entry.profile_id}
                className={`flex flex-col items-center rounded-2xl border-2 px-3 py-4 ${
                  isFirst ? "w-28" : "w-24"
                }`}
                style={{
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  minHeight: isFirst
                    ? "10rem"
                    : realRank === 1
                      ? "8.5rem"
                      : "7.5rem",
                }}
              >
                <span className="text-2xl mb-1">{PODIUM_MEDALS[realRank]}</span>

                {/* Avatar */}
                <div
                  className={`rounded-full bg-white border-2 flex items-center justify-center text-sm font-bold ${
                    isFirst ? "h-14 w-14" : "h-11 w-11"
                  }`}
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  {entry.avatar_url ? (
                    <Image
                      src={entry.avatar_url}
                      alt=""
                      width={56}
                      height={56}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    entry.full_name.charAt(0).toUpperCase()
                  )}
                </div>

                <p
                  className="text-xs font-semibold mt-2 text-center line-clamp-1"
                  style={{ color: colors.text }}
                >
                  {entry.full_name.split(" ").slice(-1)[0]}
                </p>
                <p
                  className="text-[10px] font-bold mt-0.5"
                  style={{ color: colors.text }}
                >
                  {entry.total_xp} XP
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Danh sách 4–10 ── */}
      {rest.length > 0 && (
        <div className="space-y-1">
          {rest.map((entry, i) => {
            const rank = i + 4;
            const badge = getBadge(entry.total_xp);
            const isMe = myEntry?.profile_id === entry.profile_id;

            return (
              <div
                key={entry.profile_id}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
                  isMe ? "border-2" : ""
                }`}
                style={
                  isMe
                    ? {
                        borderColor: "var(--brand-color)",
                        backgroundColor: "var(--brand-color)08",
                      }
                    : undefined
                }
              >
                <span className="w-6 text-center text-xs font-bold text-muted-foreground">
                  {rank}
                </span>

                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-xs font-bold text-foreground">
                  {entry.avatar_url ? (
                    <Image
                      src={entry.avatar_url}
                      alt=""
                      width={36}
                      height={36}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    entry.full_name.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {entry.full_name}
                    {isMe && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (bạn)
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {badge.stars} {badge.label}
                  </p>
                </div>

                <span className="text-xs font-bold text-foreground shrink-0">
                  {entry.total_xp} XP
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Row của mình (nếu không trong top 10) ── */}
      {myEntry && myRank > 10 && (
        <>
          <div className="flex items-center gap-2 px-3">
            <div className="flex-1 border-t border-dashed border-border" />
            <span className="text-[10px] text-muted-foreground">Bạn</span>
            <div className="flex-1 border-t border-dashed border-border" />
          </div>

          <div
            className="flex items-center gap-3 rounded-xl border-2 px-3 py-3"
            style={{
              borderColor: "var(--brand-color)",
              backgroundColor: "var(--brand-color)08",
            }}
          >
            <span className="w-6 text-center text-xs font-bold text-muted-foreground">
              {myRank}
            </span>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-xs font-bold text-foreground">
              {myEntry.avatar_url ? (
                <Image
                  src={myEntry.avatar_url}
                  alt=""
                  width={36}
                  height={36}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                myEntry.full_name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {myEntry.full_name}{" "}
                <span className="text-xs text-muted-foreground">(bạn)</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {getBadge(myEntry.total_xp).stars}{" "}
                {getBadge(myEntry.total_xp).label}
              </p>
            </div>

            <span className="text-xs font-bold text-foreground shrink-0">
              {myEntry.total_xp} XP
            </span>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2.5 text-xs font-medium text-white shadow-lg ${
            toast.type === "ok" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ── Header component ──────────────────────────── */
function Header({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-foreground">🏆 Bảng xếp hạng</h1>
        <p className="text-xs text-muted-foreground">XP tích lũy trong quán</p>
      </div>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="flex h-9 w-9 items-center justify-center rounded-full active:bg-foreground/5 disabled:opacity-50"
      >
        <svg
          className={`h-5 w-5 text-muted-foreground ${refreshing ? "animate-spin" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
          />
        </svg>
      </button>
    </div>
  );
}
