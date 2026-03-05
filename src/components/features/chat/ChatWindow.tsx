"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ArrowLeft, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Message = {
  id: string;
  channel_id: string;
  sender_id: string;
  body: string;
  is_urgent: boolean;
  read_by: unknown[];
  created_at: string;
  sender_name?: string;
};

type ChatWindowProps = {
  channelId: string;
  channelName: string;
  channelType: string;
  memberCount: number;
  currentUserId: string;
  currentUserName: string;
};

export default function ChatWindow({
  channelId,
  channelName,
  memberCount,
  currentUserId,
  currentUserName,
}: ChatWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  // Stable supabase ref — tránh re-create mỗi render
  const supabaseRef = useRef(createClient());

  // ── Scroll xuống cuối ──────────────────────────────────
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // ── Load messages ban đầu ──────────────────────────────
  useEffect(() => {
    let ignore = false;
    const supabase = supabaseRef.current;

    async function load() {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, channel_id, sender_id, body, is_urgent, read_by, created_at, profiles!sender_id(full_name)",
        )
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (ignore) return;

      if (error) {
        console.error("Lỗi load messages:", error);
        setLoading(false);
        return;
      }

      const mapped: Message[] = (data ?? []).map(
        (m: Record<string, unknown>) => {
          const profile = m.profiles as { full_name: string } | null;
          return {
            id: m.id as string,
            channel_id: m.channel_id as string,
            sender_id: m.sender_id as string,
            body: m.body as string,
            is_urgent: (m.is_urgent as boolean) ?? false,
            read_by: (m.read_by as string[]) ?? [],
            created_at: m.created_at as string,
            sender_name: profile?.full_name ?? "Ẩn danh",
          };
        },
      );

      setMessages(mapped);
      setLoading(false);
      setTimeout(scrollToBottom, 100);

      // Đánh dấu đã đọc (silent)
      try {
        await supabase.rpc("mark_messages_read", {
          p_channel_id: channelId,
          p_user_id: currentUserId,
        });
      } catch {
        // RPC chưa tạo → bỏ qua
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [channelId, currentUserId, scrollToBottom]);

  // ── Realtime subscription ──────────────────────────────
  useEffect(() => {
    const supabase = supabaseRef.current;

    // Hủy subscription cũ nếu có
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
      realtimeRef.current = null;
    }

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const m = payload.new as Record<string, unknown>;

          // Lấy tên sender
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", m.sender_id as string)
            .single();

          const newMsg: Message = {
            id: m.id as string,
            channel_id: m.channel_id as string,
            sender_id: m.sender_id as string,
            body: m.body as string,
            is_urgent: (m.is_urgent as boolean) ?? false,
            read_by: (m.read_by as string[]) ?? [],
            created_at: m.created_at as string,
            sender_name: profile?.full_name ?? "Ẩn danh",
          };

          // Tránh duplicate (optimistic update đã thêm)
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 50);
        },
      )
      .subscribe();

    realtimeRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeRef.current = null;
    };
  }, [channelId, scrollToBottom]);

  // ── Gửi tin nhắn (optimistic update) ──────────────────
  async function handleSend(isUrgent = false) {
    const body = input.trim();
    if (!body || sending) return;

    setSending(true);
    setInput("");

    // Optimistic update
    const optimisticId = crypto.randomUUID();
    const optimisticMsg: Message = {
      id: optimisticId,
      channel_id: channelId,
      sender_id: currentUserId,
      body,
      is_urgent: isUrgent,
      read_by: [],
      created_at: new Date().toISOString(),
      sender_name: currentUserName,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    const { data, error } = await supabaseRef.current
      .from("messages")
      .insert({
        channel_id: channelId,
        sender_id: currentUserId,
        body,
        is_urgent: isUrgent,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Lỗi gửi tin nhắn:", error);
      // Xóa tin optimistic nếu lỗi
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } else if (data) {
      // Thay thế optimistic ID bằng ID thực từ server
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, id: data.id } : m)),
      );
    }

    setSending(false);
  }

  // ── Enter gửi, Shift+Enter xuống dòng ──────────────────
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Nhóm tin liền nhau cùng người → ẩn avatar ──────────
  function shouldShowAvatar(idx: number) {
    if (idx === 0) return true;
    return messages[idx].sender_id !== messages[idx - 1].sender_id;
  }

  // ── Hiện timestamp cách 30 phút ────────────────────────
  function shouldShowTime(idx: number) {
    if (idx === 0) return true;
    const prev = new Date(messages[idx - 1].created_at).getTime();
    const curr = new Date(messages[idx].created_at).getTime();
    return curr - prev > 30 * 60 * 1000;
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Chat header ────────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 bg-white border-b border-black/5 shrink-0"
        style={{ padding: "10px 14px" }}
      >
        <button
          onClick={() => router.push("/chat")}
          className="flex items-center justify-center text-gray-500"
          style={{ width: 44, height: 44, marginLeft: -10 }}
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <div>
          <p
            style={{
              fontFamily: "Sora, sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: "#1a1a1a",
            }}
          >
            {channelName}
          </p>
          <p style={{ fontSize: 10, color: "#aaa" }}>
            {memberCount} thành viên
          </p>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto flex flex-col gap-2"
        style={{ padding: "10px 12px", scrollbarWidth: "none" }}
      >
        {loading ? (
          // Skeleton bubbles
          <>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}
              >
                <div className="w-[26px] h-[26px] rounded-lg bg-gray-100 animate-pulse shrink-0" />
                <div
                  className="rounded-xl bg-gray-100 animate-pulse"
                  style={{
                    width: `${40 + i * 15}%`,
                    height: 32,
                  }}
                />
              </div>
            ))}
          </>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span style={{ fontSize: 28 }}>👋</span>
            <p style={{ fontSize: 12, color: "#aaa", textAlign: "center" }}>
              Bắt đầu cuộc trò chuyện
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.sender_id === currentUserId;
            const showAvatar = shouldShowAvatar(idx);
            const showTime = shouldShowTime(idx);

            return (
              <div key={msg.id}>
                {/* Timestamp */}
                {showTime && (
                  <p
                    className="text-center my-1"
                    style={{ fontSize: 9, color: "#ccc" }}
                  >
                    {format(new Date(msg.created_at), "HH:mm")}
                  </p>
                )}

                <div
                  className={`flex items-end gap-[7px] ${isMine ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  {!isMine && showAvatar ? (
                    <div
                      className="flex shrink-0 items-center justify-center rounded-lg font-semibold"
                      style={{
                        width: 26,
                        height: 26,
                        fontSize: 12,
                        fontFamily: "Sora, sans-serif",
                        background: "var(--brand-surface, #D8F3DC)",
                        color: "var(--brand-color)",
                      }}
                    >
                      {(msg.sender_name ?? "?")[0]}
                    </div>
                  ) : !isMine ? (
                    <div style={{ width: 26 }} />
                  ) : null}

                  {/* Bubble */}
                  <div className="max-w-[68%]">
                    {/* Tên sender (chỉ khi hiện avatar) */}
                    {!isMine && showAvatar && (
                      <p
                        className="mb-0.5 ml-0.5"
                        style={{ fontSize: 9, color: "#bbb" }}
                      >
                        {msg.sender_name}
                      </p>
                    )}
                    <div
                      className="rounded-[14px]"
                      style={{
                        padding: "8px 11px",
                        fontSize: 11,
                        lineHeight: 1.45,
                        ...(msg.is_urgent
                          ? {
                              background: "#fff1f1",
                              border: "1px solid #fecaca",
                              color: "#991b1b",
                              borderBottomLeftRadius: isMine ? 14 : 4,
                              borderBottomRightRadius: isMine ? 4 : 14,
                            }
                          : isMine
                            ? {
                                background: "var(--brand-color)",
                                color: "#fff",
                                borderBottomRightRadius: 4,
                              }
                            : {
                                background: "#fff",
                                color: "#333",
                                borderBottomLeftRadius: 4,
                                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                              }),
                      }}
                    >
                      {msg.is_urgent && (
                        <p
                          className="mb-0.5"
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#ef4444",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          🚨 Khẩn
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">
                        {msg.body}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ──────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 bg-white border-t border-black/5 shrink-0"
        style={{
          padding: "8px 12px",
          paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          rows={1}
          className="flex-1 resize-none border-none outline-none"
          style={{
            background: "#f4f4f4",
            borderRadius: 20,
            padding: "10px 14px",
            fontSize: 13,
            color: "#555",
            fontFamily: "DM Sans, sans-serif",
            maxHeight: 80,
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || sending}
          className="flex items-center justify-center rounded-xl text-white disabled:opacity-40"
          style={{
            width: 44,
            height: 44,
            background: "var(--brand-color)",
          }}
        >
          <Send size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
