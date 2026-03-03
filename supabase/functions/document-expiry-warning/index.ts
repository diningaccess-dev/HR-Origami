// Supabase Edge Function — Document Expiry Warning
// Cron: 0 8 * * * (8:00 sáng mỗi ngày, Europe/Berlin)
// Kiểm tra documents sắp hết hạn trong 30 ngày, ghi log + notification

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DOCUMENT_EXPIRY_WARNING_DAYS = 30;

const TYPE_LABELS: Record<string, string> = {
  contract: "Hợp đồng",
  rote_karte: "Rote Karte",
  gesundheitszeugnis: "Gesundheitszeugnis",
  au: "AU Bescheinigung",
  other: "Giấy tờ khác",
};

Deno.serve(async (req) => {
  try {
    // ── Khởi tạo Supabase Admin client ─────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // ── Tính khoảng ngày ───────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().split("T")[0];

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + DOCUMENT_EXPIRY_WARNING_DAYS);
    const futureDateISO = futureDate.toISOString().split("T")[0];

    console.log(
      `[document-expiry] Kiểm tra documents hết hạn từ ${todayISO} đến ${futureDateISO}`,
    );

    // ── Query documents sắp hết hạn ────────────────────────
    const { data: expiringDocs, error: queryError } = await supabase
      .from("documents")
      .select(
        `
        id, type, expires_at, profile_id,
        profiles!profile_id ( full_name, location_id )
      `,
      )
      .gte("expires_at", todayISO)
      .lte("expires_at", futureDateISO)
      .order("expires_at", { ascending: true });

    if (queryError) {
      console.error("[document-expiry] Lỗi query documents:", queryError);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!expiringDocs || expiringDocs.length === 0) {
      console.log("[document-expiry] Không có document sắp hết hạn.");
      return new Response(JSON.stringify({ checked: 0, warned: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(
      `[document-expiry] Tìm thấy ${expiringDocs.length} documents sắp hết hạn`,
    );

    // ── Cache managers theo location ───────────────────────
    const managerCache = new Map<string, { id: string; full_name: string }[]>();

    async function getManagers(locationId: string) {
      if (managerCache.has(locationId)) {
        return managerCache.get(locationId)!;
      }

      const { data: managers } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("location_id", locationId)
        .in("role", ["manager", "owner"])
        .eq("status", "active");

      const result = managers ?? [];
      managerCache.set(locationId, result);
      return result;
    }

    // ── Xử lý từng document ────────────────────────────────
    let warnedCount = 0;

    for (const doc of expiringDocs) {
      try {
        const profile = doc.profiles as {
          full_name: string;
          location_id: string;
        } | null;

        if (!profile) {
          console.warn(
            `[document-expiry] Document ${doc.id}: không tìm thấy profile`,
          );
          continue;
        }

        const daysLeft = Math.ceil(
          (new Date(doc.expires_at).getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        const typeLabel = TYPE_LABELS[doc.type] ?? doc.type;
        const locationId = profile.location_id;

        // Log chi tiết
        console.log(
          `[document-expiry] ⚠ ${profile.full_name}: ${typeLabel} hết hạn trong ${daysLeft} ngày (${doc.expires_at})`,
        );

        // Lấy managers của cùng location
        const managers = await getManagers(locationId);

        if (managers.length === 0) {
          console.warn(
            `[document-expiry] Location "${locationId}": không có manager nào active`,
          );
        }

        // ── Ghi notification cho nhân viên ──────────────────
        // Kiểm tra đã gửi hôm nay chưa (tránh trùng)
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("profile_id", doc.profile_id)
          .eq("ref_id", doc.id)
          .gte("created_at", `${todayISO}T00:00:00`)
          .limit(1);

        if (!existingNotif || existingNotif.length === 0) {
          const { error: insertErr } = await supabase
            .from("notifications")
            .insert({
              profile_id: doc.profile_id,
              type: "document_expiry",
              title: `${typeLabel} sắp hết hạn`,
              body: `Giấy tờ "${typeLabel}" của bạn sẽ hết hạn trong ${daysLeft} ngày (${doc.expires_at}).`,
              ref_id: doc.id,
              is_read: false,
            });

          if (insertErr) {
            // Bảng notifications có thể chưa tồn tại → chỉ log, không crash
            console.warn(
              `[document-expiry] Không thể ghi notification cho ${profile.full_name}:`,
              insertErr.message,
            );
          } else {
            console.log(
              `[document-expiry] ✓ Notification cho ${profile.full_name}`,
            );
          }
        } else {
          console.log(
            `[document-expiry] Đã gửi notification cho ${profile.full_name} hôm nay, bỏ qua`,
          );
        }

        // ── Ghi notification cho managers ────────────────────
        for (const manager of managers) {
          // Không gửi cho chính nhân viên đó (nếu cũng là manager)
          if (manager.id === doc.profile_id) continue;

          const { data: existingMgrNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("profile_id", manager.id)
            .eq("ref_id", doc.id)
            .gte("created_at", `${todayISO}T00:00:00`)
            .limit(1);

          if (!existingMgrNotif || existingMgrNotif.length === 0) {
            const { error: mgrErr } = await supabase
              .from("notifications")
              .insert({
                profile_id: manager.id,
                type: "document_expiry",
                title: `${typeLabel} của ${profile.full_name} sắp hết hạn`,
                body: `Giấy tờ "${typeLabel}" của ${profile.full_name} sẽ hết hạn trong ${daysLeft} ngày (${doc.expires_at}).`,
                ref_id: doc.id,
                is_read: false,
              });

            if (mgrErr) {
              console.warn(
                `[document-expiry] Không thể ghi notification cho manager ${manager.full_name}:`,
                mgrErr.message,
              );
            } else {
              console.log(
                `[document-expiry] ✓ Notification cho manager ${manager.full_name}`,
              );
            }
          }
        }

        warnedCount++;
      } catch (docError) {
        // Lỗi 1 record → bỏ qua, xử lý tiếp
        console.error(
          `[document-expiry] Lỗi xử lý document ${doc.id}:`,
          docError,
        );
        continue;
      }
    }

    // ── Tổng kết ───────────────────────────────────────────
    const summary = `Đã kiểm tra ${expiringDocs.length} documents, cảnh báo ${warnedCount}`;
    console.log(`[document-expiry] ✅ ${summary}`);

    return new Response(
      JSON.stringify({
        checked: expiringDocs.length,
        warned: warnedCount,
        summary,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[document-expiry] Lỗi không xử lý được:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
