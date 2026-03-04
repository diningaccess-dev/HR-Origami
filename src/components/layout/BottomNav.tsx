"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ── Tab definitions ──────────────────────────────────────────
type Tab = {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
};

// Lucide-style SVG icons inline (tránh thêm package)
function IconHome({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function IconCalendar({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function IconChecklist({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? "2.5" : "2"}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 18H3" />
      <path d="M11 12H3" />
      <path d="M11 6H3" />
      <path d="m15 18 2 2 4-4" />
      <path d="m15 12 2 2 4-4" />
      <path d="m15 6 2 2 4-4" />
    </svg>
  );
}

function IconApproval({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconMoney({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 18V6" />
    </svg>
  );
}

function IconProfile({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

function IconBook({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconChat({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ── Staff/Azubi tabs ─────────────────────────────────────────
const STAFF_TABS: Tab[] = [
  {
    href: "/home",
    label: "Home",
    icon: (a) => <IconHome active={a} />,
  },
  {
    href: "/schedule",
    label: "Lịch",
    icon: (a) => <IconCalendar active={a} />,
  },
  {
    href: "/studyhub",
    label: "Học",
    icon: (a) => <IconBook active={a} />,
  },
  {
    href: "/chat",
    label: "Chat",
    icon: (a) => <IconChat active={a} />,
  },
  {
    href: "/hr",
    label: "Hồ sơ",
    icon: (a) => <IconProfile active={a} />,
  },
];

// ── Manager/Owner tabs ───────────────────────────────────────
const MANAGER_TABS: Tab[] = [
  {
    href: "/home",
    label: "Home",
    icon: (a) => <IconHome active={a} />,
  },
  {
    href: "/schedule",
    label: "Lịch",
    icon: (a) => <IconCalendar active={a} />,
  },
  {
    href: "/studyhub",
    label: "Học",
    icon: (a) => <IconBook active={a} />,
  },
  {
    href: "/checklist",
    label: "Checklist",
    icon: (a) => <IconChecklist active={a} />,
  },
  {
    href: "/finance/tip-pool",
    label: "Tip",
    icon: (a) => <IconMoney active={a} />,
  },
  {
    href: "/admin/approval",
    label: "Duyệt",
    icon: (a) => <IconApproval active={a} />,
  },
  {
    href: "/hr",
    label: "Hồ sơ",
    icon: (a) => <IconProfile active={a} />,
  },
];

// ── Component ────────────────────────────────────────────────
type BottomNavProps = {
  role: string;
  locationId: string;
};

export default function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const brandColor = "var(--brand-color)";
  const [requiredBadge, setRequiredBadge] = useState(0);

  // Fetch số khóa bắt buộc chưa hoàn thành → hiện badge đỏ
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // Lấy tất cả khóa bắt buộc đã published
        const { data: requiredCourses } = await supabase
          .from("courses")
          .select("id")
          .eq("is_required", true)
          .not("published_at", "is", null);

        if (!requiredCourses || requiredCourses.length === 0 || cancelled) return;

        const courseIds = requiredCourses.map((c) => c.id);

        // Lấy enrollment đã hoàn thành của user
        const { data: completed } = await supabase
          .from("course_enrollments")
          .select("course_id")
          .eq("profile_id", user.id)
          .not("completed_at", "is", null)
          .in("course_id", courseIds);

        const completedIds = new Set((completed ?? []).map((e) => e.course_id));
        const missing = courseIds.filter((id) => !completedIds.has(id));

        if (!cancelled) setRequiredBadge(missing.length);
      } catch {
        // badge không hiện nếu lỗi → silent fail
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const tabs =
    role === "manager" || role === "owner" ? MANAGER_TABS : STAFF_TABS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-foreground/10 bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 py-1">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          const showBadge = tab.href === "/studyhub" && requiredBadge > 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]"
              style={{ color: isActive ? brandColor : undefined }}
            >
              {/* Icon + badge wrapper */}
              <span className={`relative ${isActive ? "" : "text-foreground/40"}`}>
                {tab.icon(isActive)}
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                    {requiredBadge}
                  </span>
                )}
              </span>
              <span className={isActive ? "font-medium" : "text-foreground/40"}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
