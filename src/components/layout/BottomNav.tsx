"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  Calendar,
  MessageCircle,
  BookOpen,
  UserCheck,
  User,
} from "lucide-react";

type TabItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
};

type BottomNavProps = {
  role: string;
  locationId: string;
};

export default function BottomNav({ role, locationId }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  // ── Badge: đếm pending profiles (chỉ manager/owner) ────
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const isManager = role === "manager" || role === "owner";

  const fetchBadges = useCallback(async () => {
    try {
      const supabase = createClient();

      // Pending profiles (manager/owner)
      if (isManager) {
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
          .eq("location_id", locationId);
        setPendingCount(count ?? 0);
      }

      // Unread messages (tất cả role)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("messages")
          .select("id, read_by")
          .not("read_by", "cs", `{${user.id}}`);
        setUnreadCount(
          (data ?? []).filter(
            (m) => !Array.isArray(m.read_by) || !m.read_by.includes(user.id),
          ).length,
        );
      }
    } catch {
      /* silent */
    }
  }, [isManager, locationId]);

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 15_000);
    return () => clearInterval(interval);
  }, [fetchBadges]);

  // ── Build tab list theo role ──────────────────────────────
  const buildTabs = (): TabItem[] => {
    const home: TabItem = {
      key: "home",
      label: "Home",
      href: "/home",
      icon: Home,
    };
    const schedule: TabItem = {
      key: "schedule",
      label: "Lịch",
      href: "/schedule",
      icon: Calendar,
    };
    const chat: TabItem = {
      key: "chat",
      label: "Chat",
      href: "/chat",
      icon: MessageCircle,
      badge: unreadCount,
    };
    const studyhub: TabItem = {
      key: "studyhub",
      label: "Học",
      href: "/studyhub",
      icon: BookOpen,
    };
    const approval: TabItem = {
      key: "approval",
      label: "Duyệt",
      href: "/admin/approval",
      icon: UserCheck,
      badge: pendingCount,
    };
    const hr: TabItem = {
      key: "hr",
      label: "Hồ sơ",
      href: "/hr",
      icon: User,
    };

    switch (role) {
      case "azubi":
        return [home, schedule, chat, studyhub, hr]; // 5 tab
      case "manager":
      case "owner":
        return [home, schedule, chat, approval, hr]; // 5 tab
      default: // staff
        return [home, schedule, chat, hr]; // 4 tab
    }
  };

  const tabs = buildTabs();
  const cols = tabs.length; // 4 hoặc 5

  const isActive = (href: string) => {
    if (href === "/home") return pathname === "/home";
    return pathname.startsWith(href);
  };

  // Màu quán từ CSS variable (set bởi layout)
  const brandColor = "var(--brand-color)";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        paddingBottom: "env(safe-area-inset-bottom)",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.04), 0 -4px 16px rgba(0,0,0,0.04)",
      }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        const Icon = tab.icon;
        // Icon nhỏ hơn khi 5 tab
        const iconSize = cols === 5 ? 20 : 22;

        return (
          <button
            key={tab.key}
            onClick={() => router.push(tab.href)}
            className="flex flex-col items-center justify-center gap-[3px] py-2"
          >
            {/* Icon + badge */}
            <div className="relative flex items-center justify-center w-7 h-7">
              <Icon
                size={iconSize}
                strokeWidth={1.5}
                style={{ stroke: active ? brandColor : "#9ca3af" }}
              />
              {/* Badge */}
              {tab.badge != null && tab.badge > 0 && (
                <span
                  className="absolute -top-1 -right-1.5 flex items-center justify-center
                             w-[14px] h-[14px] rounded-full bg-red-500 text-white
                             text-[8px] font-bold border-[1.5px] border-white"
                >
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </div>

            {/* Label — chỉ active mới hiện */}
            <span
              className="text-[10px] font-semibold leading-none tracking-wide"
              style={{
                fontFamily: "Sora, sans-serif",
                color: active ? brandColor : "transparent",
                height: active ? "auto" : "0",
                overflow: "hidden",
                transition: "color 0.15s",
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
