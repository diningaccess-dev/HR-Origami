import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const LOCATION_LABELS: Record<string, string> = {
  enso: "Enso",
  origami: "Origami",
  okyu: "Okyu",
};

const ROLE_TAG_LABELS: Record<string, string> = {
  bar: "Bar",
  kitchen: "Bếp",
  service: "Service",
  all: "Tất cả khu vực",
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
  const firstName = profile?.full_name?.split(" ")[0] ?? "bạn";
  const locationLabel = LOCATION_LABELS[locationId] ?? locationId;

  // ── Today's shifts for this user ─────────────────────────
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
    .order("start_time", { ascending: true });

  // ── Latest 3 announcements for location ─────────────────
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, is_urgent, created_at")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(3);

  const isManager = profile?.role === "manager" || profile?.role === "owner";

  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-6">
      {/* ── Greeting ──────────────────────────────────── */}
      <div>
        <p className="text-sm text-muted-foreground">{locationLabel}</p>
        <h1 className="text-2xl font-bold text-foreground">
          Chào, {firstName} 👋
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {format(new Date(), "EEEE, dd.MM.yyyy", { locale: de })}
        </p>
      </div>

      {/* ── Today's shifts ────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ca hôm nay
        </h2>

        {!shifts || shifts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-background px-4 py-5 text-center">
            <p className="text-sm text-muted-foreground">
              Không có ca làm hôm nay
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3.5"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    {format(new Date(shift.start_time), "HH:mm")} —{" "}
                    {format(new Date(shift.end_time), "HH:mm")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_TAG_LABELS[shift.role_tag] ?? shift.role_tag}
                  </p>
                </div>
                <span
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: "var(--brand-color)" }}
                >
                  Hôm nay
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Quick Actions ─────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Thao tác nhanh
        </h2>

        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/checkin"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-background px-2 py-4 text-center transition-colors active:bg-foreground/5"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: "var(--brand-color)" }}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </div>
            <span className="text-xs font-medium text-foreground">
              Check-in
            </span>
          </Link>

          <Link
            href="/hr/sick-report"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-background px-2 py-4 text-center transition-colors active:bg-foreground/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </div>
            <span className="text-xs font-medium text-foreground">Báo ốm</span>
          </Link>

          <Link
            href="/checklist"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-background px-2 py-4 text-center transition-colors active:bg-foreground/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-xs font-medium text-foreground">
              Checklist
            </span>
          </Link>
        </div>

        {/* Manager-only action */}
        {isManager && (
          <Link
            href="/admin/announcements"
            className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3.5 transition-colors active:bg-foreground/5"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: "var(--brand-color)" }}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Đăng thông báo
              </p>
              <p className="text-xs text-muted-foreground">
                Tạo & quản lý thông báo quán
              </p>
            </div>
            <svg
              className="ml-auto h-4 w-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </Link>
        )}
      </section>

      {/* ── Recent Announcements ──────────────────── */}
      {announcements && announcements.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Thông báo mới nhất
          </h2>

          <div className="space-y-2">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`rounded-2xl border p-4 space-y-1 ${
                  a.is_urgent
                    ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex items-center gap-2">
                  {a.is_urgent && (
                    <span className="rounded-md bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                      KHẨN
                    </span>
                  )}
                  <p
                    className={`text-sm font-semibold ${
                      a.is_urgent
                        ? "text-red-800 dark:text-red-300"
                        : "text-foreground"
                    }`}
                  >
                    {a.title}
                  </p>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {format(new Date(a.created_at), "dd.MM")}
                  </span>
                </div>
                <p
                  className={`text-xs line-clamp-2 ${
                    a.is_urgent
                      ? "text-red-700/80 dark:text-red-400/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {a.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
