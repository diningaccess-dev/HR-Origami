import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import ChannelList from "@/components/features/chat/ChannelList";
import type { ChannelWithPreview } from "@/components/features/chat/ChannelList";

// Background surface theo quán
const SCREEN_BG: Record<string, string> = {
  enso: "#f4f7f5",
  origami: "#faf6f2",
  okyu: "#fdf4f4",
};

const LOCATION_LABELS: Record<string, string> = {
  enso: "Enso",
  origami: "Origami",
  okyu: "Okyu",
};

export default async function ChatPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ── Profile ──────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, location_id")
    .eq("id", user.id)
    .single();

  const locationId = profile?.location_id ?? "enso";
  const locationLabel = LOCATION_LABELS[locationId] ?? locationId;
  const bgColor = SCREEN_BG[locationId] ?? SCREEN_BG.enso;

  // ── Channels với preview ─────────────────────────────────
  const { data: channels } = await supabase
    .from("channels")
    .select("id, name, type")
    .eq("location_id", locationId)
    .order("created_at", { ascending: true });

  // Lấy tin nhắn mới nhất + đếm unread cho mỗi channel
  const channelsWithPreview: ChannelWithPreview[] = [];

  for (const ch of channels ?? []) {
    // Tin nhắn mới nhất
    const { data: lastMsg } = await supabase
      .from("messages")
      .select("body, created_at, profiles!sender_id(full_name)")
      .eq("channel_id", ch.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Đếm unread — silent fail nếu lỗi
    let unreadCount = 0;
    try {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("channel_id", ch.id)
        .neq("sender_id", user.id)
        .not("read_by", "cs", `{${user.id}}`);
      unreadCount = count ?? 0;
    } catch {
      // read_by column có thể không tồn tại
    }

    const senderProfile = lastMsg?.profiles as unknown as {
      full_name: string;
    } | null;

    channelsWithPreview.push({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      last_message_body: (lastMsg?.body as string) ?? null,
      last_message_sender: senderProfile?.full_name ?? null,
      last_message_at: (lastMsg?.created_at as string) ?? null,
      unread_count: unreadCount,
    });
  }

  return (
    <div style={{ background: bgColor, minHeight: "100dvh" }}>
      {/* Header */}
      <div
        className="bg-white border-b border-black/5"
        style={{ padding: "12px 16px 10px" }}
      >
        <div className="flex items-center justify-between">
          <h1
            style={{
              fontFamily: "Sora, sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: "#1a1a1a",
            }}
          >
            Chat
          </h1>
          <span style={{ fontSize: 10, color: "#aaa", fontWeight: 600 }}>
            {channelsWithPreview.length} kênh
          </span>
        </div>
      </div>

      {/* Channel list */}
      <ChannelList
        channels={channelsWithPreview}
        locationLabel={locationLabel}
      />
    </div>
  );
}
