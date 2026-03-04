"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

function IconCheckin({ active }: { active: boolean }) {
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
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
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
    href: "/checkin",
    label: "Check-in",
    icon: (a) => <IconCheckin active={a} />,
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
    href: "/chat",
    label: "Chat",
    icon: (a) => <IconChat active={a} />,
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
  // brandColor được inject bởi layout qua CSS custom property --brand-color
  const brandColor = "var(--brand-color)";

  const tabs =
    role === "manager" || role === "owner" ? MANAGER_TABS : STAFF_TABS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-foreground/10 bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 py-1">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]"
              style={{ color: isActive ? brandColor : undefined }}
            >
              <span className={isActive ? "" : "text-foreground/40"}>
                {tab.icon(isActive)}
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
