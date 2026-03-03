import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";
import UrgentOverlay from "@/components/features/UrgentOverlay";
import { getBrandColor } from "@/lib/utils/theme";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  // Lấy user hiện tại
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Lấy role + location_id từ profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, location_id")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "staff";
  const locationId = profile?.location_id ?? "enso";
  const brandColor = getBrandColor(locationId);

  return (
    <div
      className="min-h-dvh bg-background pb-20"
      style={{ "--brand-color": brandColor } as React.CSSProperties}
    >
      {children}
      <UrgentOverlay />
      <BottomNav role={role} locationId={locationId} />
    </div>
  );
}
