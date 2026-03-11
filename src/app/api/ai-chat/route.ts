import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSystemPrompt } from "@/lib/ai/system-prompt";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY chưa được cấu hình" },
        { status: 500 },
      );
    }

    // Auth check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, location_id")
      .eq("id", user.id)
      .single();

    // Parse request
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Build system prompt — load handbook from DB if available
    let handbookContent = "";
    try {
      const { data: handbookEntries } = await supabase
        .from("company_handbook")
        .select("title, content")
        .order("title");

      if (handbookEntries && handbookEntries.length > 0) {
        handbookContent = handbookEntries
          .map((h) => `### ${h.title}\n${h.content}`)
          .join("\n\n");
      }
    } catch {
      // Table doesn't exist yet — use default
    }

    const systemPrompt = getSystemPrompt({
      userName: profile?.full_name ?? "Nhân viên",
      role: profile?.role ?? "staff",
      locationId: profile?.location_id ?? "enso",
      handbookOverride: handbookContent || undefined,
    });

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    // Build chat history for Gemini format
    const geminiHistory = (history ?? []).map(
      (msg: { role: string; content: string }) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }),
    );

    // Start chat with history
    const chat = model.startChat({ history: geminiHistory });

    // Send message
    const result = await chat.sendMessage(message);
    const response = result.response.text();

    // Save to DB (fire and forget)
    supabase
      .from("ai_chat_messages")
      .insert([
        { user_id: user.id, role: "user", content: message },
        { user_id: user.id, role: "assistant", content: response },
      ])
      .then(() => {});

    return NextResponse.json({ reply: response });
  } catch (err: unknown) {
    console.error("AI Chat error:", err);
    const msg =
      err instanceof Error ? err.message : "Lỗi kết nối AI. Vui lòng thử lại.";
    return NextResponse.json(
      { error: msg },
      { status: 500 },
    );
  }
}
