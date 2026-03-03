import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import SignOutButton from "@/app/(app)/hr/SignOutButton";

// ── Label helpers ────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
  azubi: "Azubi",
};

const LOCATION_LABELS: Record<string, string> = {
  enso: "Enso",
  origami: "Origami",
  okyu: "Okyu",
};

const BRAND_COLORS: Record<string, string> = {
  enso: "#2D6A4F",
  origami: "#8B7355",
  okyu: "#C62828",
};

export default async function HrPage() {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, location_id, hired_at, avatar_url")
    .eq("id", user.id)
    .single();

  const name = profile?.full_name ?? "—";
  const email = profile?.email ?? user.email ?? "—";
  const role = profile?.role ?? "staff";
  const locationId = profile?.location_id ?? "enso";
  const hiredAt = profile?.hired_at;
  const avatarUrl = profile?.avatar_url;

  const brandColor = BRAND_COLORS[locationId] ?? BRAND_COLORS.enso;

  // Chữ cái đầu để làm avatar fallback
  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Format ngày kiểu DE
  const formattedDate = hiredAt
    ? new Date(hiredAt).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  return (
    <div className="min-h-dvh bg-background px-4 py-6">
      <div className="mx-auto max-w-sm space-y-6">
        {/* ── Header ────────────────────────────────────────── */}
        <h1 className="text-xl font-semibold text-foreground">Hồ sơ</h1>

        {/* ── Avatar + tên + email ───────────────────────────── */}
        <div className="flex flex-col items-center gap-3 py-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold text-white"
              style={{ backgroundColor: brandColor }}
            >
              {initials}
            </div>
          )}
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{name}</p>
            <p className="text-sm text-foreground/50">{email}</p>
          </div>
        </div>

        {/* ── Thông tin chi tiết ─────────────────────────────── */}
        <div className="divide-y divide-foreground/8 rounded-xl border border-foreground/10 bg-background">
          <Row label="Role" value={ROLE_LABELS[role] ?? role} />
          <Row
            label="Quán"
            value={LOCATION_LABELS[locationId] ?? locationId}
            valueStyle={{ color: brandColor }}
          />
          <Row label="Ngày vào làm" value={formattedDate} />
        </div>

        {/* ── Đăng xuất ─────────────────────────────────────── */}
        <SignOutButton />
      </div>
    </div>
  );
}

// ── Row component ─────────────────────────────────────────────
function Row({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-foreground/50">{label}</span>
      <span className="text-sm font-medium text-foreground" style={valueStyle}>
        {value}
      </span>
    </div>
  );
}
