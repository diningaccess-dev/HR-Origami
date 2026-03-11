import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import HeroCard from "@/components/features/home/HeroCard";
import QuickActions from "@/components/features/home/QuickActions";
import AnnouncementList from "@/components/features/home/AnnouncementList";
import PulseCheck from "@/components/features/home/PulseCheck";
import OwnerDashboard from "@/components/features/home/OwnerDashboard";

// Background surface theo quán
const SCREEN_BG: Record<string, string> = {
  enso: "#f4f7f5",
  origami: "#faf6f2",
  okyu: "#fdf4f4",
};

export default async function HomePage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ── Fetch profile ────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, location_id")
    .eq("id", user.id)
    .single();

  const locationId = profile?.location_id ?? "enso";
  const role = profile?.role ?? "staff";
  const fullName = profile?.full_name ?? "Bạn";

  // ── Today's first shift ──────────────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, start_time, end_time, role_tag, status")
    .eq("profile_id", user.id)
    .gte("start_time", todayStart.toISOString())
    .lte("start_time", todayEnd.toISOString())
    .neq("status", "cancelled")
    .order("start_time", { ascending: true })
    .limit(1);

  const todayShift = shifts?.[0] ?? null;

  // ── Attendance hôm nay (check-in / check-out / mood) ──────
  const { data: attendance } = await supabase
    .from("attendances")
    .select("id, checkin_at, checkout_at, pulse_mood")
    .eq("profile_id", user.id)
    .gte("created_at", todayStart.toISOString())
    .lte("created_at", todayEnd.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasCheckedIn = !!attendance?.checkin_at;
  const hasCheckedOut = !!attendance?.checkout_at;
  const hasMood = attendance?.pulse_mood != null;

  // Hiện PulseCheck khi đã checkout nhưng chưa chọn mood
  const showPulse = hasCheckedOut && !hasMood && !!attendance?.id;

  // ── Announcements (3 mới nhất) ──────────────────────────
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, is_urgent, created_at, confirmed_by")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(3);

  const bgColor = SCREEN_BG[locationId] ?? SCREEN_BG.enso;

  return (
    <div style={{ background: bgColor, minHeight: "100dvh" }}>
      {/* 1. Hero Card — gradient + shift */}
      <HeroCard
        fullName={fullName}
        locationId={locationId}
        shift={todayShift}
        hasCheckedIn={hasCheckedIn}
      />

      {/* Spacer */}
      <div className="h-4" />

      {/* Owner Dashboard */}
      {role === "owner" && <OwnerDashboard />}

      {/* 2. Quick Actions */}
      <QuickActions role={role} locationId={locationId} />

      {/* 3. Announcements */}
      <AnnouncementList
        announcements={announcements ?? []}
        locationId={locationId}
        userId={user.id}
      />

      {/* 4. Pulse Check (chỉ khi đã checkout + chưa mood) */}
      {showPulse && <PulseCheck attendanceId={attendance!.id} />}

      {/* Bottom spacing cho BottomNav */}
      <div className="h-4" />
    </div>
  );
}
