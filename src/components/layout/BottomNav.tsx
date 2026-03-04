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

// -- Base tabs (mọi role đều thấy)
const BASE: Omit<TabItem, "badge">[] = [
  { key: "home",     label: "Home",  href: "/home",     icon: Home },
  { key: "schedule", label: "Lịch",  href: "/schedule", icon: Calendar },
  { key: "hr",       label: "Hồ sơ", href: "/hr",       icon: User },
];

// -- Build tabs theo role
function buildTabs(role: string, pendingCount: number, studyhubBadge: number): TabItem[] {
  const extraByRole: Record<string, TabItem[]> = {
    azubi: [
      { key: "studyhub",  label: "Học",       href: "/studyhub",         icon: BookOpen,         badge: studyhubBadge || undefined },
      { key: "checklist", label: "Checklist", href: "/checklist",        icon: ClipboardList },
    ],
    staff: [
      { key: "checklist", label: "Checklist", href: "/checklist",        icon: ClipboardList },
      { key: "tip",       label: "Tip",        href: "/finance/tip-pool", icon: CircleDollarSign },
    ],
    manager: [
      { key: "checklist", label: "Checklist", href: "/checklist",        icon: ClipboardList },
      { key: "tip",       label: "Tip",        href: "/finance/tip-pool", icon: CircleDollarSign },
      { key: "approval",  label: "Duyệt",      href: "/admin/approval",   icon: UserCheck, badge: pendingCount || undefined },
    ],
    owner: [
      { key: "checklist", label: "Checklist", href: "/checklist",        icon: ClipboardList },
      { key: "tip",       label: "Tip",        href: "/finance/tip-pool", icon: CircleDollarSign },
      { key: "approval",  label: "Duyệt",      href: "/admin/approval",   icon: UserCheck, badge: pendingCount || undefined },
    ],
  };
  const extra = extraByRole[role] ?? [];
  return [BASE[0], BASE[1], ...extra, BASE[2]];
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

  useEffect(() => {
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
  }, []);

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
  const gridCols = tabs.length === 6 ? "grid-cols-6" : "grid-cols-5";

  const isActive = (href: string) => {
    if (href === "/home") return pathname === "/home";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 grid ${gridCols} bg-white border-t border-black/6 pb-[env(safe-area-inset-bottom)]`}
      style={{ boxShadow: "0 -1px 0 rgba(0,0,0,0.06), 0 -4px 16px rgba(0,0,0,0.04)" }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        const IconComponent = tab.icon;
        const badge = tab.badge;
        return (
          <button
            key={tab.key}
            onClick={() => router.push(tab.href)}
            className="flex flex-col items-center justify-center gap-0.75 flex-1 py-2 relative"
          >
            <div className="relative flex items-center justify-center w-7 h-7 rounded-xl transition-all duration-200">
              <IconComponent
                size={22}
                strokeWidth={1.5}
                style={{ color: active ? "var(--brand-color)" : "#9ca3af" }}
                className="transition-all duration-200"
              />
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center border-[1.5px] border-white">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </div>
            <span
              className="text-[10px] font-semibold leading-none transition-all duration-200 tracking-[0.02em]"
              style={{
                opacity: active ? 1 : 0,
                height: active ? "auto" : 0,
                overflow: "hidden",
                color: active ? "var(--brand-color)" : "transparent",
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