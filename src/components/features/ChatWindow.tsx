"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Types ────────────────────────────────────────────────────
type Channel = {
  id: string;
  name: string;
  type: string;
};

type Message = {
  id: string;
  channel_id: string;
  sender_id: string;
  body: string;
  is_urgent: boolean;
  read_by: string[];
  created_at: string;
  // Join từ profiles
  sender_name?: string;
  sender_avatar?: string;
};

type ChatWindowProps = {
  channels: Channel[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
  locationLabel: string;
};

// ── Component ────────────────────────────────────────────────
export default function ChatWindow({
  channels,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  locationLabel,
}: ChatWindowProps) {
  const [activeChannel, setActiveChannel] = useState<Channel | null>(
    channels[0] ?? null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const realtimeRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  // ── Tự động cuộn xuống dưới ────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Load messages + subscribe Realtime ────────────────────
  useEffect(() => {
    if (!activeChannel) return;

    const supabase = supabaseRef.current;
    let isMounted = true;

    // Hủy subscription cũ nếu có
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
      realtimeRef.current = null;
    }

    // Fetch tin nhắn hiện tại
    async function loadMessages() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          id, channel_id, sender_id, body, is_urgent, read_by, created_at,
          profiles!sender_id ( full_name, avatar_url )
        `,
        )
        .eq("channel_id", activeChannel!.id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!isMounted) return;

      if (error) {
        console.error("Lỗi load messages:", error);
        setIsLoading(false);
        return;
      }

      // Map dữ liệu join
      const mapped: Message[] = (data ?? []).map(
        (m: Record<string, unknown>) => {
          const profile = m.profiles as {
            full_name?: string;
            avatar_url?: string;
          } | null;
          return {
            id: m.id as string,
            channel_id: m.channel_id as string,
            sender_id: m.sender_id as string,
            body: m.body as string,
            is_urgent: m.is_urgent as boolean,
            read_by: (m.read_by ?? []) as string[],
            created_at: m.created_at as string,
            sender_name: profile?.full_name ?? "Unknown",
            sender_avatar: profile?.avatar_url ?? undefined,
          };
        },
      );

      setMessages(mapped);
      setIsLoading(false);
    }

    loadMessages();

    // ── Subscribe Realtime ──────────────────────────────────
    const channel = supabase
      .channel(`messages:${activeChannel.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${activeChannel.id}`,
        },
        async (payload) => {
          if (!isMounted) return;

          const newMsg = payload.new as Record<string, unknown>;

          // Fetch sender info
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", newMsg.sender_id as string)
            .single();

          const mapped: Message = {
            id: newMsg.id as string,
            channel_id: newMsg.channel_id as string,
            sender_id: newMsg.sender_id as string,
            body: newMsg.body as string,
            is_urgent: newMsg.is_urgent as boolean,
            read_by: (newMsg.read_by ?? []) as string[],
            created_at: newMsg.created_at as string,
            sender_name: senderProfile?.full_name ?? "Unknown",
            sender_avatar: senderProfile?.avatar_url ?? undefined,
          };

          // Tránh duplicate (nếu user gửi, optimistic update đã thêm)
          setMessages((prev) => {
            if (prev.some((m) => m.id === mapped.id)) return prev;
            return [...prev, mapped];
          });
        },
      )
      .subscribe((status) => {
        if (!isMounted) return;
        setIsConnected(status === "SUBSCRIBED");
      });

    realtimeRef.current = channel;

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      realtimeRef.current = null;
    };
  }, [activeChannel]);

  // ── Gửi tin nhắn ──────────────────────────────────────────
  async function handleSend() {
    const body = newMessage.trim();
    if (!body || !activeChannel || isSending) return;

    setIsSending(true);
    setNewMessage("");

    // Optimistic update
    const optimisticId = crypto.randomUUID();
    const optimisticMsg: Message = {
      id: optimisticId,
      channel_id: activeChannel.id,
      sender_id: currentUserId,
      body,
      is_urgent: false,
      read_by: [],
      created_at: new Date().toISOString(),
      sender_name: currentUserName,
      sender_avatar: currentUserAvatar ?? undefined,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    const { data, error } = await supabaseRef.current
      .from("messages")
      .insert({
        channel_id: activeChannel.id,
        sender_id: currentUserId,
        body,
        is_urgent: false,
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

    setIsSending(false);
    inputRef.current?.focus();
  }

  // ── Xử lý Enter ───────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Render ─────────────────────────────────────────────────
  const brandColor = "var(--brand-color)";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Channel Tabs ──────────────────────────────────── */}
      {channels.length > 0 && (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-foreground/10 px-4 py-2">
          {channels.map((ch) => {
            const isActive = activeChannel?.id === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch)}
                className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? brandColor : undefined,
                  color: isActive ? "#fff" : undefined,
                }}
              >
                {ch.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Trạng thái mất kết nối ────────────────────────── */}
      {!isConnected && (
        <div className="shrink-0 bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          ⚠ Đang mất kết nối... đang thử kết nối lại
        </div>
      )}

      {/* ── Messages ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`flex gap-2 ${i % 2 === 0 ? "justify-end" : ""}`}
              >
                {i % 2 !== 0 && (
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-foreground/10" />
                )}
                <div className={`space-y-1 ${i % 2 === 0 ? "items-end" : ""}`}>
                  <div
                    className="h-3 animate-pulse rounded bg-foreground/10"
                    style={{ width: `${60 + ((i * 20) % 80)}px` }}
                  />
                  <div
                    className="h-8 animate-pulse rounded-2xl bg-foreground/10"
                    style={{ width: `${100 + ((i * 30) % 120)}px` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div
              className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
              style={{ backgroundColor: brandColor }}
            >
              <svg
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">
              Chưa có tin nhắn
            </p>
            <p className="mt-1 text-xs text-foreground/50">
              Bắt đầu cuộc trò chuyện tại {locationLabel}
            </p>
          </div>
        )}

        {/* Message list */}
        {!isLoading &&
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId;
            const initial = (msg.sender_name ?? "?")[0]?.toUpperCase();

            return (
              <div
                key={msg.id}
                className={`mb-3 flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                {!isMine && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-bold text-foreground/60">
                    {msg.sender_avatar ? (
                      <img
                        src={msg.sender_avatar}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`max-w-[75%] ${isMine ? "items-end" : "items-start"}`}
                >
                  {/* Tên sender (chỉ hiện cho tin người khác) */}
                  {!isMine && (
                    <p className="mb-0.5 text-[10px] font-medium text-foreground/40">
                      {msg.sender_name}
                    </p>
                  )}

                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      msg.is_urgent
                        ? "border-2 border-red-400 bg-red-50 text-red-900 dark:border-red-600 dark:bg-red-950/30 dark:text-red-200"
                        : isMine
                          ? "text-white"
                          : "bg-foreground/[0.06] text-foreground"
                    }`}
                    style={
                      !msg.is_urgent && isMine
                        ? { backgroundColor: brandColor }
                        : undefined
                    }
                  >
                    {/* Urgent badge */}
                    {msg.is_urgent && (
                      <span className="mb-1 inline-block rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        KHẨN
                      </span>
                    )}
                    <p className="whitespace-pre-wrap break-words">
                      {msg.body}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <p
                    className={`mt-0.5 text-[10px] text-foreground/30 ${
                      isMine ? "text-right" : ""
                    }`}
                  >
                    {format(new Date(msg.created_at), "HH:mm")}
                  </p>
                </div>
              </div>
            );
          })}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ─────────────────────────────────────────── */}
      {activeChannel && (
        <div className="shrink-0 border-t border-foreground/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              className="flex-1 rounded-full border border-foreground/10 bg-foreground/[0.03] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/20 focus:outline-none"
              disabled={isSending}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-30"
              style={{ backgroundColor: brandColor }}
              aria-label="Gửi"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* No channels state */}
      {channels.length === 0 && (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <p className="text-sm text-foreground/50">
            Chưa có channel nào cho {locationLabel}.
            <br />
            Liên hệ quản lý để tạo channel.
          </p>
        </div>
      )}
    </div>
  );
}
