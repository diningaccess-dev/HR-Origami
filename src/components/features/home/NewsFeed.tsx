"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Plus,
  Send,
  Image as ImageIcon,
  X,
  MessageCircle,
  Pin,
  Trash2,
  Award,
  Megaphone,
  ChevronDown,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────── */
type Profile = { id: string; full_name: string; role: string };

type FeedPost = {
  id: string;
  author_id: string;
  type: "post" | "announcement" | "kudos";
  content: string;
  media_url: string | null;
  media_type: string | null;
  kudos_to: string | null;
  target_roles: string[] | null;
  target_locations: string[] | null;
  pinned: boolean;
  created_at: string;
  author?: Profile;
  kudos_profile?: Profile;
  reactions: { emoji: string; count: number; reacted: boolean }[];
  comment_count: number;
};

type Comment = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: Profile;
};

const REACTION_EMOJIS = ["❤️", "👍", "😂", "🔥", "👏"];

/* ══════════════════════════════════════════════════════
   NewsFeed
   ══════════════════════════════════════════════════════ */
export default function NewsFeed({
  locationId,
  role,
}: {
  locationId: string;
  role: string;
}) {
  const supabase = useRef(createClient());
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  // Create post modal
  const [showCreate, setShowCreate] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<"post" | "announcement" | "kudos">("post");
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [newMediaPreview, setNewMediaPreview] = useState("");
  const [kudosTarget, setKudosTarget] = useState("");
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [posting, setPosting] = useState(false);

  // Comment section
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const isManager = role === "manager" || role === "owner";

  // ── Fetch user + profiles ──────────────────────────────
  useEffect(() => {
    supabase.current.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // ── Load posts ─────────────────────────────────────────
  const loadPosts = useCallback(async () => {
    const sb = supabase.current;
    setLoading(true);

    const { data: rawPosts } = await sb
      .from("feed_posts")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);

    if (!rawPosts || rawPosts.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // Collect unique profile IDs
    const profileIds = new Set<string>();
    rawPosts.forEach((p) => {
      profileIds.add(p.author_id);
      if (p.kudos_to) profileIds.add(p.kudos_to);
    });

    // Fetch profiles
    const { data: profData } = await sb
      .from("profiles")
      .select("id, full_name, role")
      .in("id", Array.from(profileIds));

    const profMap: Record<string, Profile> = {};
    (profData ?? []).forEach((p) => (profMap[p.id] = p));
    setProfiles((prev) => ({ ...prev, ...profMap }));

    // Fetch reactions grouped
    const postIds = rawPosts.map((p) => p.id);
    const { data: allReactions } = await sb
      .from("feed_reactions")
      .select("post_id, emoji, user_id")
      .in("post_id", postIds);

    // Fetch comment counts
    const { data: commentCounts } = await sb
      .from("feed_comments")
      .select("post_id")
      .in("post_id", postIds);

    // Build reaction map
    const reactionMap: Record<string, { emoji: string; user_id: string }[]> = {};
    (allReactions ?? []).forEach((r) => {
      if (!reactionMap[r.post_id]) reactionMap[r.post_id] = [];
      reactionMap[r.post_id].push(r);
    });

    // Build comment count map
    const ccMap: Record<string, number> = {};
    (commentCounts ?? []).forEach((c) => {
      ccMap[c.post_id] = (ccMap[c.post_id] ?? 0) + 1;
    });

    // Get current user
    const {
      data: { user },
    } = await sb.auth.getUser();
    const uid = user?.id ?? "";

    // Assemble
    const assembled: FeedPost[] = rawPosts.map((p) => {
      const rArr = reactionMap[p.id] ?? [];
      const emojiCounts: Record<string, { count: number; reacted: boolean }> = {};
      rArr.forEach((r) => {
        if (!emojiCounts[r.emoji]) emojiCounts[r.emoji] = { count: 0, reacted: false };
        emojiCounts[r.emoji].count++;
        if (r.user_id === uid) emojiCounts[r.emoji].reacted = true;
      });

      return {
        ...p,
        author: profMap[p.author_id],
        kudos_profile: p.kudos_to ? profMap[p.kudos_to] : undefined,
        reactions: REACTION_EMOJIS.map((e) => ({
          emoji: e,
          count: emojiCounts[e]?.count ?? 0,
          reacted: emojiCounts[e]?.reacted ?? false,
        })),
        comment_count: ccMap[p.id] ?? 0,
      };
    });

    // Filter by target (only show posts targeted at my role/location)
    const filtered = assembled.filter((p) => {
      if (p.target_roles && p.target_roles.length > 0 && !p.target_roles.includes(role)) {
        return p.author_id === uid; // Show own posts always
      }
      if (p.target_locations && p.target_locations.length > 0 && !p.target_locations.includes(locationId)) {
        return p.author_id === uid;
      }
      return true;
    });

    setPosts(filtered);
    setLoading(false);
  }, [role, locationId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // ── Toggle reaction ────────────────────────────────────
  const toggleReaction = async (postId: string, emoji: string) => {
    if (!userId) return;
    const sb = supabase.current;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          reactions: p.reactions.map((r) => {
            if (r.emoji !== emoji) return r;
            return r.reacted
              ? { ...r, count: r.count - 1, reacted: false }
              : { ...r, count: r.count + 1, reacted: true };
          }),
        };
      }),
    );

    // Check existing
    const { data: existing } = await sb
      .from("feed_reactions")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      await sb.from("feed_reactions").delete().eq("id", existing.id);
    } else {
      await sb.from("feed_reactions").insert({ post_id: postId, user_id: userId, emoji });
    }
  };

  // ── Create post ────────────────────────────────────────
  const handleCreatePost = async () => {
    if (!newContent.trim() && !newMediaFile) return;
    setPosting(true);
    const sb = supabase.current;

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    // Upload media if present
    if (newMediaFile) {
      const ext = newMediaFile.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await sb.storage.from("feed-media").upload(path, newMediaFile);
      if (!error) {
        const { data: publicUrl } = sb.storage.from("feed-media").getPublicUrl(path);
        mediaUrl = publicUrl.publicUrl;
        mediaType = newMediaFile.type.startsWith("video") ? "video" : "image";
      }
    }

    await sb.from("feed_posts").insert({
      author_id: userId,
      type: newType,
      content: newContent.trim(),
      media_url: mediaUrl,
      media_type: mediaType,
      kudos_to: newType === "kudos" && kudosTarget ? kudosTarget : null,
      target_roles: null,
      target_locations: null,
      pinned: false,
    });

    // Reset
    setNewContent("");
    setNewType("post");
    setNewMediaFile(null);
    setNewMediaPreview("");
    setKudosTarget("");
    setShowCreate(false);
    setPosting(false);
    loadPosts();
  };

  // ── Load comments ──────────────────────────────────────
  const loadComments = async (postId: string) => {
    const sb = supabase.current;
    const { data } = await sb
      .from("feed_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (data) {
      // Fetch profiles for comments
      const ids = new Set(data.map((c) => c.author_id));
      const { data: profs } = await sb
        .from("profiles")
        .select("id, full_name, role")
        .in("id", Array.from(ids));

      const pm: Record<string, Profile> = {};
      (profs ?? []).forEach((p) => (pm[p.id] = p));
      setProfiles((prev) => ({ ...prev, ...pm }));

      setComments((prev) => ({
        ...prev,
        [postId]: data.map((c) => ({ ...c, author: pm[c.author_id] })),
      }));
    }
  };

  const handleSendComment = async (postId: string) => {
    if (!commentInput.trim() || !userId) return;
    setSendingComment(true);
    const sb = supabase.current;

    await sb.from("feed_comments").insert({
      post_id: postId,
      author_id: userId,
      content: commentInput.trim(),
    });

    setCommentInput("");
    setSendingComment(false);

    // Refresh comments + count
    await loadComments(postId);
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)),
    );
  };

  const handleDelete = async (postId: string) => {
    await supabase.current.from("feed_posts").delete().eq("id", postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  // ── Load employees for kudos picker ────────────────────
  useEffect(() => {
    if (!showCreate) return;
    supabase.current
      .from("profiles")
      .select("id, full_name, role")
      .in("status", ["active", "approved"])
      .order("full_name")
      .then(({ data }) => setEmployees((data ?? []) as Profile[]));
  }, [showCreate]);

  // ── Media file change ──────────────────────────────────
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewMediaFile(file);
    setNewMediaPreview(URL.createObjectURL(file));
  };

  // ── Initials helper ────────────────────────────────────
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const timeAgo = (d: string) => {
    try {
      return formatDistanceToNow(new Date(d), { addSuffix: true, locale: vi });
    } catch {
      return "";
    }
  };

  /* ── Render ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="px-4 space-y-3 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-foreground/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 space-y-3 pb-2">
      {/* ── Section header + create ──────────────────── */}
      <div className="flex items-center justify-between">
        <h2
          style={{
            fontFamily: "Sora, sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#999",
          }}
        >
          Bảng tin
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white text-[10px] font-semibold transition-transform active:scale-95"
          style={{ background: "var(--brand-color)" }}
        >
          <Plus size={12} strokeWidth={2.5} />
          Đăng bài
        </button>
      </div>

      {/* ── Quick compose bar ────────────────────────── */}
      <button
        onClick={() => setShowCreate(true)}
        className="w-full flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-left transition-transform active:scale-[0.98]"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ background: "var(--brand-color)" }}
        >
          {getInitials(profiles[userId]?.full_name)}
        </div>
        <span className="text-xs text-foreground/40">Bạn đang nghĩ gì?</span>
      </button>

      {/* ── Posts ─────────────────────────────────────── */}
      {posts.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-xs text-foreground/30">Chưa có bài đăng nào</p>
        </div>
      )}

      {posts.map((post) => (
        <div
          key={post.id}
          className="rounded-2xl bg-white overflow-hidden"
          style={{
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            borderLeft: post.pinned ? "3px solid var(--brand-color)" : undefined,
          }}
        >
          {/* Header */}
          <div className="flex items-start gap-2.5 px-3.5 pt-3 pb-1">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: "var(--brand-color)", opacity: 0.85 }}
            >
              {getInitials(post.author?.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground truncate">
                  {post.author?.full_name ?? "?"}
                </span>
                {post.type === "announcement" && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white"
                    style={{ background: "#ef4444" }}
                  >
                    Thông báo
                  </span>
                )}
                {post.type === "kudos" && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white"
                    style={{ background: "#f59e0b" }}
                  >
                    Tuyên dương
                  </span>
                )}
                {post.pinned && <Pin size={10} className="text-foreground/30" />}
              </div>
              <p className="text-[10px] text-foreground/40">{timeAgo(post.created_at)}</p>
            </div>
            {/* Delete */}
            {(post.author_id === userId || isManager) && (
              <button
                onClick={() => handleDelete(post.id)}
                className="p-1 rounded-lg hover:bg-foreground/5 transition-colors"
              >
                <Trash2 size={12} className="text-foreground/25" />
              </button>
            )}
          </div>

          {/* Kudos target */}
          {post.type === "kudos" && post.kudos_profile && (
            <div className="mx-3.5 mb-1 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5">
              <Award size={12} className="text-amber-500" />
              <span className="text-[10px] font-semibold text-amber-700">
                Tuyên dương {post.kudos_profile.full_name}
              </span>
            </div>
          )}

          {/* Content */}
          {post.content && (
            <p className="px-3.5 py-1.5 text-[12px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>
          )}

          {/* Media */}
          {post.media_url && (
            <div className="px-3.5 pb-2">
              {post.media_type === "video" ? (
                <video
                  src={post.media_url}
                  controls
                  className="w-full rounded-xl"
                  style={{ maxHeight: 280 }}
                />
              ) : (
                <img
                  src={post.media_url}
                  alt=""
                  className="w-full rounded-xl object-cover"
                  style={{ maxHeight: 280 }}
                />
              )}
            </div>
          )}

          {/* Reactions bar */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-t border-foreground/5">
            {post.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => toggleReaction(post.id, r.emoji)}
                className="flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] transition-all active:scale-90"
                style={{
                  background: r.reacted ? "var(--brand-color)" : "transparent",
                  color: r.reacted ? "#fff" : "#888",
                  border: r.reacted ? "none" : "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <span>{r.emoji}</span>
                {r.count > 0 && <span className="text-[9px] font-semibold">{r.count}</span>}
              </button>
            ))}

            {/* Comment toggle */}
            <button
              onClick={() => {
                if (expandedComments === post.id) {
                  setExpandedComments(null);
                } else {
                  setExpandedComments(post.id);
                  if (!comments[post.id]) loadComments(post.id);
                }
              }}
              className="ml-auto flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-foreground/50 hover:bg-foreground/5 transition-colors"
            >
              <MessageCircle size={12} />
              {post.comment_count > 0 && <span>{post.comment_count}</span>}
            </button>
          </div>

          {/* Comments section */}
          {expandedComments === post.id && (
            <div className="border-t border-foreground/5 px-3.5 py-2 space-y-2">
              {(comments[post.id] ?? []).map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[7px] font-bold text-white mt-0.5"
                    style={{ background: "var(--brand-color)", opacity: 0.7 }}
                  >
                    {getInitials(c.author?.full_name)}
                  </div>
                  <div className="flex-1">
                    <div className="rounded-xl bg-foreground/3 px-2.5 py-1.5">
                      <span className="text-[10px] font-semibold text-foreground">
                        {c.author?.full_name}
                      </span>
                      <p className="text-[11px] text-foreground/70">{c.content}</p>
                    </div>
                    <p className="text-[8px] text-foreground/30 mt-0.5 ml-1">
                      {timeAgo(c.created_at)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Comment input */}
              <div className="flex gap-2 items-end pt-1">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment(post.id);
                    }
                  }}
                  placeholder="Viết bình luận..."
                  className="flex-1 rounded-full bg-foreground/5 px-3 py-1.5 text-[11px] text-foreground outline-none placeholder:text-foreground/30"
                />
                <button
                  onClick={() => handleSendComment(post.id)}
                  disabled={sendingComment || !commentInput.trim()}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white disabled:opacity-40"
                  style={{ background: "var(--brand-color)" }}
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* ── Create Post Modal ────────────────────────── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreate(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl bg-white animate-in slide-in-from-bottom duration-300"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-foreground/5">
              <h3 className="text-sm font-bold text-foreground">Tạo bài đăng</h3>
              <button onClick={() => setShowCreate(false)} className="p-1">
                <X size={18} className="text-foreground/40" />
              </button>
            </div>

            {/* Type picker */}
            <div className="flex gap-2 px-4 pt-3">
              {(
                [
                  { key: "post", label: "Bài viết", icon: null },
                  { key: "kudos", label: "Tuyên dương", icon: Award },
                  ...(isManager
                    ? [{ key: "announcement", label: "Thông báo", icon: Megaphone }]
                    : []),
                ] as { key: "post" | "announcement" | "kudos"; label: string; icon: typeof Award | null }[]
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setNewType(t.key)}
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-semibold transition-all"
                  style={{
                    background: newType === t.key ? "var(--brand-color)" : "#f5f5f5",
                    color: newType === t.key ? "#fff" : "#666",
                  }}
                >
                  {t.icon && <t.icon size={10} />}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Kudos picker */}
            {newType === "kudos" && (
              <div className="px-4 pt-2">
                <div className="relative">
                  <select
                    value={kudosTarget}
                    onChange={(e) => setKudosTarget(e.target.value)}
                    className="w-full rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-foreground appearance-none outline-none"
                  >
                    <option value="">Chọn người được tuyên dương</option>
                    {employees
                      .filter((e) => e.id !== userId)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.full_name}
                        </option>
                      ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none"
                  />
                </div>
              </div>
            )}

            {/* Textarea */}
            <div className="px-4 pt-2">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Bạn đang nghĩ gì?"
                rows={4}
                className="w-full rounded-xl bg-foreground/3 px-3 py-2.5 text-[12px] text-foreground outline-none resize-none placeholder:text-foreground/30"
              />
            </div>

            {/* Media preview */}
            {newMediaPreview && (
              <div className="px-4 pt-1 relative">
                <img
                  src={newMediaPreview}
                  alt="preview"
                  className="w-full rounded-xl object-cover"
                  style={{ maxHeight: 160 }}
                />
                <button
                  onClick={() => {
                    setNewMediaFile(null);
                    setNewMediaPreview("");
                  }}
                  className="absolute top-3 right-6 bg-black/50 text-white rounded-full p-1"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between px-4 py-3">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/5 text-[10px] text-foreground/60 cursor-pointer hover:bg-foreground/10 transition-colors">
                <ImageIcon size={14} />
                Ảnh / Video
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleMediaChange}
                />
              </label>
              <button
                onClick={handleCreatePost}
                disabled={posting || (!newContent.trim() && !newMediaFile)}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-white text-[11px] font-semibold disabled:opacity-40 transition-transform active:scale-95"
                style={{ background: "var(--brand-color)" }}
              >
                {posting ? "Đang đăng..." : "Đăng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
