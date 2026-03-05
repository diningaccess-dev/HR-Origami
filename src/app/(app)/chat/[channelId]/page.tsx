import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import ChatWindow from "@/components/features/chat/ChatWindow";

// Background surface theo quán
const SCREEN_BG: Record<string, string> = {
  enso: "#f4f7f5",
  origami: "#faf6f2",
  okyu: "#fdf4f4",
};

export default async function ChatChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
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
    .select("full_name, location_id")
    .eq("id", user.id)
    .single();

  const locationId = profile?.location_id ?? "enso";
  const bgColor = SCREEN_BG[locationId] ?? SCREEN_BG.enso;

  // ── Channel info ─────────────────────────────────────────
  const { data: channel } = await supabase
    .from("channels")
    .select("id, name, type")
    .eq("id", channelId)
    .single();

  if (!channel) redirect("/chat");

  // ── Đếm số thành viên (profiles cùng location) ──────────
  const { count: memberCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("location_id", locationId)
    .eq("status", "active");

  return (
    <div
      className="flex flex-col"
      style={{ background: bgColor, height: "100dvh" }}
    >
      <ChatWindow
        channelId={channel.id}
        channelName={channel.name}
        channelType={channel.type}
        memberCount={memberCount ?? 0}
        currentUserId={user.id}
        currentUserName={profile?.full_name ?? "User"}
      />
    </div>
  );
}
