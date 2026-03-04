import { format } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";

// Gradient colors theo quán
const HERO_GRADIENTS: Record<string, string> = {
  enso: "linear-gradient(135deg, #2D6A4F 0%, #40916C 60%, #52B788 100%)",
  origami: "linear-gradient(135deg, #6B5A45 0%, #8B7355 60%, #B5936A 100%)",
  okyu: "linear-gradient(135deg, #8E0000 0%, #C62828 60%, #EF5350 100%)",
};

// Màu nút Check-in theo quán
const CHECKIN_COLORS: Record<string, string> = {
  enso: "#2D6A4F",
  origami: "#6B5A45",
  okyu: "#8E0000",
};

const ROLE_TAG_EMOJI: Record<string, string> = {
  bar: "🍶",
  kitchen: "🍳",
  service: "🍜",
  all: "⭐",
};

const ROLE_TAG_LABELS: Record<string, string> = {
  bar: "Bar",
  kitchen: "Bếp",
  service: "Service",
  all: "Tất cả",
};

const LOCATION_LABELS: Record<string, string> = {
  enso: "Enso Stuttgart",
  origami: "Origami Stuttgart",
  okyu: "Okyu Stuttgart",
};

type Shift = {
  id: string;
  start_time: string;
  end_time: string;
  role_tag: string;
  status: string;
};

type HeroCardProps = {
  fullName: string;
  locationId: string;
  shift: Shift | null;
  hasCheckedIn: boolean;
};

export default function HeroCard({
  fullName,
  locationId,
  shift,
  hasCheckedIn,
}: HeroCardProps) {
  const gradient = HERO_GRADIENTS[locationId] ?? HERO_GRADIENTS.enso;
  const checkinColor = CHECKIN_COLORS[locationId] ?? CHECKIN_COLORS.enso;
  const locationLabel = LOCATION_LABELS[locationId] ?? locationId;

  const today = format(new Date(), "EEEE", { locale: de });

  return (
    <div
      className="relative overflow-hidden px-[18px] pt-[18px] pb-5"
      style={{ background: gradient, color: "#fff" }}
    >
      {/* Decorative pattern */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Greeting */}
      <p
        className="relative mb-0.5"
        style={{
          fontFamily: "Sora, sans-serif",
          fontSize: 11,
          fontWeight: 500,
          opacity: 0.75,
        }}
      >
        Xin chào 👋
      </p>
      <h1
        className="relative mb-4"
        style={{
          fontFamily: "Sora, sans-serif",
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.1,
        }}
      >
        {fullName}
      </h1>

      {/* Shift card hoặc empty state */}
      {shift ? (
        <div
          className="relative rounded-[18px] p-[14px_16px]"
          style={{
            background: "rgba(255,255,255,0.18)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          {/* Top row: label + role badge */}
          <div className="flex items-center justify-between mb-2.5">
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                opacity: 0.7,
              }}
            >
              Ca hôm nay
            </span>
            <span
              className="rounded-full"
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "3px 8px",
                background: "rgba(255,255,255,0.25)",
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
              }}
            >
              {ROLE_TAG_LABELS[shift.role_tag] ?? shift.role_tag}{" "}
              {ROLE_TAG_EMOJI[shift.role_tag] ?? ""}
            </span>
          </div>

          {/* Time */}
          <p
            style={{
              fontFamily: "Sora, sans-serif",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {format(new Date(shift.start_time), "HH:mm")} –{" "}
            {format(new Date(shift.end_time), "HH:mm")}
          </p>

          {/* Day + location */}
          <p
            style={{
              fontSize: 12,
              fontWeight: 500,
              opacity: 0.75,
              marginBottom: 14,
            }}
          >
            {today} · {locationLabel}
          </p>

          {/* Check-in / Check-out button */}
          <Link
            href="/checkin"
            className="flex w-full items-center justify-center gap-1.5 rounded-[14px] border-none py-[11px]"
            style={{
              background: "rgba(255,255,255,0.95)",
              fontFamily: "Sora, sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.03em",
              color: checkinColor,
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            }}
          >
            <span>📍</span>
            <span>{hasCheckedIn ? "Check Out" : "Check In ngay"}</span>
          </Link>
        </div>
      ) : (
        <div
          className="relative rounded-[18px] p-4 text-center"
          style={{
            background: "rgba(255,255,255,0.18)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          <p style={{ fontSize: 14, opacity: 0.85 }}>
            Hôm nay bạn không có ca 🌿
          </p>
        </div>
      )}
    </div>
  );
}
