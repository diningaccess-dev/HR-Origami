import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

// Màu surface theo quán cho icon background
const SURFACE_COLORS: Record<string, string> = {
  enso: "#D8F3DC",
  origami: "#F5EFE6",
  okyu: "#FFEBEE",
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  is_urgent: boolean;
  created_at: string;
  confirmed_by: string[];
};

type AnnouncementListProps = {
  announcements: Announcement[];
  locationId: string;
  userId: string;
};

export default function AnnouncementList({
  announcements,
  locationId,
  userId,
}: AnnouncementListProps) {
  if (!announcements || announcements.length === 0) return null;

  const surfaceColor = SURFACE_COLORS[locationId] ?? SURFACE_COLORS.enso;

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
        Thông báo
      </h2>

      <div className="flex flex-col gap-2.5">
        {announcements.map((a) => {
          const isUrgent = a.is_urgent;
          const isUnread = !(a.confirmed_by ?? []).includes(userId);

          // Thời gian tương đối
          const timeAgo = formatDistanceToNow(new Date(a.created_at), {
            addSuffix: true,
            locale: vi,
          });

          return (
            <div
              key={a.id}
              className="flex items-start gap-2.5 rounded-2xl"
              style={{
                padding: "13px 15px",
                background: isUrgent ? "#fff1f1" : "#fff",
                border: isUrgent ? "1px solid #fecaca" : "none",
                boxShadow: isUrgent ? "none" : "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              {/* Icon */}
              <div
                className="flex shrink-0 items-center justify-center rounded-[10px]"
                style={{
                  width: 34,
                  height: 34,
                  fontSize: 16,
                  background: isUrgent ? "#fee2e2" : surfaceColor,
                }}
              >
                {isUrgent ? "🚨" : "📢"}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p
                  className="mb-0.5"
                  style={{
                    fontFamily: "Sora, sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    color: isUrgent ? "#991b1b" : "#1a1a1a",
                  }}
                >
                  {a.title}
                </p>
                <p
                  className="line-clamp-2"
                  style={{
                    fontSize: 11,
                    lineHeight: 1.4,
                    color: isUrgent ? "#7f1d1d" : "#777",
                  }}
                >
                  {a.body}
                </p>
                <p
                  className="mt-1"
                  style={{
                    fontSize: 10,
                    color: isUrgent ? "#f87171" : "#bbb",
                  }}
                >
                  {timeAgo}
                  {isUnread && (
                    <span
                      className="ml-2 font-bold"
                      style={{ color: isUrgent ? "#ef4444" : "#f97316" }}
                    >
                      · Chưa đọc
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
