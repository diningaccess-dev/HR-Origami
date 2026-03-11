import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Thermometer,
  Palmtree,
  FileText,
  Lock,
  ShieldAlert,
  Users,
  ClipboardList,
  BarChart3,
  UserCheck,
  Megaphone,
  Coins,
  BookOpen,
  Trophy,
  Bot,
  FileBarChart,
  AlertTriangle,
} from "lucide-react";
import SignOutButton from "@/app/(app)/hr/SignOutButton";

// ── Helpers ────────────────────────────────────────────────
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

const BRAND_DARK: Record<string, string> = {
  enso: "#1B4332",
  origami: "#6B5A45",
  okyu: "#8E0000",
};

const BRAND_LIGHT: Record<string, string> = {
  enso: "#D8F3DC",
  origami: "#F5EFE6",
  okyu: "#FFEBEE",
};

const SCREEN_BG: Record<string, string> = {
  enso: "#f4f7f5",
  origami: "#faf6f2",
  okyu: "#fdf4f4",
};

// ── Menu config ────────────────────────────────────────────
type MenuItem = {
  icon: string;
  title: string;
  subtitle?: string;
  href: string;
  badgeType?: "red" | "yellow" | "green";
  badgeValue?: string | number;
};

type MenuGroup = {
  label: string;
  labelColor?: string;
  borderColor?: string;
  items: MenuItem[];
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
    .select("full_name, email, role, location_id, avatar_url")
    .eq("id", user.id)
    .single();

  const name = profile?.full_name ?? "User";
  const email = profile?.email ?? user.email ?? "";
  const role = profile?.role ?? "staff";
  const locationId = profile?.location_id ?? "enso";

  const brandColor = BRAND_COLORS[locationId] ?? BRAND_COLORS.enso;
  const brandDark = BRAND_DARK[locationId] ?? BRAND_DARK.enso;
  const brandLight = BRAND_LIGHT[locationId] ?? BRAND_LIGHT.enso;
  const bgColor = SCREEN_BG[locationId] ?? SCREEN_BG.enso;

  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isAzubi = role === "azubi";
  const isManager = role === "manager" || role === "owner";
  const isOwner = role === "owner";

  // ── Badges: giấy tờ sắp hết hạn (≤ 30 ngày) ─────────
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  const { count: expiringDocs } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .lte("expires_at", thirtyDaysLater.toISOString())
    .gte("expires_at", new Date().toISOString());

  // ── Badge: pending profiles (manager/owner) ────────────
  let pendingCount = 0;
  if (isManager) {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("location_id", locationId)
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  // ── Build menu groups ──────────────────────────────────
  const groups: MenuGroup[] = [];

  // Azubi: nhóm Học tập (nổi bật, hiện trước)
  if (isAzubi) {
    groups.push({
      label: "Học tập",
      labelColor: brandColor,
      borderColor: brandLight,
      items: [
        {
          icon: "BookOpen",
          title: "Studyhub",
          subtitle: "Khóa học & bài thi",
          href: "/studyhub",
        },
        {
          icon: "Trophy",
          title: "Leaderboard XP",
          subtitle: "Xem xếp hạng",
          href: "/studyhub/leaderboard",
        },
        {
          icon: "Bot",
          title: "AI Colleague",
          subtitle: "Hỏi đáp 24/7",
          href: "/ai",
        },
      ],
    });
  }

  // Tất cả role: nhóm Cá nhân
  groups.push({
    label: "Cá nhân",
    items: [
      {
        icon: "Thermometer",
        title: "Báo ốm",
        subtitle: "Xin nghỉ & gửi AU",
        href: "/hr/sick-report",
      },
      {
        icon: "Palmtree",
        title: "Nghỉ phép",
        subtitle: "Urlaub & Sonderurlaub",
        href: "/schedule/leave",
      },
      {
        icon: "FileText",
        title: "Giấy tờ",
        subtitle: expiringDocs
          ? `${expiringDocs} giấy tờ sắp hết hạn`
          : "Hợp đồng & giấy tờ",
        href: "/hr/documents",
        ...(expiringDocs && expiringDocs > 0
          ? { badgeType: "yellow" as const, badgeValue: "!" }
          : {}),
      },
      {
        icon: "Lock",
        title: "Đổi mật khẩu",
        href: "/hr/change-password",
      },
      {
        icon: "ShieldAlert",
        title: "Tố cáo ẩn danh",
        subtitle: "Hoàn toàn bảo mật",
        href: "/hr/whistleblower",
      },
    ],
  });

  // Manager/Owner: nhóm Quản lý
  if (isManager) {
    groups.push({
      label: "Quản trị",
      items: [
        {
          icon: "Users",
          title: "Quản lý nhân viên",
          subtitle: "Tạo & sửa tài khoản",
          href: "/admin/employees",
        },
        {
          icon: "ClipboardList",
          title: "Quản lý Checklist",
          subtitle: "Thêm, sửa, gán checklist",
          href: "/checklist/manage",
        },
        {
          icon: "BarChart3",
          title: "Analytics",
          subtitle: "Giờ làm, thống kê",
          href: "/analytics",
        },
        {
          icon: "UserCheck",
          title: "Duyệt tài khoản",
          subtitle:
            pendingCount > 0
              ? `${pendingCount} đang chờ duyệt`
              : "Không có yêu cầu mới",
          href: "/admin/approval",
          ...(pendingCount > 0
            ? { badgeType: "red" as const, badgeValue: pendingCount }
            : {}),
        },
        {
          icon: "Megaphone",
          title: "Thông báo",
          subtitle: "Gửi thông báo toàn quán",
          href: "/admin/announcements",
        },
        {
          icon: "Coins",
          title: "Tip Pool",
          subtitle: "Chia tip cho nhân viên",
          href: "/finance/tip-pool",
        },
        {
          icon: "BookOpen",
          title: "Sổ tay AI",
          subtitle: "Nội dung cho trợ lý AI",
          href: "/admin/handbook",
        },
      ],
    });
  }

  // Owner: nhóm Hệ thống
  if (isOwner) {
    groups.push({
      label: "Hệ thống",
      items: [
        {
          icon: "FileBarChart",
          title: "Báo cáo tổng hợp",
          subtitle: "Doanh thu & hiệu suất",
          href: "/admin/reports",
        },
        {
          icon: "AlertTriangle",
          title: "Tố cáo (xem)",
          subtitle: "Xem đơn tố cáo ẩn danh",
          href: "/admin/whistleblower",
        },
      ],
    });
  }

  const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
    red: { bg: "#ef4444", color: "#fff" },
    yellow: { bg: "#d97706", color: "#fff" },
    green: { bg: brandColor, color: "#fff" },
  };

  return (
    <div style={{ background: bgColor, minHeight: "100dvh" }}>
      {/* ── Hero gradient ────────────────────────────────── */}
      <div
        className="relative overflow-hidden flex flex-col items-center gap-1.5"
        style={{
          background: `linear-gradient(135deg, ${brandDark} 0%, ${brandColor} 60%, ${brandColor}99 100%)`,
          padding: "20px 16px 28px",
        }}
      >
        {/* Gradient fade bottom */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: 32,
            background: `linear-gradient(to bottom, transparent, ${bgColor})`,
          }}
        />

        {/* Avatar */}
        <div
          className="flex items-center justify-center"
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: brandLight,
            color: brandColor,
            fontSize: 28,
            border: "3px solid rgba(255,255,255,0.4)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          }}
        >
          {initials}
        </div>

        {/* Name */}
        <p
          style={{
            fontFamily: "Sora, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {name}
        </p>

        {/* Email */}
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{email}</p>

        {/* Chips */}
        <div className="flex gap-1.5 mt-0.5">
          <span
            className="rounded-full"
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "3px 10px",
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {ROLE_LABELS[role] ?? role}
          </span>
          <span
            className="rounded-full"
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "3px 10px",
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {LOCATION_LABELS[locationId] ?? locationId}
          </span>
        </div>
      </div>

      {/* ── Menu sections ────────────────────────────────── */}
      <div
        className="flex flex-col gap-1.5"
        style={{ padding: "0 12px", marginTop: -10 }}
      >
        {groups.map((group, gi) => (
          <div key={gi}>
            {/* Section label */}
            <p
              className="px-1 mb-1"
              style={{
                fontFamily: "Sora, sans-serif",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: group.labelColor ?? "#bbb",
                marginTop: gi > 0 ? 6 : 4,
              }}
            >
              {group.label}
            </p>

            {/* Group card */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "#fff",
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                border: group.borderColor
                  ? `1px solid ${group.borderColor}`
                  : "none",
              }}
            >
              {group.items.map((item, ii) => (
                <Link
                  key={ii}
                  href={item.href}
                  className="flex items-center gap-2.5 cursor-pointer transition-transform duration-100 active:scale-[0.98]"
                  style={{
                    padding: "11px 14px",
                    borderBottom:
                      ii < group.items.length - 1
                        ? "1px solid rgba(0,0,0,0.04)"
                        : "none",
                  }}
                >
                  {/* Icon */}
                  {(() => {
                    const ICON_MAP: Record<string, React.ReactNode> = {
                      Thermometer: <Thermometer size={16} />,
                      Palmtree: <Palmtree size={16} />,
                      FileText: <FileText size={16} />,
                      Lock: <Lock size={16} />,
                      ShieldAlert: <ShieldAlert size={16} />,
                      Users: <Users size={16} />,
                      ClipboardList: <ClipboardList size={16} />,
                      BarChart3: <BarChart3 size={16} />,
                      UserCheck: <UserCheck size={16} />,
                      Megaphone: <Megaphone size={16} />,
                      Coins: <Coins size={16} />,
                      BookOpen: <BookOpen size={16} />,
                      Trophy: <Trophy size={16} />,
                      Bot: <Bot size={16} />,
                      FileBarChart: <FileBarChart size={16} />,
                      AlertTriangle: <AlertTriangle size={16} />,
                    };
                    return (
                      <div
                        className="flex shrink-0 items-center justify-center"
                        style={{
                          width: 32,
                          height: 32,
                          color: brandColor,
                          opacity: 0.7,
                        }}
                      >
                        {ICON_MAP[item.icon] ?? <ChevronRight size={16} />}
                      </div>
                    );
                  })()}

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#1a1a1a",
                      }}
                    >
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p
                        style={{
                          fontSize: 10,
                          color: "#aaa",
                          marginTop: 1,
                        }}
                      >
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Badge */}
                  {item.badgeType && item.badgeValue !== undefined && (
                    <span
                      className="rounded-full"
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 7px",
                        fontFamily: "Sora, sans-serif",
                        background: BADGE_STYLES[item.badgeType].bg,
                        color: BADGE_STYLES[item.badgeType].color,
                      }}
                    >
                      {item.badgeValue}
                    </span>
                  )}

                  {/* Arrow */}
                  <ChevronRight size={14} strokeWidth={2} color="#ddd" />
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* ── Logout ─────────────────────────────────────── */}
        <div style={{ padding: "8px 0 4px" }}>
          <SignOutButton />
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
