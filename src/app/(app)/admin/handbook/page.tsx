"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Save, Trash2, BookOpen } from "lucide-react";
import Link from "next/link";

type HandbookEntry = {
  id: string;
  title: string;
  content: string;
};

export default function HandbookSettingsPage() {
  const [entries, setEntries] = useState<HandbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [toast, setToast] = useState("");

  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setRole(profile?.role ?? "staff");

      const { data } = await supabase
        .from("company_handbook")
        .select("id, title, content")
        .order("title");
      setEntries((data ?? []) as HandbookEntry[]);
      setLoading(false);
    };
    load();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("company_handbook")
      .update({ title: editTitle, content: editContent, updated_by: user?.id, updated_at: new Date().toISOString() })
      .eq("id", id);
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, title: editTitle, content: editContent } : e)));
    setEditingId(null);
    setSaving(false);
    showToast("Đã lưu!");
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("company_handbook")
      .insert({ title: newTitle.trim(), content: newContent.trim(), location_id: "all", updated_by: user?.id })
      .select()
      .single();
    if (data) {
      setEntries((prev) => [...prev, data as HandbookEntry]);
    }
    setNewTitle("");
    setNewContent("");
    setShowAdd(false);
    setSaving(false);
    showToast("Đã thêm!");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("company_handbook").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    showToast("Đã xóa!");
  };

  if (role !== "owner") {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <p className="text-sm text-foreground/40">Chỉ chủ quán mới có quyền truy cập</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white border-b border-black/5 px-4 py-3.5">
        <Link href="/hr" className="p-1 -ml-1">
          <ArrowLeft size={18} strokeWidth={2} color="#333" />
        </Link>
        <BookOpen size={18} style={{ color: "var(--brand-color)" }} />
        <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
          Sổ tay công ty (AI)
        </h1>
      </div>

      <div className="px-4 py-4 space-y-3" style={{ paddingBottom: 100 }}>
        <p className="text-[10px] text-foreground/40 leading-relaxed">
          Nội dung ở đây sẽ được AI Trợ lý sử dụng để trả lời câu hỏi của nhân viên. Chỉnh sửa bất cứ lúc nào.
        </p>

        {loading && (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-foreground/5" />
            ))}
          </div>
        )}

        {entries.map((entry) => (
          <div key={entry.id} className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            {editingId === entry.id ? (
              /* Editing mode */
              <div className="p-3.5 space-y-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl bg-foreground/5 px-3 py-2 text-xs font-bold text-foreground outline-none"
                  placeholder="Tiêu đề"
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={8}
                  className="w-full rounded-xl bg-foreground/5 px-3 py-2 text-[11px] text-foreground outline-none resize-none leading-relaxed"
                  placeholder="Nội dung..."
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="rounded-full px-3 py-1.5 text-[10px] font-semibold bg-foreground/5 text-foreground/50">
                    Hủy
                  </button>
                  <button
                    onClick={() => handleSave(entry.id)}
                    disabled={saving}
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-semibold text-white"
                    style={{ background: "var(--brand-color)" }}
                  >
                    <Save size={10} /> Lưu
                  </button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div className="p-3.5">
                <div className="flex items-start justify-between">
                  <h3 className="text-xs font-bold text-foreground">{entry.title}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditingId(entry.id); setEditTitle(entry.title); setEditContent(entry.content); }}
                      className="rounded-lg px-2 py-1 text-[9px] font-semibold bg-foreground/5 text-foreground/50 hover:bg-foreground/10"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="rounded-lg p-1 text-foreground/25 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-[10px] text-foreground/50 leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {entry.content}
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Add new */}
        {showAdd ? (
          <div className="rounded-2xl bg-white p-3.5 space-y-2" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-xl bg-foreground/5 px-3 py-2 text-xs font-bold text-foreground outline-none"
              placeholder="Tiêu đề mục mới"
              autoFocus
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={6}
              className="w-full rounded-xl bg-foreground/5 px-3 py-2 text-[11px] text-foreground outline-none resize-none leading-relaxed"
              placeholder="Nội dung..."
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="rounded-full px-3 py-1.5 text-[10px] font-semibold bg-foreground/5 text-foreground/50">
                Hủy
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !newTitle.trim()}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40"
                style={{ background: "var(--brand-color)" }}
              >
                <Plus size={10} /> Thêm
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-foreground/10 py-3 text-[10px] font-semibold text-foreground/30 hover:border-foreground/20 hover:text-foreground/50 transition-colors"
          >
            <Plus size={12} /> Thêm mục mới
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full bg-foreground px-4 py-2 text-[10px] font-semibold text-white animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}
