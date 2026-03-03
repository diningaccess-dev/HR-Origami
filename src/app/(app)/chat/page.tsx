import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import ChatWindow from "@/components/features/ChatWindow";

// Label hiển thị tên quán
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

  // ── Lấy user hiện tại ──────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ── Lấy profile ────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, location_id, avatar_url")
    .eq("id", user.id)
    .single();

  const locationId = profile?.location_id ?? "enso";
  const locationLabel = LOCATION_LABELS[locationId] ?? locationId;

  // ── Lấy danh sách channels của location ─────────────────
  const { data: channels } = await supabase
    .from("channels")
    .select("id, name, type")
    .eq("location_id", locationId)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto flex h-[calc(100dvh-5rem)] max-w-md flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-foreground/10 px-4 py-3">
        <h1 className="text-lg font-bold text-foreground">Chat</h1>
        <p className="text-xs text-foreground/50">{locationLabel}</p>
      </div>

      {/* Chat Window — client component */}
      <ChatWindow
        channels={channels ?? []}
        currentUserId={user.id}
        currentUserName={profile?.full_name ?? "User"}
        currentUserAvatar={profile?.avatar_url ?? null}
        locationLabel={locationLabel}
      />
    </div>
  );
}
