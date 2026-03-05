import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

// Avatar colors theo channel type
const CHANNEL_STYLES: Record<
  string,
  { bg: string; color: string; emoji: string }
> = {
  location: {
    bg: "var(--brand-surface, #D8F3DC)",
    color: "var(--brand-color)",
    emoji: "🏠",
  },
  role_kitchen: { bg: "#fef3c7", color: "#d97706", emoji: "🍳" },
  role_service: { bg: "#e0f2fe", color: "#0369a1", emoji: "🍜" },
  role_bar: { bg: "#fef9c3", color: "#a16207", emoji: "🍶" },
  announcement: { bg: "#ede9fe", color: "#7c3aed", emoji: "📢" },
};

function getChannelStyle(type: string, name: string) {
  if (type === "role") {
    const lower = name.toLowerCase();
    if (lower.includes("bếp") || lower.includes("kitchen"))
      return CHANNEL_STYLES.role_kitchen;
    if (lower.includes("service")) return CHANNEL_STYLES.role_service;
    if (lower.includes("bar")) return CHANNEL_STYLES.role_bar;
  }
  return CHANNEL_STYLES[type] ?? CHANNEL_STYLES.location;
}

export type ChannelWithPreview = {
  id: string;
  name: string;
  type: string;
  last_message_body: string | null;
  last_message_sender: string | null;
  last_message_at: string | null;
  unread_count: number;
};

type ChannelListProps = {
  channels: ChannelWithPreview[];
  locationLabel: string;
};

export default function ChannelList({
  channels,
  locationLabel,
}: ChannelListProps) {
  if (!channels || channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <span style={{ fontSize: 36 }}>💬</span>
        <p style={{ fontSize: 13, color: "#aaa", fontWeight: 500 }}>
          Chưa có kênh nào
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5" style={{ padding: "10px 12px" }}>
      {channels.map((ch) => {
        const style = getChannelStyle(ch.type, ch.name);

        // Preview text
        const preview = ch.last_message_body
          ? ch.last_message_sender
            ? `${ch.last_message_sender}: ${ch.last_message_body}`
            : ch.last_message_body
          : `Bắt đầu trò chuyện tại ${locationLabel} 👋`;

        // Relative time
        const timeLabel = ch.last_message_at
          ? formatDistanceToNow(new Date(ch.last_message_at), {
              addSuffix: false,
              locale: vi,
            })
          : null;

        return (
          <Link
            key={ch.id}
            href={`/chat/${ch.id}`}
            className="flex items-center gap-2.5 rounded-2xl bg-white cursor-pointer transition-transform duration-100 active:scale-[0.98]"
            style={{
              padding: "10px 12px",
              boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {/* Avatar */}
            <div
              className="flex shrink-0 items-center justify-center rounded-xl font-bold"
              style={{
                width: 40,
                height: 40,
                background: style.bg,
                color: style.color,
                fontSize: 18,
                fontFamily: "Sora, sans-serif",
              }}
            >
              {style.emoji}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p
                className="mb-0.5 truncate"
                style={{
                  fontFamily: "Sora, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#1a1a1a",
                }}
              >
                {style.emoji === "🏠" ? `🏠 Toàn quán ${ch.name}` : ch.name}
              </p>
              <p className="truncate" style={{ fontSize: 11, color: "#999" }}>
                {preview}
              </p>
            </div>

            {/* Meta: time + badge */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {timeLabel && (
                <span style={{ fontSize: 10, color: "#ccc" }}>{timeLabel}</span>
              )}
              {ch.unread_count > 0 && (
                <span
                  className="flex items-center justify-center rounded-full bg-red-500 text-white"
                  style={{
                    width: 18,
                    height: 18,
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "Sora, sans-serif",
                  }}
                >
                  {ch.unread_count > 9 ? "9+" : ch.unread_count}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
