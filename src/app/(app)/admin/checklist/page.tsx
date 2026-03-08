"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Trash2, X, GripVertical, UserPlus } from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/* ── Types ─────────────────────────────────────── */
type Template = {
  id: string;
  name: string;
  type: string;
  items: string[];
  assigned_to: string[];
  location_id: string;
};

type Profile = {
  id: string;
  full_name: string;
};

const TEMPLATE_TYPES = [
  { value: "open", label: "🌅 Mở quán" },
  { value: "close", label: "🌙 Đóng quán" },
  { value: "custom", label: "⚙️ Tùy chỉnh" },
];

/* ══════════════════════════════════════════════════
   Admin Checklist Page
   ══════════════════════════════════════════════════ */
export default function AdminChecklistPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationId, setLocationId] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("open");
  const [formItems, setFormItems] = useState<string[]>([""]);
  const [formAssigned, setFormAssigned] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function flash(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* ── Fetch data ──────────────────────────────── */
  const fetchData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("location_id")
      .eq("id", user.id)
      .single();

    const locId = profile?.location_id ?? "enso";
    setLocationId(locId);

    // Templates cho location này
    const { data: tpls } = await supabase
      .from("checklist_templates")
      .select("id, name, type, items, assigned_to, location_id")
      .eq("location_id", locId)
      .order("type", { ascending: true });

    setTemplates((tpls as Template[]) ?? []);

    // Danh sách nhân viên active cùng location
    const { data: staffList } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("location_id", locId)
      .eq("status", "active")
      .order("full_name", { ascending: true });

    setStaff(staffList ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Open modal ──────────────────────────────── */
  function openCreate() {
    setEditId(null);
    setFormName("");
    setFormType("open");
    setFormItems([""]);
    setFormAssigned([]);
    setShowModal(true);
    setTimeout(() => inputRef.current?.focus(), 200);
  }

  function openEdit(tpl: Template) {
    setEditId(tpl.id);
    setFormName(tpl.name);
    setFormType(tpl.type);
    setFormItems([...tpl.items, ""]);
    setFormAssigned(tpl.assigned_to ?? []);
    setShowModal(true);
    setTimeout(() => inputRef.current?.focus(), 200);
  }

  /* ── Save template ───────────────────────────── */
  async function handleSave() {
    const name = formName.trim();
    if (!name) return;

    // Lọc items trống
    const items = formItems.map((i) => i.trim()).filter(Boolean);
    if (items.length === 0) {
      flash("Thêm ít nhất 1 mục", "err");
      return;
    }

    setSaving(true);

    const payload = {
      name,
      type: formType,
      items,
      assigned_to: formAssigned,
      location_id: locationId,
    };

    if (editId) {
      // Update
      const { error } = await supabase
        .from("checklist_templates")
        .update(payload)
        .eq("id", editId);

      if (error) {
        flash("Không thể lưu. Thử lại.", "err");
        console.error(error);
      } else {
        flash("Đã cập nhật template", "ok");
      }
    } else {
      // Insert
      const { error } = await supabase
        .from("checklist_templates")
        .insert(payload);

      if (error) {
        flash("Không thể tạo. Thử lại.", "err");
        console.error(error);
      } else {
        flash("Đã tạo template mới", "ok");
      }
    }

    setSaving(false);
    setShowModal(false);
    fetchData();
  }

  /* ── Delete template ─────────────────────────── */
  async function handleDelete(id: string) {
    setDeleting(id);

    const { error } = await supabase
      .from("checklist_templates")
      .delete()
      .eq("id", id);

    if (error) {
      flash("Không thể xóa. Thử lại.", "err");
    } else {
      flash("Đã xóa template", "ok");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
    setDeleting(null);
  }

  /* ── Toggle staff assignment ─────────────────── */
  function toggleAssigned(profileId: string) {
    setFormAssigned((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId],
    );
  }

  /* ── Add/remove item ─────────────────────────── */
  function updateItem(idx: number, value: string) {
    setFormItems((prev) => prev.map((item, i) => (i === idx ? value : item)));
  }

  function removeItem(idx: number) {
    if (formItems.length <= 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addItem() {
    setFormItems((prev) => [...prev, ""]);
  }

  /* ── Helpers ─────────────────────────────────── */
  function getStaffName(id: string) {
    return staff.find((s) => s.id === id)?.full_name ?? "?";
  }

  function getTypeLabel(type: string) {
    return TEMPLATE_TYPES.find((t) => t.value === type)?.label ?? type;
  }

  /* ── Loading ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-[3px] border-current border-t-transparent"
          style={{ color: "var(--brand-color)" }}
        />
      </div>
    );
  }

  /* ── Render ──────────────────────────────────── */
  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-5">
      {/* ── Header ────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Quản lý Checklist
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {templates.length} template
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white transition-transform duration-100 active:scale-[0.97]"
          style={{ backgroundColor: "var(--brand-color)" }}
        >
          <Plus size={16} strokeWidth={2} />
          Tạo mới
        </button>
      </div>

      {/* ── Empty state ───────────────────────── */}
      {templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-5xl">📋</span>
          <p className="text-sm text-muted-foreground">Chưa có checklist nào</p>
          <button
            onClick={openCreate}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-transform duration-100 active:scale-[0.97]"
            style={{ backgroundColor: "var(--brand-color)" }}
          >
            Tạo checklist đầu tiên
          </button>
        </div>
      )}

      {/* ── Template list ─────────────────────── */}
      <div className="space-y-2">
        {templates.map((tpl) => {
          const assignedNames = (tpl.assigned_to ?? [])
            .map(getStaffName)
            .filter((n) => n !== "?");

          return (
            <div
              key={tpl.id}
              className="rounded-2xl border border-foreground/10 bg-background p-4 space-y-2 transition-transform duration-100 active:scale-[0.99]"
            >
              {/* Title row */}
              <div className="flex items-start justify-between">
                <button
                  onClick={() => openEdit(tpl)}
                  className="text-left flex-1"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {tpl.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getTypeLabel(tpl.type)} · {tpl.items.length} mục
                  </p>
                </button>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  disabled={deleting === tpl.id}
                  className="text-red-400 p-1.5 rounded-lg transition hover:bg-red-50"
                >
                  {deleting === tpl.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                  ) : (
                    <Trash2 size={14} strokeWidth={2} />
                  )}
                </button>
              </div>

              {/* Assigned staff */}
              {assignedNames.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {assignedNames.map((name, i) => (
                    <span
                      key={i}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: "var(--brand-surface, #D8F3DC)",
                        color: "var(--brand-color)",
                      }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                  <UserPlus size={10} /> Chưa gán nhân viên
                </p>
              )}

              {/* Items preview */}
              <div className="flex flex-wrap gap-1">
                {tpl.items.slice(0, 3).map((item, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-foreground/5 px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {item}
                  </span>
                ))}
                {tpl.items.length > 3 && (
                  <span className="text-[10px] text-muted-foreground/50">
                    +{tpl.items.length - 3} mục
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
         Modal: Create / Edit Template
         ══════════════════════════════════════════ */}
      {showModal && (
        <div
          className="fixed inset-0 z-100 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[20px] bg-background overflow-y-auto"
            style={{
              maxHeight: "85vh",
              padding: "16px 16px 24px",
              paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
              animation: "slideUp 250ms ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">
                {editId ? "Sửa Template" : "Tạo Template mới"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground p-1"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* ── Tên template ────────────────────── */}
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Tên checklist
              </label>
              <input
                ref={inputRef}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ví dụ: Mở quán buổi sáng"
                className="w-full rounded-xl border border-foreground/10 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
            </div>

            {/* ── Loại ────────────────────────────── */}
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Loại
              </label>
              <div className="flex gap-2">
                {TEMPLATE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setFormType(t.value)}
                    className={`flex-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors ${
                      formType === t.value
                        ? "text-white"
                        : "bg-foreground/5 text-muted-foreground"
                    }`}
                    style={
                      formType === t.value
                        ? { backgroundColor: "var(--brand-color)" }
                        : undefined
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Danh sách mục ───────────────────── */}
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Danh sách mục ({formItems.filter((i) => i.trim()).length})
              </label>
              <div className="space-y-1.5">
                {formItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <GripVertical
                      size={14}
                      className="text-muted-foreground/30 shrink-0"
                    />
                    <input
                      value={item}
                      onChange={(e) => updateItem(idx, e.target.value)}
                      placeholder={`Mục ${idx + 1}`}
                      className="flex-1 rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/30 focus:outline-none"
                    />
                    {formItems.length > 1 && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-red-400 p-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--brand-color)" }}
                >
                  <Plus size={12} /> Thêm mục
                </button>
              </div>
            </div>

            {/* ── Gán nhân viên ───────────────────── */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Gán nhân viên ({formAssigned.length})
              </label>
              {staff.length === 0 ? (
                <p className="text-xs text-muted-foreground/50">
                  Chưa có nhân viên active
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {staff.map((s) => {
                    const isSelected = formAssigned.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleAssigned(s.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          isSelected
                            ? "text-white"
                            : "bg-foreground/5 text-muted-foreground"
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: "var(--brand-color)" }
                            : undefined
                        }
                      >
                        {s.full_name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Submit ──────────────────────────── */}
            <button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-40 transition-transform duration-100 active:scale-[0.98]"
              style={{ backgroundColor: "var(--brand-color)" }}
            >
              {saving ? "Đang lưu..." : editId ? "Cập nhật" : "Tạo checklist"}
            </button>
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-lg ${
            toast.type === "ok" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
