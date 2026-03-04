"use client";

import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import {
  Home,
  Calendar,
  BookOpen,
  ClipboardList,
  CircleDollarSign,
  UserCheck,
  User,
} from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// -- Types
type TabItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
};

// -- Build tabs theo role
// staff/azubi → 5 tab, manager/owner → 6 tab
function buildTabs(
  role: string,
  pendingCount: number,
  studyhubBadge: number,
): TabItem[] {
  const home: TabItem = { key: "home", label: "Home", href: "/home", icon: Home };
  const schedule: TabItem = { key: "schedule", label: "Lịch", href: "/schedule", icon: Calendar };
  const hr: TabItem = { key: "hr", label: "Hồ sơ", href: "/hr", icon: User };

  const checklist: TabItem = { key: "checklist", label: "Checklist", href: "/checklist", icon: ClipboardList };
  const tip: TabItem = { key: "tip", label: "Tip", href: "/finance/tip-pool", icon: CircleDollarSign };
  const studyhub: TabItem = {
    key: "studyhub", label: "Học", href: "/studyhub", icon: BookOpen,
    badge: studyhubBadge || undefined,
  };
  const approval: TabItem = {
    key: "approval", label: "Duyệt", href: "/admin/approval", icon: UserCheck,
    badge: pendingCount || undefined,
  };

  // Sắp xếp tab theo role
  switch (role) {
    case "azubi":
      return [home, schedule, studyhub, checklist, hr];
    case "staff":
      return [home, schedule, checklist, tip, hr];
    case "manager":
    case "owner":
      return [home, schedule, checklist, tip, approval, hr];
    default:
      return [home, schedule, checklist, hr];
  }
}

// -- Component
type BottomNavProps = {
  role: string;
  locationId: string;
};

export default function BottomNav({ role, locationId }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [studyhubBadge, setStudyhubBadge] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const isManagerOrOwner = role === "manager" || role === "owner";

  // Badge: khóa học bắt buộc chưa hoàn thành (chỉ azubi)
  useEffect(() => {
    if (role !== "azubi") return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: requiredCourses } = await supabase
          .from("courses")
          .select("id")
          .eq("is_required", true)
          .not("published_at", "is", null);
        if (!requiredCourses?.length || cancelled) return;
        const courseIds = requiredCourses.map((c) => c.id);
        const { data: completed } = await supabase
          .from("course_enrollments")
          .select("course_id")
          .eq("profile_id", user.id)
          .not("completed_at", "is", null)
          .in("course_id", courseIds);
        const completedIds = new Set((completed ?? []).map((e) => e.course_id));
        const missing = courseIds.filter((id) => !completedIds.has(id));
        if (!cancelled) setStudyhubBadge(missing.length);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [role]);

  // Badge: pending profiles (manager/owner), poll mỗi 30s
  useEffect(() => {
    if (!isManagerOrOwner || !locationId) return;
    const fetchPending = async () => {
      try {
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
          .eq("location_id", locationId);
        setPendingCount(count ?? 0);
      } catch { /* silent */ }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30_000);
    return () => clearInterval(interval);
  }, [isManagerOrOwner, locationId]);

  const tabs = buildTabs(role, pendingCount, studyhubBadge);
  const is6 = tabs.length === 6;
  const gridCols = is6 ? "grid-cols-6" : "grid-cols-5";
  const iconSize = is6 ? 20 : 22;

  // Pill width: nhỏ hơn khi 6 tab, rộng hơn khi active
  const pillW = (active: boolean) =>
    is6
      ? active ? 40 : 34
      : active ? 44 : 38;

  const isActive = (href: string) => {
    if (href === "/home") return pathname === "/home";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 grid ${gridCols} bg-white border-t border-black/6`}
      style={{
        padding: "8px 4px calc(10px + env(safe-area-inset-bottom, 0px))",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.05)",
      }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        const IconComponent = tab.icon;
        const badge = tab.badge;

        return (
          <button
            key={tab.key}
            onClick={() => router.push(tab.href)}
            className="flex flex-col items-center justify-center gap-0.75"
          >
            {/* Nav Pill — nền brand 10% khi active */}
            <div
              className="relative flex items-center justify-center h-7 rounded-full transition-all duration-200"
              style={{
                width: pillW(active),
                background: active
                  ? "color-mix(in srgb, var(--brand-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <IconComponent
                size={iconSize}
                strokeWidth={1.5}
                style={{ color: active ? "var(--brand-color)" : "#c0c8d0" }}
                className="transition-colors duration-200"
              />
              {/* Badge đỏ góc icon */}
              {badge !== undefined && badge > 0 && (
                <span
                  className="absolute flex items-center justify-center rounded-full bg-red-500 text-white font-bold"
                  style={{
                    top: -2,
                    right: -2,
                    width: 14,
                    height: 14,
                    fontSize: 8,
                    border: "2px solid #fff",
                  }}
                >
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </div>

            {/* Label — chỉ hiện khi active */}
            <span
              className="leading-none whitespace-nowrap transition-opacity duration-200"
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: active ? "var(--brand-color)" : "transparent",
                opacity: active ? 1 : 0,
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}