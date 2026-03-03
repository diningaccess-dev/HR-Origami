"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useCallback, type FormEvent } from "react";
import { startOfWeek, endOfWeek, addWeeks, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const ROLE_TAGS = [
  { value: "bar", label: "Bar" },
  { value: "kitchen", label: "Küche" },
  { value: "service", label: "Service" },
  { value: "all", label: "Alle" },
] as const;

const ROLE_TAG_LABELS: Record<string, string> = {
  bar: "Bar",
  kitchen: "Küche",
  service: "Service",
  all: "Alle",
};

type StaffMember = {
  id: string;
  full_name: string;
  role: string;
};

type Shift = {
  id: string;
  profile_id: string;
  start_time: string;
  end_time: string;
  role_tag: string | null;
  status: string;
  profiles: { full_name: string } | null;
};

export default function AdminShiftsPage() {
  // ── State ──────────────────────────────────────────────────
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Form state
  const [selectedStaff, setSelectedStaff] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [roleTag, setRoleTag] = useState("service");

  // Tuần hiện tại
  const baseDate = addWeeks(new Date(), weekOffset);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });

  // ── Toast helper ───────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // ── Fetch staff cùng location ──────────────────────────────
  useEffect(() => {
    let ignore = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || ignore) return;

      // Lấy location_id của manager
      supabase
        .from("profiles")
        .select("location_id")
        .eq("id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (!profile?.location_id || ignore) return;

          // Lấy danh sách staff/azubi cùng location
          supabase
            .from("profiles")
            .select("id, full_name, role")
            .eq("location_id", profile.location_id)
            .eq("status", "active")
            .in("role", ["staff", "azubi"])
            .order("full_name")
            .then(({ data }) => {
              if (!ignore) {
                setStaffList(data ?? []);
                if (data && data.length > 0 && !selectedStaff) {
                  setSelectedStaff(data[0].id);
                }
              }
            });
        });
    });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch shifts trong tuần ────────────────────────────────
  const fetchShifts = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("location_id")
      .eq("id", user.id)
      .single();

    if (!profile?.location_id) return;

    const { data } = await supabase
      .from("shifts")
      .select(
        "id, profile_id, start_time, end_time, role_tag, status, profiles(full_name)",
      )
      .eq("location_id", profile.location_id)
      .gte("start_time", weekStart.toISOString())
      .lte("start_time", weekEnd.toISOString())
      .order("start_time", { ascending: true });

    setShifts((data as unknown as Shift[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    setLoading(true);
    fetchShifts();
  }, [fetchShifts]);

  // ── Submit tạo ca ──────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedStaff || !date || !startTime || !endTime) return;

    // Tạo timestamptz từ date + time
    const startDatetime = new Date(`${date}T${startTime}:00`);
    const endDatetime = new Date(`${date}T${endTime}:00`);

    // Validate giờ kết thúc > bắt đầu
    if (endDatetime <= startDatetime) {
      showToast("Giờ kết thúc phải sau giờ bắt đầu");
      return;
    }

    setSubmitting(true);

    // Kiểm tra trùng ca
    const { data: existing } = await supabase
      .from("shifts")
      .select("id")
      .eq("profile_id", selectedStaff)
      .neq("status", "cancelled")
      .lt("start_time", endDatetime.toISOString())
      .gt("end_time", startDatetime.toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      showToast("Nhân viên đã có ca trong khung giờ này");
      setSubmitting(false);
      return;
    }

    // Lấy location_id của manager
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select("location_id")
      .eq("id", user!.id)
      .single();

    const { error } = await supabase.from("shifts").insert({
      location_id: profile?.location_id,
      profile_id: selectedStaff,
      role_tag: roleTag,
      start_time: startDatetime.toISOString(),
      end_time: endDatetime.toISOString(),
      status: "scheduled",
    });

    if (error) {
      showToast("Lỗi khi tạo ca: " + error.message);
    } else {
      showToast("Đã tạo ca thành công");
      fetchShifts();
    }

    setSubmitting(false);
  }

  // ── Hủy ca ─────────────────────────────────────────────────
  async function handleCancel(shiftId: string) {
    const { error } = await supabase
      .from("shifts")
      .update({ status: "cancelled" })
      .eq("id", shiftId);

    if (error) {
      showToast("Lỗi khi hủy ca: " + error.message);
    } else {
      fetchShifts();
    }
  }

  // ── Week label ─────────────────────────────────────────────
  const weekLabel =
    weekOffset === 0
      ? "Tuần này"
      : weekOffset === 1
        ? "Tuần sau"
        : weekOffset === -1
          ? "Tuần trước"
          : `${format(weekStart, "dd.MM")} – ${format(weekEnd, "dd.MM.yyyy")}`;

  return (
    <div className="min-h-dvh bg-background px-4 py-6">
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Quản lý ca</h1>

        {/* ── Toast ──────────────────────────────────────────── */}
        {toast && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              toast.includes("thành công")
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {toast}
          </div>
        )}

        {/* ── Form tạo ca ────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-foreground/10 p-4"
        >
          <p className="text-sm font-medium text-foreground">Tạo ca mới</p>

          {/* Nhân viên */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground/60">
              Nhân viên
            </label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2.5 text-sm text-foreground focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            >
              {staffList.length === 0 && (
                <option value="">Không có nhân viên</option>
              )}
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          {/* Ngày */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground/60">
              Ngày
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2.5 text-sm text-foreground focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          {/* Giờ bắt đầu / kết thúc */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/60">
                Bắt đầu
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2.5 text-sm text-foreground focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/60">
                Kết thúc
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2.5 text-sm text-foreground focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
            </div>
          </div>

          {/* Khu vực */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground/60">
              Khu vực
            </label>
            <select
              value={roleTag}
              onChange={(e) => setRoleTag(e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2.5 text-sm text-foreground focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            >
              {ROLE_TAGS.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || staffList.length === 0}
            className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-color)" }}
          >
            {submitting ? "Đang tạo..." : "Tạo ca"}
          </button>
        </form>

        {/* ── Week nav ───────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
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

        {weekOffset !== 0 && (
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="w-full rounded-lg border border-foreground/10 py-1.5 text-xs text-foreground/50 transition hover:bg-foreground/5"
          >
            Về tuần này
          </button>
        )}

        {/* ── Danh sách ca ───────────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-foreground/10 p-4 space-y-2"
              >
                <div className="h-4 w-32 rounded bg-foreground/10 animate-pulse" />
                <div className="h-3 w-48 rounded bg-foreground/8 animate-pulse" />
              </div>
            ))}
          </div>
        ) : shifts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-foreground/40">
              Không có ca nào trong tuần này
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => {
              const start = parseISO(shift.start_time);
              const end = parseISO(shift.end_time);
              const dayStr = format(start, "EEEE dd.MM", { locale: de });
              const timeStr = `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
              const isCancelled = shift.status === "cancelled";
              const staffName = shift.profiles?.full_name ?? "Không xác định";
              const roleLabel = shift.role_tag
                ? (ROLE_TAG_LABELS[shift.role_tag] ?? shift.role_tag)
                : "";

              return (
                <div
                  key={shift.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                    isCancelled
                      ? "border-foreground/8 opacity-40"
                      : "border-foreground/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-10 w-1 shrink-0 rounded-full"
                      style={{
                        backgroundColor: isCancelled
                          ? undefined
                          : "var(--brand-color)",
                        opacity: isCancelled ? 0.3 : 1,
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {staffName}
                      </p>
                      <p className="text-xs text-foreground/50">
                        <span className="capitalize">{dayStr}</span> · {timeStr}
                      </p>
                      {roleLabel && (
                        <p className="text-xs text-foreground/40">
                          {roleLabel}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isCancelled && (
                    <button
                      type="button"
                      onClick={() => handleCancel(shift.id)}
                      className="shrink-0 rounded-lg px-2.5 py-1 text-xs text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      Hủy
                    </button>
                  )}
                  {isCancelled && (
                    <span className="shrink-0 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] text-foreground/50">
                      Đã hủy
                    </span>
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
