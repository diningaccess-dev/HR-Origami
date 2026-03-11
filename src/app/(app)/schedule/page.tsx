"use client";

import { useEffect, useState, useCallback } from "react";
import { format, startOfWeek, differenceInMinutes } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Plus, Briefcase, Palmtree, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import WeekStrip from "@/components/features/schedule/WeekStrip";
import ShiftCard from "@/components/features/schedule/ShiftCard";
import type { ShiftData } from "@/components/features/schedule/ShiftCard";
import NewShiftModal from "@/components/features/schedule/NewShiftModal";

// Background surface theo quán
const SCREEN_BG: Record<string, string> = {
  enso: "#f4f7f5",
  origami: "#faf6f2",
  okyu: "#fdf4f4",
};

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [daysWithShifts, setDaysWithShifts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Profile info
  const [role, setRole] = useState("");
  const [locationId, setLocationId] = useState("enso");
  const [userId, setUserId] = useState("");

  const isManager = role === "manager" || role === "owner";

  // ── Fetch profile lần đầu ────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      supabase
        .from("profiles")
        .select("role, location_id")
        .eq("id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile) {
            setRole(profile.role);
            setLocationId(profile.location_id ?? "enso");
          }
        });
    });
  }, []);

  // ── Fetch shifts theo ngày selected ──────────────────────
  const fetchShifts = useCallback(async () => {
    if (!userId || !locationId) return;
    setLoading(true);

    const supabase = createClient();
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const dayStart = `${dateStr}T00:00:00`;
    const dayEnd = `${dateStr}T23:59:59`;

    // Query shifts cho ngày
    let query = supabase
      .from("shifts")
      .select(
        `
        id, start_time, end_time, role_tag, status,
        is_marketplace, profile_id,
        profiles!shifts_profile_id_fkey ( full_name )
      `,
      )
      .gte("start_time", dayStart)
      .lte("start_time", dayEnd)
      .neq("status", "cancelled")
      .order("start_time", { ascending: true });

    // Staff/azubi: chỉ xem ca của mình
    if (!isManager) {
      query = query.eq("profile_id", userId);
    } else {
      // Manager/owner: xem tất cả ca của location
      query = query.eq("location_id", locationId);
    }

    const { data } = await query;

    // Map vào ShiftData type
    const mapped: ShiftData[] = (data ?? []).map(
      (s: Record<string, unknown>) => {
        const profiles = s.profiles as { full_name: string } | null;
        return {
          id: s.id as string,
          start_time: s.start_time as string,
          end_time: s.end_time as string,
          role_tag: s.role_tag as string | null,
          status: s.status as string,
          is_marketplace: (s.is_marketplace as boolean) ?? false,
          profile_id: s.profile_id as string | null,
          profile_name: profiles?.full_name ?? null,
          attendance_checkin: null,
          attendance_checkout: null,
        };
      },
    );

    // Fetch attendance cho từng shift
    if (mapped.length > 0) {
      const shiftIds = mapped.map((s) => s.id);
      const { data: attendances } = await supabase
        .from("attendances")
        .select("shift_id, checkin_at, checkout_at")
        .in("shift_id", shiftIds);

      if (attendances) {
        const attMap = new Map(attendances.map((a) => [a.shift_id, a]));
        mapped.forEach((s) => {
          const att = attMap.get(s.id);
          if (att) {
            s.attendance_checkin = att.checkin_at;
            s.attendance_checkout = att.checkout_at;
          }
        });
      }
    }

    setShifts(mapped);
    setLoading(false);
  }, [userId, locationId, selectedDate, isManager]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // ── Fetch dots: ngày nào có ca trong tuần ────────────────
  useEffect(() => {
    if (!userId || !locationId) return;
    const supabase = createClient();

    // Lấy tuần từ T2–CN chứa selectedDate
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const wsISO = format(weekStart, "yyyy-MM-dd") + "T00:00:00";
    const weISO = format(weekEnd, "yyyy-MM-dd") + "T23:59:59";

    let query = supabase
      .from("shifts")
      .select("start_time")
      .gte("start_time", wsISO)
      .lte("start_time", weISO)
      .neq("status", "cancelled");

    if (!isManager) {
      query = query.eq("profile_id", userId);
    } else {
      query = query.eq("location_id", locationId);
    }

    query.then(({ data }) => {
      if (!data) return;
      const uniqueDays = [
        ...new Set(
          data.map((s) => format(new Date(s.start_time), "yyyy-MM-dd")),
        ),
      ];
      setDaysWithShifts(uniqueDays);
    });
  }, [userId, locationId, selectedDate, isManager]);

  const bgColor = SCREEN_BG[locationId] ?? SCREEN_BG.enso;

  const yearLabel = format(selectedDate, "yyyy");

  return (
    <div style={{ background: bgColor, minHeight: "100dvh" }}>
      {/* ── Page header ────────────────────────────────────── */}
      <div
        className="flex items-center justify-between bg-white border-b border-black/5"
        style={{ padding: "14px 18px 10px" }}
      >
        <h1
          style={{
            fontFamily: "Sora, sans-serif",
            fontSize: 17,
            fontWeight: 700,
            color: "#1a1a1a",
          }}
        >
          Lịch làm việc
        </h1>

        {isManager ? (
          <button
            onClick={() => setModalOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-white"
            style={{ background: "var(--brand-color)" }}
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        ) : (
          <span
            style={{
              fontSize: 11,
              color: "#aaa",
              fontWeight: 500,
            }}
          >
            Tháng {format(selectedDate, "M")} · {yearLabel}
          </span>
        )}
      </div>

      {/* ── Week strip ─────────────────────────────────────── */}
      <WeekStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        daysWithShifts={daysWithShifts}
      />

      {/* ── Shift list ─────────────────────────────────────── */}
      <div style={{ padding: 14 }} className="flex flex-col gap-2.5">
        {loading ? (
          // Skeleton 3 cards
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-[18px] bg-white"
                style={{
                  height: 80,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                }}
              />
            ))}
          </>
        ) : shifts.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <span style={{ fontSize: 36 }}>🌿</span>
            <p
              style={{
                fontSize: 13,
                color: "#aaa",
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              {isManager ? "Chưa có ca nào" : "Hôm nay bạn không có ca"}
            </p>
            {isManager && (
              <p
                style={{
                  fontSize: 11,
                  color: "#ccc",
                }}
              >
                Nhấn + để thêm ca mới
              </p>
            )}
          </div>
        ) : (
          shifts.map((shift) => <ShiftCard key={shift.id} shift={shift} />)
        )}

        {/* ── Hours summary ───────────────────────────────────── */}
        {!loading && shifts.length > 0 && (
          <div
            className="rounded-[18px] bg-white p-4 flex items-center justify-between"
            style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ background: "var(--brand-color)" }}
              >
                <Briefcase size={18} />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>
                  {shifts.length} ca hôm nay
                </p>
                <p style={{ fontSize: 11, color: "#aaa" }}>
                  Tổng:{" "}
                  {(() => {
                    const totalMins = shifts.reduce((sum, s) => {
                      return sum + differenceInMinutes(new Date(s.end_time), new Date(s.start_time));
                    }, 0);
                    const h = Math.floor(totalMins / 60);
                    const m = totalMins % 60;
                    return m > 0 ? `${h}h${m}m` : `${h} giờ`;
                  })()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Quick links ─────────────────────────────────────── */}
        <div className="flex gap-2 mt-1">
          <Link
            href="/schedule/leave"
            prefetch={true}
            className="flex-1 flex items-center gap-2 rounded-[14px] bg-white px-3.5 py-3 transition-transform active:scale-[0.97]"
            style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}
          >
            <Palmtree size={16} style={{ color: "var(--brand-color)" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#444" }}>
              Nghỉ phép
            </span>
          </Link>
          <Link
            href="/schedule/marketplace"
            prefetch={true}
            className="flex-1 flex items-center gap-2 rounded-[14px] bg-white px-3.5 py-3 transition-transform active:scale-[0.97]"
            style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}
          >
            <ArrowRightLeft size={16} style={{ color: "var(--brand-color)" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#444" }}>
              Chợ ca
            </span>
          </Link>
        </div>
      </div>

      {/* ── FAB (manager/owner) ────────────────────────────── */}
      {isManager && !modalOpen && (
        <button
          onClick={() => setModalOpen(true)}
          className="fixed z-10 flex items-center justify-center rounded-[14px] text-white"
          style={{
            bottom: 90,
            right: 16,
            width: 44,
            height: 44,
            background: "var(--brand-color)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
          }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* ── New Shift Modal ────────────────────────────────── */}
      <NewShiftModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchShifts}
        locationId={locationId}
        defaultDate={format(selectedDate, "yyyy-MM-dd")}
      />
    </div>
  );
}
