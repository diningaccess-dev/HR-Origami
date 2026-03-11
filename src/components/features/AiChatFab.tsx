"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, X, Send } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

export default function AiChatFab() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history once
  useEffect(() => {
    if (!open || historyLoaded) return;
    const load = async () => {
      try {
        const sb = createClient();
        const { data } = await sb
          .from("ai_chat_messages")
          .select("role, content")
          .order("created_at", { ascending: true })
          .limit(30);
        if (data && data.length > 0) setMessages(data as Message[]);
      } catch {
        /* table not ready */
      }
      setHistoryLoaded(true);
    };
    load();
  }, [open, historyLoaded]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const userMsg: Message = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            history: messages.slice(-20),
          }),
        });
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply ?? data.error ?? "Có lỗi xảy ra.",
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Không thể kết nối. Kiểm tra mạng." },
        ]);
      }
      setLoading(false);
    },
    [loading, messages],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // ── FAB button (always visible) ─────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-90"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 76px)",
          left: 16,
          background: "var(--brand-color)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}
        aria-label="Mở trợ lý AI"
      >
        <Sparkles size={20} />
      </button>
    );
  }

  // ── Chat window ──────────────────────────────────────
  return (
    <div
      className="fixed z-50 flex flex-col rounded-2xl bg-white overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 76px)",
        left: 12,
        right: 12,
        height: "min(480px, 60dvh)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ background: "var(--brand-color)" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} />
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 700 }}>
            Trợ lý AI
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded-full p-1 hover:bg-white/20 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <Sparkles size={24} className="mx-auto mb-2" style={{ color: "var(--brand-color)" }} />
            <p className="text-xs text-foreground/40">Hỏi mình bất cứ điều gì!</p>
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {["Cách pha latte", "Xin nghỉ phép", "Nội quy"].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-full bg-foreground/5 px-2.5 py-1 text-[9px] font-semibold text-foreground/50 hover:bg-foreground/10 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full mr-1.5 mt-0.5"
                style={{ background: "var(--brand-color)", color: "#fff" }}
              >
                <Sparkles size={8} />
              </div>
            )}
            <div
              className="max-w-[82%] rounded-2xl px-3 py-2"
              style={{
                background: msg.role === "user" ? "var(--brand-color)" : "#f5f5f5",
                color: msg.role === "user" ? "#fff" : "#333",
                borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                borderBottomLeftRadius: msg.role === "assistant" ? 4 : 16,
              }}
            >
              <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full mr-1.5 mt-0.5"
              style={{ background: "var(--brand-color)", color: "#fff" }}
            >
              <Sparkles size={8} />
            </div>
            <div className="rounded-2xl bg-gray-100 px-3 py-2" style={{ borderBottomLeftRadius: 4 }}>
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/20 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/20 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/20 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-2.5 border-t border-foreground/5 bg-white"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi gì đó..."
          disabled={loading}
          className="flex-1 rounded-full bg-foreground/5 px-3 py-2 text-[11px] text-foreground outline-none placeholder:text-foreground/30"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white disabled:opacity-30"
          style={{ background: "var(--brand-color)" }}
        >
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}
