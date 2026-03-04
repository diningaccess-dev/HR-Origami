"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useLocation } from "@/lib/hooks/useLocation";
import { haversineDistance } from "@/lib/utils/geo";
import PulseCheck from "@/components/features/PulseCheck";
import FloatToast from "@/components/ui/FloatToast";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const GEOFENCE_RADIUS = 100; // mét

type ShiftInfo = {
  id: string;
  start_time: string;
  end_time: string;
  role_tag: string | null;
};

type AttendanceInfo = {
  id: string;
  checkin_at: string | null;
  checkout_at: string | null;
};

type LocationInfo = {
  lat: number;
  lng: number;
  geofence_radius: number;
  name: string;
};

export default function CheckinPage() {
  const gps = useLocation();

  const [shift, setShift] = useState<ShiftInfo | null>(null);
  const [attendance, setAttendance] = useState<AttendanceInfo | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);
  const [showPulseCheck, setShowPulseCheck] = useState(false);
  const [now, setNow] = useState(new Date());

  // Cập nhật đồng hồ mỗi giây (cho countdown)
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Fetch ca hôm nay + attendance + location info ──────────
  useEffect(() => {
    let ignore = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || ignore) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("location_id")
        .eq("id", user.id)
        .single();

      if (!p?.location_id || ignore) {
        setLoading(false);
        return;
      }

      const { data: loc } = await supabase
        .from("locations")
        .select("lat, lng, geofence_radius, name")
        .eq("id", p.location_id)
        .single();

      if (loc && !ignore) {
        setLocationInfo({
          lat: loc.lat,
          lng: loc.lng,
          geofence_radius: loc.geofence_radius ?? GEOFENCE_RADIUS,
          name: loc.name,
        });
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data: shifts } = await supabase
        .from("shifts")
        .select("id, start_time, end_time, role_tag")
        .eq("profile_id", user.id)
        .neq("status", "cancelled")
        .gte("start_time", todayStart.toISOString())
        .lte("start_time", todayEnd.toISOString())
        .order("start_time", { ascending: true })
        .limit(1);

      if (shifts && shifts.length > 0 && !ignore) {
        const todayShift = shifts[0];
        setShift(todayShift);

        const { data: att } = await supabase
          .from("attendances")
          .select("id, checkin_at, checkout_at")
          .eq("shift_id", todayShift.id)
          .eq("profile_id", user.id)
          .limit(1);

        if (att && att.length > 0 && !ignore) {
          setAttendance(att[0]);
        }
      }

      if (!ignore) setLoading(false);
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // ── Tính khoảng cách ──────────────────────────────────────
  const distance =
    gps.lat != null && gps.lng != null && locationInfo
      ? haversineDistance(gps.lat, gps.lng, locationInfo.lat, locationInfo.lng)
      : null;

  const radius = locationInfo?.geofence_radius ?? GEOFENCE_RADIUS;
  const isWithinRange = distance != null && distance <= radius;
  const hasCheckedIn = attendance?.checkin_at != null;
  const hasCheckedOut = attendance?.checkout_at != null;

  // ── Check-in ──────────────────────────────────────────────
  async function handleCheckin() {
    if (!shift || !gps.lat || !gps.lng) return;

    setActionLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("attendances")
      .insert({
        shift_id: shift.id,
        profile_id: user.id,
        checkin_at: new Date().toISOString(),
        checkin_lat: gps.lat,
        checkin_lng: gps.lng,
        is_valid_location: isWithinRange,
      })
      .select("id, checkin_at, checkout_at")
      .single();

    if (error) {
      showToast("Lỗi check-in: " + error.message, "err");
    } else if (data) {
      setAttendance(data);
      showToast("Check-in thành công!");
    }

    setActionLoading(false);
  }

  // ── Check-out ─────────────────────────────────────────────
  async function handleCheckout() {
    if (!attendance) return;

    setActionLoading(true);

    const { data, error } = await supabase
      .from("attendances")
      .update({ checkout_at: new Date().toISOString() })
      .eq("id", attendance.id)
      .select("id, checkin_at, checkout_at")
      .single();

    if (error) {
      showToast("Lỗi check-out: " + error.message, "err");
    } else if (data) {
      setAttendance(data);
      showToast("Check-out thành công!", "ok");
      setShowPulseCheck(true);
    }

    setActionLoading(false);
  }

  // ── Tính thời gian làm việc ────────────────────────────────
  function getWorkDuration(): string {
    if (!attendance?.checkin_at) return "00:00:00";
    const checkinTime = new Date(attendance.checkin_at);
    const end = attendance.checkout_at ? new Date(attendance.checkout_at) : now;
    const diff = Math.max(0, end.getTime() - checkinTime.getTime());
    const hrs = Math.floor(diff / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    const secs = Math.floor((diff % 60_000) / 1000);
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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

  // ── Không có ca ────────────────────────────────────────────
  if (!shift) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-foreground/5">
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
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
          </div>
          <p className="text-sm text-foreground/50">Bạn không có ca hôm nay</p>
        </div>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-dvh bg-background px-4 py-6">
        <div className="mx-auto max-w-sm space-y-6">
          <h1 className="text-xl font-semibold text-foreground">Check-in</h1>

          {/* ── Toast ────────────────────────────────────────── */}
          {toast && <FloatToast message={toast.msg} type={toast.type} />}

          {/* ── Thông tin ca ─────────────────────────────────── */}
          <div className="rounded-xl border border-foreground/10 p-4 space-y-2">
            <p className="text-xs text-foreground/40">Ca hôm nay</p>
            <p className="text-lg font-semibold text-foreground">
              {format(new Date(shift.start_time), "HH:mm")} –{" "}
              {format(new Date(shift.end_time), "HH:mm")}
            </p>
            {shift.role_tag && (
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: "var(--brand-color)" }}
              >
                {shift.role_tag === "bar"
                  ? "Bar"
                  : shift.role_tag === "kitchen"
                    ? "Küche"
                    : shift.role_tag === "service"
                      ? "Service"
                      : "Alle"}
              </span>
            )}
          </div>

          {/* ── GPS Status ───────────────────────────────────── */}
          <div className="rounded-xl border border-foreground/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-foreground/40">Vị trí GPS</p>
              {gps.loading ? (
                <span className="flex items-center gap-1.5 text-xs text-foreground/40">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  Đang tìm...
                </span>
              ) : gps.error ? (
                <span className="flex items-center gap-1.5 text-xs text-red-500">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Lỗi
                </span>
              ) : isWithinRange ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Trong phạm vi
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-amber-600">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Ngoài phạm vi
                </span>
              )}
            </div>

            {/* GPS error message */}
            {gps.error && <p className="text-sm text-red-500">{gps.error}</p>}

            {/* Khoảng cách */}
            {distance != null && locationInfo && (
              <div className="space-y-1">
                <p className="text-sm text-foreground">
                  Cách <span className="font-medium">{locationInfo.name}</span>:{" "}
                  <span
                    className="font-semibold"
                    style={{
                      color: isWithinRange ? "var(--brand-color)" : undefined,
                    }}
                  >
                    {distance < 1000
                      ? `${Math.round(distance)}m`
                      : `${(distance / 1000).toFixed(1)}km`}
                  </span>
                </p>
                {!isWithinRange && (
                  <p className="text-xs text-foreground/40">
                    Cần đến gần hơn {Math.round(distance - radius)}m nữa
                  </p>
                )}
                {/* Thanh tiến trình trực quan */}
                <div className="h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (radius / Math.max(distance, 1)) * 100)}%`,
                      backgroundColor: isWithinRange
                        ? "var(--brand-color)"
                        : "#f59e0b",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Thời gian làm việc (sau check-in) ──────────── */}
          {hasCheckedIn && (
            <div className="rounded-xl border border-foreground/10 p-4 text-center space-y-1">
              <p className="text-xs text-foreground/40">
                {hasCheckedOut ? "Tổng thời gian" : "Đang làm"}
              </p>
              <p
                className="text-3xl font-bold font-mono"
                style={{ color: "var(--brand-color)" }}
              >
                {getWorkDuration()}
              </p>
              <p className="text-xs text-foreground/40">
                Check-in lúc{" "}
                {format(new Date(attendance!.checkin_at!), "HH:mm")}
                {hasCheckedOut &&
                  ` · Check-out lúc ${format(new Date(attendance!.checkout_at!), "HH:mm")}`}
              </p>
            </div>
          )}

          {/* ── Nút hành động ───────────────────────────────── */}
          {!hasCheckedIn ? (
            <button
              type="button"
              onClick={handleCheckin}
              disabled={
                actionLoading || gps.loading || !!gps.error || !isWithinRange
              }
              className="w-full rounded-xl py-4 text-lg font-semibold text-white transition disabled:opacity-40"
              style={{ backgroundColor: "var(--brand-color)" }}
            >
              {actionLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
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
                  Đang xử lý...
                </span>
              ) : gps.loading ? (
                "Đang tìm vị trí..."
              ) : gps.error ? (
                "Bật GPS để check-in"
              ) : !isWithinRange ? (
                "Chưa đủ gần quán"
              ) : (
                "Check-in"
              )}
            </button>
          ) : !hasCheckedOut ? (
            <button
              type="button"
              onClick={handleCheckout}
              disabled={actionLoading}
              className="w-full rounded-xl border-2 py-4 text-lg font-semibold transition disabled:opacity-40"
              style={{
                borderColor: "var(--brand-color)",
                color: "var(--brand-color)",
              }}
            >
              {actionLoading ? "Đang xử lý..." : "Check-out"}
            </button>
          ) : (
            <div className="rounded-xl border border-foreground/10 py-4 text-center">
              <p className="text-sm text-foreground/50">
                Đã hoàn tất ca hôm nay ✓
              </p>
            </div>
          )}
        </div>
      </div>

      {/* PulseCheck popup — bật sau check-out */}
      {showPulseCheck && attendance && (
        <PulseCheck
          attendanceId={attendance.id}
          onDismiss={() => setShowPulseCheck(false)}
        />
      )}
    </>
  );
}
