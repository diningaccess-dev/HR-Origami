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

// Màu nền icon theo HTML preview
const ICON_BG: Record<string, string> = {
  checklist: "#D8F3DC",
  sick: "#FFF3CD",
  tip: "#E8F4FD",
  docs: "#F3E5F5",
  approval: "#FFF3CD",
  announce: "#E8F4FD",
  team: "#F3E5F5",
};

// Tab cho tất cả role
const BASE_ACTIONS = [
  {
    key: "checklist",
    label: "Checklist",
    href: "/checklist",
    icon: ClipboardList,
    emoji: "📋",
    bg: ICON_BG.checklist,
    hasBadge: true,
  },
  {
    key: "sick",
    label: "Báo ốm",
    href: "/hr/sick-report",
    icon: HeartPulse,
    emoji: "😷",
    bg: ICON_BG.sick,
    hasBadge: false,
  },
  {
    key: "tip",
    label: "Tip Pool",
    href: "/finance/tip-pool",
    icon: CircleDollarSign,
    emoji: "💰",
    bg: ICON_BG.tip,
    hasBadge: false,
  },
  {
    key: "docs",
    label: "Giấy tờ",
    href: "/hr/documents",
    icon: FileText,
    emoji: "📄",
    bg: ICON_BG.docs,
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
    emoji: "👥",
    bg: ICON_BG.approval,
    hasBadge: true,
  },
  {
    key: "announce",
    label: "Thông báo",
    href: "/admin/announcements",
    icon: Megaphone,
    emoji: "📢",
    bg: ICON_BG.announce,
    hasBadge: false,
  },
  {
    key: "team",
    label: "Team CL",
    href: "/checklist",
    icon: BarChart3,
    emoji: "📊",
    bg: ICON_BG.team,
    hasBadge: false,
  },
];

// Màu surface theo quán (cho badge border)
const SURFACE_COLORS: Record<string, string> = {
  enso: "#D8F3DC",
  origami: "#F5EFE6",
  okyu: "#FFEBEE",
};

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
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: runs } = await supabase
        .from("checklist_runs")
        .select("progress")
        .eq("date", todayStr)
        .limit(1)
        .maybeSingle();

      // Nếu progress < 100 thì hiện badge
      if (runs && runs.progress < 100) {
        // Hiện số % chưa xong (ước lượng số item)
        const remaining = Math.max(1, Math.ceil((100 - runs.progress) / 10));
        setChecklistBadge(remaining);
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

  // Thay đổi icon bg checklist theo quán
  const surfaceColor = SURFACE_COLORS[locationId] ?? SURFACE_COLORS.enso;
  actions[0] = { ...actions[0], bg: surfaceColor };

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
              onClick={() => router.push(action.href)}
              className="flex flex-col items-center gap-[5px]"
            >
              <div
                className="relative flex items-center justify-center rounded-2xl"
                style={{
                  width: 50,
                  height: 50,
                  background: action.bg,
                  fontSize: 20,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                }}
              >
                {action.emoji}
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
                onClick={() => router.push(action.href)}
                className="flex flex-col items-center gap-[5px]"
              >
                <div
                  className="relative flex items-center justify-center rounded-2xl"
                  style={{
                    width: 50,
                    height: 50,
                    background: action.bg,
                    fontSize: 20,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                  }}
                >
                  {action.emoji}
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
