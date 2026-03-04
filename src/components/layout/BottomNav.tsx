"use client";

import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import {
  Home,
  Calendar,
  MessageCircle,
  BookOpen,
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

// -- Build tabs theo role (dựa theo HTML preview)
// staff / manager / owner → 4 tab: Home · Lịch · Chat · Hồ sơ
// azubi → 5 tab: Home · Lịch · Chat · Học · Hồ sơ
function buildTabs(
  role: string,
  chatBadge: number,
  studyhubBadge: number,
): TabItem[] {
  const home: TabItem = { key: "home", label: "Home", href: "/home", icon: Home };
  const schedule: TabItem = { key: "schedule", label: "Lịch", href: "/schedule", icon: Calendar };
  const chat: TabItem = {
    key: "chat", label: "Chat", href: "/chat", icon: MessageCircle,
    badge: chatBadge || undefined,
  };
  const studyhub: TabItem = {
    key: "studyhub", label: "Học", href: "/studyhub", icon: BookOpen,
    badge: studyhubBadge || undefined,
  };
  const hr: TabItem = { key: "hr", label: "Hồ sơ", href: "/hr", icon: User };

  // Azubi: thêm tab Học vào giữa Chat và Hồ sơ
  if (role === "azubi") {
    return [home, schedule, chat, studyhub, hr];
  }
  // Các role còn lại: 4 tab cơ bản
  return [home, schedule, chat, hr];
}

// -- Component
type BottomNavProps = {
  role: string;
  locationId: string;
};

export default function BottomNav({ role, locationId }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [chatBadge, setChatBadge] = useState(0);
  const [studyhubBadge, setStudyhubBadge] = useState(0);

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

  const tabs = buildTabs(role, chatBadge, studyhubBadge);
  const is5 = tabs.length === 5;

  // Grid: 5 cột cho azubi, 4 cột cho các role còn lại
  const gridCols = is5 ? "grid-cols-5" : "grid-cols-4";

  // Icon size: nhỏ hơn khi 5 tab
  const iconSize = is5 ? 18 : 20;

  // Pill width theo số tab (từ HTML preview)
  const pillW = (active: boolean) =>
    is5
      ? active ? 44 : 38   // 5 tab
      : active ? 52 : 44;  // 4 tab

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
            className="flex flex-col items-center justify-center gap-[3px]"
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
                strokeWidth={1.8}
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