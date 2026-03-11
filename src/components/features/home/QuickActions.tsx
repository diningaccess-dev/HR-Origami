"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ClipboardList,
  HeartPulse,
  CircleDollarSign,
  FileText,
  UserCheck,
  Megaphone,
  BarChart3,
} from "lucide-react";



// Tab cho tất cả role
const BASE_ACTIONS = [
  {
    key: "checklist",
    label: "Checklist",
    href: "/checklist",
    icon: ClipboardList,
    hasBadge: true,
  },
  {
    key: "sick",
    label: "Báo ốm",
    href: "/hr/sick-report",
    icon: HeartPulse,
    hasBadge: false,
  },
  {
    key: "tip",
    label: "Tip Pool",
    href: "/finance/tip-pool",
    icon: CircleDollarSign,
    hasBadge: false,
  },
  {
    key: "docs",
    label: "Giấy tờ",
    href: "/hr/documents",
    icon: FileText,
    hasBadge: false,
  },
];

// Tab bổ sung cho manager/owner
const MANAGER_ACTIONS = [
  {
    key: "approval",
    label: "Duyệt TK",
    href: "/admin/approval",
    icon: UserCheck,
    hasBadge: true,
  },
  {
    key: "announce",
    label: "Thông báo",
    href: "/admin/announcements",
    icon: Megaphone,
    hasBadge: false,
  },
  {
    key: "team",
    label: "Team CL",
    href: "/checklist",
    icon: BarChart3,
    hasBadge: false,
  },
];

type QuickActionsProps = {
  role: string;
  locationId: string;
};

export default function QuickActions({ role, locationId }: QuickActionsProps) {
  const router = useRouter();
  const isManager = role === "manager" || role === "owner";

  // -- Badges
  const [checklistBadge, setChecklistBadge] = useState(0);
  const [pendingBadge, setPendingBadge] = useState(0);

  const fetchBadges = useCallback(async () => {
    try {
      const supabase = createClient();

      // Badge checklist: item chưa tick hôm nay
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const { data: runs } = await supabase
          .from("checklist_runs")
          .select("progress")
          .eq("date", todayStr)
          .limit(1)
          .maybeSingle();

        if (runs && runs.progress < 100) {
          const remaining = Math.max(1, Math.ceil((100 - runs.progress) / 10));
          setChecklistBadge(remaining);
        }
      } catch {
        // Table chưa tồn tại → bỏ qua
      }

      // Badge pending profiles (chỉ manager/owner)
      if (isManager) {
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        setPendingBadge(count ?? 0);
      }
    } catch {
      /* silent */
    }
  }, [isManager]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  // Build danh sách actions
  const actions = [...BASE_ACTIONS];

  return (
    <div className="px-4 mb-[18px]">
      <h2
        style={{
          fontFamily: "Sora, sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#999",
          marginBottom: 10,
        }}
      >
        Truy cập nhanh
      </h2>

      {/* Grid chính — 4 cột */}
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action) => {
          const badge = action.key === "checklist" ? checklistBadge : 0;

          return (
            <button
              key={action.key}
              onClick={() => {
                if ("vibrate" in navigator) navigator.vibrate(5);
                router.push(action.href);
              }}
              className="flex flex-col items-center gap-[5px] transition-transform duration-100 active:scale-[0.93]"
            >
              <div
                className="relative flex items-center justify-center rounded-2xl"
                style={{
                  width: 50,
                  height: 50,
                  background: "#f5f5f5",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <action.icon size={20} strokeWidth={1.8} color="#555" />
                {/* Badge đỏ */}
                {badge > 0 && (
                  <span
                    className="absolute flex items-center justify-center rounded-full bg-red-500 text-white font-bold"
                    style={{
                      top: -3,
                      right: -3,
                      width: 16,
                      height: 16,
                      fontSize: 8,
                      border: "2px solid #f8f9fa",
                    }}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "#555",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {action.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Manager/Owner — hàng thêm */}
      {isManager && (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {MANAGER_ACTIONS.map((action) => {
            const badge = action.key === "approval" ? pendingBadge : 0;

            return (
              <button
                key={action.key}
                onClick={() => {
                  if ("vibrate" in navigator) navigator.vibrate(5);
                  router.push(action.href);
                }}
                className="flex flex-col items-center gap-[5px] transition-transform duration-100 active:scale-[0.93]"
              >
                <div
                  className="relative flex items-center justify-center rounded-2xl"
                  style={{
                    width: 50,
                    height: 50,
                    background: "#f5f5f5",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  <action.icon size={20} strokeWidth={1.8} color="#555" />
                  {badge > 0 && (
                    <span
                      className="absolute flex items-center justify-center rounded-full bg-red-500 text-white font-bold"
                      style={{
                        top: -3,
                        right: -3,
                        width: 16,
                        height: 16,
                        fontSize: 8,
                        border: "2px solid #f8f9fa",
                      }}
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: "#555",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
