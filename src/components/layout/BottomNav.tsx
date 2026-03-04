"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
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

// -- Base tabs — tất cả role đều thấy
const BASE_TABS: TabItem[] = [
  { key: "home", label: "Home", href: "/home", icon: Home },
  { key: "schedule", label: "Lịch", href: "/schedule", icon: Calendar },
  { key: "hr", label: "Hồ sơ", href: "/hr", icon: User },
];

// -- Tab bổ sung theo role
const ROLE_TABS: Record<string, Omit<TabItem, "badge">[]> = {
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

// Ghép + sắp xếp: Home → Lịch → [extra] → Hồ sơ
function buildTabs(role: string, pendingCount: number): TabItem[] {
  const extra: TabItem[] = (ROLE_TABS[role] ?? []).map((t) => ({
    ...t,
    badge: t.key === "approval" && pendingCount > 0 ? pendingCount : undefined,
  }));
  return [BASE_TABS[0], BASE_TABS[1], ...extra, BASE_TABS[2]];
}

// -- Component
type BottomNavProps = {
  role: string;
  locationId: string;
};

export default function BottomNav({ role, locationId }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  // -- Pending-profiles badge (manager / owner only)
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

  useEffect(() => {
    fetchPending();
    if (!["manager", "owner"].includes(role)) return;
    const interval = setInterval(fetchPending, 30_000);
    return () => clearInterval(interval);
  }, [fetchPending, role]);

  // -- Build tabs
  const tabs = buildTabs(role, pendingCount);

  // -- Active detection
  const isActive = (href: string) => {
    if (href === "/home") return pathname === "/home";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-black/[0.06] grid ${
        tabs.length === 6 ? "grid-cols-6" : "grid-cols-5"
      }`}
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.06), 0 -4px 16px rgba(0,0,0,0.04)",
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
            className="flex flex-col items-center justify-center gap-[3px] flex-1 py-2 relative"
          >
            {/* Icon wrapper */}
            <div className="relative flex items-center justify-center w-7 h-7 rounded-xl transition-all duration-200">
              <IconComponent
                size={22}
                strokeWidth={1.5}
                className="transition-all duration-200"
                style={{
                  stroke: active ? "var(--brand-color)" : "#9ca3af",
                }}
              />
              {/* Badge số */}
              {badge !== undefined && badge > 0 && (
                <span
                  className="absolute flex items-center justify-center rounded-full bg-red-500 text-white font-bold"
                  style={{
                    top: -4,
                    right: -6,
                    width: 14,
                    height: 14,
                    fontSize: 8,
                    border: "1.5px solid #fff",
                  }}
                >
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </div>

            {/* Label — chỉ hiện khi active */}
            <span
              className="leading-none whitespace-nowrap transition-all duration-200"
              style={{
                fontSize: 10,
                fontWeight: 600,
                fontFamily: "Sora, sans-serif",
                letterSpacing: "0.02em",
                color: active ? "var(--brand-color)" : "transparent",
                opacity: active ? 1 : 0,
                height: active ? "auto" : 0,
                overflow: "hidden",
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
