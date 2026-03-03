import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// ── VAPID config ─────────────────────────────────────────────
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

// ── Supabase admin (service role để bypass RLS khi gửi push) ─
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── POST /api/push/subscribe — lưu subscription vào DB ───────
// ── POST /api/push/send      — gửi push đến danh sách users ─
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "subscribe") {
    return handleSubscribe(req);
  }

  if (action === "send") {
    return handleSend(req);
  }

  return NextResponse.json(
    { error: "action phải là subscribe hoặc send" },
    { status: 400 },
  );
}

// ── Subscribe ─────────────────────────────────────────────────
async function handleSubscribe(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile_id, subscription, user_agent } = body as {
      profile_id: string;
      subscription: PushSubscriptionJSON;
      user_agent?: string;
    };

    if (!profile_id || !subscription?.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Thiếu thông tin subscription" },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();

    // Upsert subscription (cùng endpoint → cập nhật keys)
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        profile_id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: user_agent ?? null,
      },
      { onConflict: "profile_id,endpoint" },
    );

    if (error) {
      console.error("[push/subscribe] Lỗi lưu subscription:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] Lỗi không xử lý được:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── Send ──────────────────────────────────────────────────────
async function handleSend(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile_ids, title, message, url } = body as {
      profile_ids: string[];
      title: string;
      message: string;
      url?: string;
    };

    if (!profile_ids?.length || !title || !message) {
      return NextResponse.json(
        { error: "Thiếu profile_ids, title hoặc message" },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();

    // Lấy subscriptions của tất cả user cần gửi
    const { data: subs, error: queryErr } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("profile_id", profile_ids);

    if (queryErr) {
      console.error("[push/send] Lỗi query subscriptions:", queryErr);
      return NextResponse.json({ error: queryErr.message }, { status: 500 });
    }

    if (!subs || subs.length === 0) {
      console.log("[push/send] Không có subscription nào");
      return NextResponse.json({ sent: 0 });
    }

    const payload = JSON.stringify({ title, message, url: url ?? "/" });

    let sentCount = 0;
    const expiredIds: string[] = [];

    // Gửi từng subscription — lỗi 1 cái không ảnh hưởng cái khác
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
          sentCount++;
        } catch (err: unknown) {
          // Subscription expired hoặc invalid (HTTP 410 Gone)
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 410 || statusCode === 404) {
            console.log(`[push/send] Subscription hết hạn, xóa: ${sub.id}`);
            expiredIds.push(sub.id);
          } else {
            console.error(`[push/send] Lỗi gửi tới ${sub.endpoint}:`, err);
          }
        }
      }),
    );

    // Dọn expired subscriptions
    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }

    console.log(`[push/send] ✅ Đã gửi ${sentCount}/${subs.length} push`);
    return NextResponse.json({ sent: sentCount, expired: expiredIds.length });
  } catch (err) {
    console.error("[push/send] Lỗi không xử lý được:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
