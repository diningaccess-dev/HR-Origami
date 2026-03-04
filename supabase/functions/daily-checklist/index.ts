// supabase/functions/daily-checklist/index.ts
// Edge Function — tự động tạo checklist_run mỗi ngày lúc 5h sáng
// Cron: "0 5 * * *" (Europe/Berlin)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Cho phép gọi từ cron hoặc HTTP
Deno.serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── 1. Ngày hôm nay (UTC → Europe/Berlin) ─────────────────
    const now = new Date();
    // Lấy date string theo timezone Berlin
    const today = now.toLocaleDateString("sv-SE", {
      timeZone: "Europe/Berlin",
    }); // "2026-03-04"

    console.log(`[daily-checklist] 🟢 Bắt đầu — ngày: ${today}`);

    // ── 2. Lấy tất cả checklist_templates ──────────────────────
    const { data: templates, error: tplErr } = await supabase
      .from("checklist_templates")
      .select("id, location_id, name, type");

    if (tplErr) {
      console.error("[daily-checklist] Lỗi query templates:", tplErr.message);
      return new Response(JSON.stringify({ error: tplErr.message }), {
        status: 500,
      });
    }

    if (!templates || templates.length === 0) {
      console.log("[daily-checklist] Không có template nào — bỏ qua");
      return new Response(JSON.stringify({ created: 0, skipped: 0 }));
    }

    console.log(`[daily-checklist] Tìm thấy ${templates.length} templates`);

    // ── 3. Lấy checklist_runs đã có của ngày hôm nay ──────────
    //   Để tránh tạo trùng
    const { data: existingRuns, error: runErr } = await supabase
      .from("checklist_runs")
      .select("template_id")
      .eq("date", today);

    if (runErr) {
      console.error(
        "[daily-checklist] Lỗi query existing runs:",
        runErr.message,
      );
      return new Response(JSON.stringify({ error: runErr.message }), {
        status: 500,
      });
    }

    // Tập hợp template_id đã có run hôm nay
    const existingSet = new Set(
      (existingRuns ?? []).map((r: { template_id: string }) => r.template_id),
    );

    // ── 4. Tạo checklist_run mới cho những template chưa có ───
    const toInsert = templates
      .filter((t: { id: string }) => !existingSet.has(t.id))
      .map((t: { id: string }) => ({
        template_id: t.id,
        date: today,
        completed_items: [],
        progress: 0,
      }));

    let createdCount = 0;

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from("checklist_runs")
        .insert(toInsert);

      if (insertErr) {
        console.error("[daily-checklist] Lỗi tạo runs:", insertErr.message);
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 500,
        });
      }

      createdCount = toInsert.length;
    }

    const skippedCount = templates.length - createdCount;

    console.log(
      `[daily-checklist] ✅ Hoàn tất — tạo ${createdCount}, bỏ qua ${skippedCount} (đã có)`,
    );

    return new Response(
      JSON.stringify({
        date: today,
        created: createdCount,
        skipped: skippedCount,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[daily-checklist] ❌ Lỗi không xử lý được:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
});
