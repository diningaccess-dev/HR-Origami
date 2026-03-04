"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  Calendar,
  BookOpen,
  ClipboardList,
  CircleDollarSign,
  UserCheck,
  User,
} from "lucide-react";

// -- Types
type TabItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
};

// -- Tab bổ sung theo role
// Thứ tự: Home → Lịch → [extra theo role] → Hồ sơ
const ROLE_EXTRA: Record<string, Omit<TabItem, "badge">[]> = {
  azubi: [
    { key: "studyhub", label: "Học", href: "/studyhub", icon: BookOpen },
    {
      key: "checklist",
      label: "Checklist",
      href: "/checklist",
      icon: ClipboardList,
    },
  ],
  staff: [
    {
      key: "checklist",
      label: "Checklist",
      href: "/checklist",
      icon: ClipboardList,
    },
    {
      key: "tip",
      label: "Tip",
      href: "/finance/tip-pool",
      icon: CircleDollarSign,
    },
  ],
  manager: [
    {
      key: "checklist",
      label: "Checklist",
      href: "/checklist",
      icon: ClipboardList,
    },
    {
      key: "tip",
      label: "Tip",
      href: "/finance/tip-pool",
      icon: CircleDollarSign,
    },
    {
      key: "approval",
      label: "Duyệt",
      href: "/admin/approval",
      icon: UserCheck,
    },
  ],
  owner: [
    {
      key: "checklist",
      label: "Checklist",
      href: "/checklist",
      icon: ClipboardList,
    },
    {
      key: "tip",
      label: "Tip",
      href: "/finance/tip-pool",
      icon: CircleDollarSign,
    },
    {
      key: "approval",
      label: "Duyệt",
      href: "/admin/approval",
      icon: UserCheck,
    },
  ],
};

// -- Component
type BottomNavProps = {
  role: string;
  locationId: string;
};

export default function BottomNav({ role, locationId }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  // -- Badge: đếm pending profiles (chỉ manager/owner)
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPending = useCallback(async () => {
    if (!["manager", "owner"].includes(role)) return;
    try {
      const supabase = createClient();
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("location_id", locationId);
      setPendingCount(count ?? 0);
    } catch {
      /* silent */
    }
  }, [role, locationId]);

  // Poll mỗi 30 giây
  useEffect(() => {
    fetchPending();
    if (!["manager", "owner"].includes(role)) return;
    const interval = setInterval(fetchPending, 30_000);
    return () => clearInterval(interval);
  }, [fetchPending, role]);

  // -- Ghép tabs: Home → Lịch → [extra] → Hồ sơ
  const tabs: TabItem[] = useMemo(() => {
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
    const hr: TabItem = { key: "hr", label: "Hồ sơ", href: "/hr", icon: User };

    const extra: TabItem[] = (ROLE_EXTRA[role] ?? []).map((t) => ({
      ...t,
      badge:
        t.key === "approval" && pendingCount > 0 ? pendingCount : undefined,
    }));

    return [home, schedule, ...extra, hr];
  }, [role, pendingCount]);

  // -- Layout theo số tab
  const is6 = tabs.length === 6;
  const gridClass = is6 ? "grid-cols-6" : "grid-cols-5";
  const iconSize = is6 ? 20 : 22;

  // Pill width: nhỏ hơn khi nhiều tab
  const pillW = is6 ? 36 : 40;
  const pillActiveW = is6 ? 44 : 48;

  // -- Active detection
  const isActive = (href: string) => {
    if (href === "/home") return pathname === "/home";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 grid ${gridClass} bg-white border-t border-black/[0.06]`}
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
                width: active ? pillActiveW : pillW,
                background: active
                  ? "color-mix(in srgb, var(--brand-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <IconComponent
                size={iconSize}
                strokeWidth={1.5}
                style={{
                  color: active ? "var(--brand-color)" : "#c0c8d0",
                }}
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
                fontFamily: "Sora, sans-serif",
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
