"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Send, Sparkles, Calendar, BookOpen, Thermometer } from "lucide-react";
import Link from "next/link";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_ACTIONS = [
  { label: "Cách pha latte", icon: Sparkles, message: "Hướng dẫn cách pha một ly latte" },
  { label: "Xin nghỉ phép", icon: Calendar, message: "Tôi muốn xin nghỉ phép, hướng dẫn tôi" },
  { label: "Báo ốm", icon: Thermometer, message: "Tôi bị ốm, cần làm gì?" },
  { label: "Khóa học", icon: BookOpen, message: "Có những khóa đào tạo nào?" },
];

export default function AiColleaguePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load chat history ──────────────────────────────────
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const sb = createClient();
        const { data } = await sb
          .from("ai_chat_messages")
          .select("role, content")
          .order("created_at", { ascending: true })
          .limit(50);

        if (data && data.length > 0) {
          setMessages(data as Message[]);
        }
      } catch {
        // Table doesn't exist yet — that's fine
      }
      setHistoryLoaded(true);
    };
    loadHistory();
  }, []);

  // ── Auto scroll ────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Send message ───────────────────────────────────────
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
            history: messages.slice(-20), // Last 20 messages for context
          }),
        });

        const data = await res.json();

        if (data.reply) {
          setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.error ?? "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.",
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Không thể kết nối. Vui lòng kiểm tra mạng." },
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

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh", background: "#f8f9fa" }}>
      {/* ── Header ──────────────────────────────────── */}
      <div
        className="flex items-center gap-3 bg-white border-b border-black/5"
        style={{ padding: "14px 16px 12px" }}
      >
        <Link href="/home" className="p-1 -ml-1">
          <ArrowLeft size={18} strokeWidth={2} color="#333" />
        </Link>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: "var(--brand-color)", color: "#fff" }}
          >
            <Sparkles size={14} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: "Sora, sans-serif",
                fontSize: 14,
                fontWeight: 700,
                color: "#1a1a1a",
              }}
            >
              Trợ lý AI
            </h1>
            <p className="text-[9px] text-foreground/40">Hỏi đáp 24/7 dựa trên sổ tay công ty</p>
          </div>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ paddingBottom: 100 }}>
        {/* Welcome if no messages */}
        {historyLoaded && messages.length === 0 && (
          <div className="text-center py-8 space-y-4">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "var(--brand-color)", color: "#fff" }}
            >
              <Sparkles size={28} />
            </div>
            <div>
              <h2
                style={{
                  fontFamily: "Sora, sans-serif",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#1a1a1a",
                }}
              >
                Xin chào!
              </h2>
              <p className="text-xs text-foreground/50 mt-1">
                Mình là trợ lý AI của Enso Group. Hỏi mình bất cứ điều gì!
              </p>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => sendMessage(qa.message)}
                  className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-left transition-transform active:scale-95"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                >
                  <qa.icon size={14} style={{ color: "var(--brand-color)" }} />
                  <span className="text-[10px] font-semibold text-foreground/70">{qa.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat bubbles */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full mr-2 mt-1"
                style={{ background: "var(--brand-color)", color: "#fff" }}
              >
                <Sparkles size={10} />
              </div>
            )}
            <div
              className="max-w-[80%] rounded-2xl px-3.5 py-2.5"
              style={{
                background: msg.role === "user" ? "var(--brand-color)" : "#fff",
                color: msg.role === "user" ? "#fff" : "#333",
                boxShadow:
                  msg.role === "assistant" ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                borderBottomRightRadius: msg.role === "user" ? 6 : 18,
                borderBottomLeftRadius: msg.role === "assistant" ? 6 : 18,
              }}
            >
              <p
                className="text-[12px] leading-relaxed whitespace-pre-wrap"
                style={{ lineHeight: 1.6 }}
              >
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div className="flex justify-start">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full mr-2 mt-1"
              style={{ background: "var(--brand-color)", color: "#fff" }}
            >
              <Sparkles size={10} />
            </div>
            <div
              className="rounded-2xl bg-white px-4 py-3"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderBottomLeftRadius: 6 }}
            >
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-foreground/20 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-foreground/20 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-foreground/20 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Input bar ───────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 64px)" }}
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi gì đó..."
            disabled={loading}
            className="flex-1 rounded-full bg-foreground/5 px-4 py-2.5 text-[12px] text-foreground outline-none placeholder:text-foreground/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-30 transition-transform active:scale-90"
            style={{ background: "var(--brand-color)" }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
