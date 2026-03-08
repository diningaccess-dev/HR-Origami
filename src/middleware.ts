import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Các route không cần guard (cho user chưa login hoặc chưa active)
const PUBLIC_ROUTES = ["/login", "/register", "/pending"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bỏ qua /api/* routes
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Bỏ qua static PWA files — KHÔNG redirect sw.js, manifest.json, icons
  if (
    pathname === "/sw.js" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/icons")
  ) {
    return NextResponse.next();
  }

  // Khởi tạo response để có thể ghi cookie
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Ghi cookie vào request (cho server components phía sau)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Tạo lại response với request đã cập nhật cookie
          supabaseResponse = NextResponse.next({ request });
          // Ghi cookie vào response (cho browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Đọc session — PHẢI dùng getUser() để verify JWT với Supabase Auth server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── 1. Chưa login ──────────────────────────────────────────
  if (!user) {
    if (pathname === "/login" || pathname === "/register")
      return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ── 2. Đã login → lấy status từ bảng profiles ─────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  const status: string = profile?.status ?? "pending";

  // ── 3. Redirect theo status ────────────────────────────────
  if (status === "pending") {
    if (pathname === "/pending") return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/pending";
    return NextResponse.redirect(url);
  }

  if (status === "suspended") {
    if (pathname === "/suspended") return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/suspended";
    return NextResponse.redirect(url);
  }

  // ── 4. Active → không cho vào các trang trạng thái ────────
  if (status === "active") {
    // Nếu user active mà vào /login, /pending, /suspended → về trang chủ
    if (PUBLIC_ROUTES.includes(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Fallback: status không xác định → về pending
  const url = request.nextUrl.clone();
  url.pathname = "/pending";
  return NextResponse.redirect(url);
}

// Chỉ chạy middleware trên các route cần thiết
// Bỏ qua static files, _next, favicon, sw.js, manifest.json, icons/
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
