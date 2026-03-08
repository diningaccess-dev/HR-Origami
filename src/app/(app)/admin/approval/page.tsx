"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useCallback } from "react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Danh sách role và location cố định
const ROLES = [
  { value: "staff", label: "Staff" },
  { value: "azubi", label: "Azubi" },
  { value: "manager", label: "Manager" },
] as const;

const LOCATIONS = [
  { value: "enso", label: "Enso" },
  { value: "origami", label: "Origami" },
  { value: "okyu", label: "Okyu" },
] as const;

type PendingProfile = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

export default function ApprovalPage() {
  const [profiles, setProfiles] = useState<PendingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // State cho mỗi card: role + location đã chọn
  const [selections, setSelections] = useState<
    Record<string, { role: string; locationId: string }>
  >({});

  // ── Fetch danh sách pending ────────────────────────────────
  const fetchPending = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    setProfiles(data ?? []);
    setLoading(false);
  }, []);

  // Fetch lần đầu + realtime subscription
  useEffect(() => {
    let ignore = false;

    supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!ignore) {
          setProfiles(data ?? []);
          setLoading(false);
        }
      });

    // Realtime: tự cập nhật khi có thay đổi ở profiles
    const channel = supabase
      .channel("pending-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchPending();
        },
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [fetchPending]);

  // ── Cập nhật selection cho 1 profile ───────────────────────
  function updateSelection(
    profileId: string,
    field: "role" | "locationId",
    value: string,
  ) {
    setSelections((prev) => ({
      ...prev,
      [profileId]: {
        role: prev[profileId]?.role ?? "staff",
        locationId: prev[profileId]?.locationId ?? "enso",
        [field]: value,
      },
    }));
  }

  // ── Duyệt tài khoản ───────────────────────────────────────
  async function handleApprove(profileId: string) {
    const sel = selections[profileId] ?? {
      role: "staff",
      locationId: "enso",
    };

    if ("vibrate" in navigator) navigator.vibrate(8);
    setActionLoading(profileId);
    const { error } = await supabase
      .from("profiles")
      .update({
        role: sel.role,
        location_id: sel.locationId,
        status: "active",
      })
      .eq("id", profileId);

    if (error) {
      alert("Lỗi khi duyệt: " + error.message);
    }
    setActionLoading(null);
    // Realtime sẽ tự cập nhật danh sách, nhưng xóa ngay cho mượt
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
  }

  // ── Từ chối tài khoản ──────────────────────────────────────
  async function handleReject(profileId: string) {
    if ("vibrate" in navigator) navigator.vibrate(8);
    setActionLoading(profileId);
    const { error } = await supabase
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", profileId);

    if (error) {
      alert("Lỗi khi từ chối: " + error.message);
    }
    setActionLoading(null);
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
  }

  // ── Format ngày ────────────────────────────────────────────
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-foreground/50">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Đang tải...
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────
  if (profiles.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-foreground/5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground/30"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <p className="text-sm text-foreground/50">
            Không có tài khoản chờ duyệt
          </p>
        </div>
      </div>
    );
  }

  // ── Danh sách ──────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-background px-4 py-6">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Duyệt tài khoản
          </h1>
          <p className="mt-1 text-sm text-foreground/50">
            {profiles.length} tài khoản đang chờ
          </p>
        </div>

        {profiles.map((profile) => {
          const sel = selections[profile.id] ?? {
            role: "staff",
            locationId: "enso",
          };
          const isProcessing = actionLoading === profile.id;

          return (
            <div
              key={profile.id}
              className="rounded-xl border border-foreground/10 bg-background p-4 space-y-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
            >
              {/* ── Thông tin user ───────────────────────────── */}
              <div>
                <p className="font-medium text-foreground">
                  {profile.full_name}
                </p>
                <p className="text-sm text-foreground/50">{profile.email}</p>
                <p className="mt-1 text-xs text-foreground/30">
                  Đăng ký: {formatDate(profile.created_at)}
                </p>
              </div>

              {/* ── Chọn Role + Location ─────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground/60">
                    Role
                  </label>
                  <select
                    value={sel.role}
                    onChange={(e) =>
                      updateSelection(profile.id, "role", e.target.value)
                    }
                    disabled={isProcessing}
                    className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground/60">
                    Location
                  </label>
                  <select
                    value={sel.locationId}
                    onChange={(e) =>
                      updateSelection(profile.id, "locationId", e.target.value)
                    }
                    disabled={isProcessing}
                    className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  >
                    {LOCATIONS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Nút hành động ────────────────────────────── */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleApprove(profile.id)}
                  disabled={isProcessing}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all duration-100 hover:bg-emerald-700 active:scale-[0.97] disabled:opacity-50"
                >
                  {isProcessing ? "Đang xử lý..." : "Duyệt"}
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(profile.id)}
                  disabled={isProcessing}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-100 hover:bg-red-700 active:scale-[0.97] disabled:opacity-50"
                >
                  Từ chối
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
