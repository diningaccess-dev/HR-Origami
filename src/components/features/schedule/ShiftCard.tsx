import { format } from "date-fns";

// Màu accent bar + badge theo role_tag
const ROLE_COLORS: Record<
  string,
  { accent: string; bg: string; text: string; label: string }
> = {
  kitchen: {
    accent: "var(--brand-color)",
    bg: "var(--brand-surface, #D8F3DC)",
    text: "var(--brand-color)",
    label: "Bếp",
  },
  service: {
    accent: "#0ea5e9",
    bg: "#e0f2fe",
    text: "#0369a1",
    label: "Service",
  },
  bar: {
    accent: "#fbbf24",
    bg: "#fef9c3",
    text: "#a16207",
    label: "Bar",
  },
  all: {
    accent: "#a855f7",
    bg: "#f3e8ff",
    text: "#7c3aed",
    label: "Tất cả",
  },
};

// Status badge config
function getStatusBadge(shift: ShiftData) {
  if (shift.attendance_checkout) {
    return { label: "✓ Xong", className: "done" };
  }
  if (shift.attendance_checkin) {
    return { label: "✓ Đang làm", className: "checked-in" };
  }
  if (shift.is_marketplace && !shift.profile_name) {
    return { label: "Tuyển", className: "open" };
  }
  if (shift.is_marketplace) {
    return { label: "Cần người", className: "open" };
  }
  return { label: "Chờ vào", className: "scheduled" };
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  "checked-in": { bg: "#d1fae5", color: "#065f46" },
  scheduled: { bg: "#f3f4f6", color: "#6b7280" },
  open: { bg: "#fef3c7", color: "#92400e" },
  done: { bg: "#ede9fe", color: "#5b21b6" },
};

export type ShiftData = {
  id: string;
  start_time: string;
  end_time: string;
  role_tag: string | null;
  status: string;
  is_marketplace: boolean;
  profile_name: string | null;
  profile_id: string | null;
  attendance_checkin: string | null;
  attendance_checkout: string | null;
};

type ShiftCardProps = {
  shift: ShiftData;
};

export default function ShiftCard({ shift }: ShiftCardProps) {
  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time);
  const startStr = format(start, "HH:mm");
  const endStr = format(end, "HH:mm");

  // Tính số giờ
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const hoursStr = hours % 1 === 0 ? `${hours} giờ` : `${hours.toFixed(1)} giờ`;

  const role = shift.role_tag ?? "all";
  const roleStyle = ROLE_COLORS[role] ?? ROLE_COLORS.all;
  const statusBadge = getStatusBadge(shift);
  const badgeStyle =
    STATUS_STYLES[statusBadge.className] ?? STATUS_STYLES.scheduled;

  // Ca trống: dashed border đỏ
  const isOpen = shift.is_marketplace && !shift.profile_id;

  return (
    <div
      className="relative flex items-center gap-3 rounded-[18px] overflow-hidden"
      style={{
        padding: "14px 15px",
        background: isOpen ? "#fff8f8" : "#fff",
        border: isOpen ? "2px dashed #fca5a5" : "none",
        boxShadow: isOpen ? "none" : "0 2px 10px rgba(0,0,0,0.06)",
      }}
    >
      {/* Accent bar trái */}
      <div
        className="absolute left-0 top-0 bottom-0 rounded-r"
        style={{
          width: 4,
          background: isOpen ? "#fca5a5" : roleStyle.accent,
        }}
      />

      {/* Cột giờ */}
      <div className="flex flex-col items-center" style={{ minWidth: 44 }}>
        <span
          style={{
            fontFamily: "Sora, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: isOpen ? "#ef4444" : "#1a1a1a",
            lineHeight: 1,
          }}
        >
          {startStr}
        </span>
        <span style={{ fontSize: 9, color: "#ccc", margin: "2px 0" }}>↓</span>
        <span
          style={{
            fontFamily: "Sora, sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: "#999",
            lineHeight: 1,
          }}
        >
          {endStr}
        </span>
      </div>

      {/* Divider */}
      <div
        className="shrink-0"
        style={{ width: 1, height: 36, background: "#eee" }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Role tag badge */}
        <span
          className="inline-flex items-center gap-1 rounded-md mb-1"
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase" as const,
            padding: "2px 8px",
            background: isOpen ? "#fee2e2" : roleStyle.bg,
            color: isOpen ? "#dc2626" : roleStyle.text,
          }}
        >
          {roleStyle.label}
        </span>

        {/* Tên nhân viên */}
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isOpen ? "#ef4444" : "#1a1a1a",
            marginBottom: 1,
          }}
        >
          {shift.profile_name ?? "Chưa có người"}
        </p>

        {/* Số giờ */}
        <p
          style={{
            fontSize: 11,
            color: isOpen ? "#fca5a5" : "#aaa",
          }}
        >
          {hoursStr}
          {isOpen && " · Cần gấp"}
        </p>
      </div>

      {/* Status badge */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className="rounded-full"
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "3px 8px",
            letterSpacing: "0.04em",
            textTransform: "uppercase" as const,
            background: badgeStyle.bg,
            color: badgeStyle.color,
          }}
        >
          {statusBadge.label}
        </span>
      </div>
    </div>
  );
}
