"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Pencil, Trash2, Users, X, Save } from "lucide-react";
import { useRouter } from "next/navigation";

type Template = {
  id: string;
  name: string;
  type: string;
  items: string[];
  assigned_to: string[] | null;
  location_id: string;
};

type Profile = {
  id: string;
  full_name: string;
  role: string;
};

const TYPES = [
  { value: "open", label: "Mở quán" },
  { value: "close", label: "Đóng quán" },
  { value: "daily", label: "Hàng ngày" },
];

export default function ChecklistManagePage() {
  const router = useRouter();
  const supabase = useRef(createClient());

  const [templates, setTemplates] = useState<Template[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit/Create modal
  const [editing, setEditing] = useState<Template | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("open");
  const [formItems, setFormItems] = useState<string[]>([""]);
  const [formAssigned, setFormAssigned] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Load templates + employees ─────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const sb = supabase.current;

    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;

    const { data: prof } = await sb
      .from("profiles")
      .select("location_id")
      .eq("id", user.id)
      .single();

    const locationId = prof?.location_id ?? "enso";

    // Templates for this location
    const { data: tpls } = await sb
      .from("checklist_templates")
      .select("id, name, type, items, assigned_to, location_id")
      .eq("location_id", locationId)
      .order("type");

    setTemplates((tpls ?? []) as Template[]);

    // Employees in same location
    const { data: emps } = await sb
      .from("profiles")
      .select("id, full_name, role")
      .eq("location_id", locationId)
      .eq("status", "active")
      .order("full_name");

    setEmployees((emps ?? []) as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Open edit modal ────────────────────────────────────
  function openEdit(tpl: Template) {
    setIsNew(false);
    setEditing(tpl);
    setFormName(tpl.name);
    setFormType(tpl.type);
    setFormItems([...tpl.items, ""]); // extra empty row
    setFormAssigned(tpl.assigned_to ?? []);
  }

  function openNew() {
    setIsNew(true);
    setEditing({
      id: "",
      name: "",
      type: "open",
      items: [],
      assigned_to: [],
      location_id: "",
    });
    setFormName("");
    setFormType("open");
    setFormItems([""]);
    setFormAssigned([]);
  }

  // ── Save template ──────────────────────────────────────
  async function handleSave() {
    const cleanItems = formItems.map((s) => s.trim()).filter(Boolean);
    if (!formName.trim() || cleanItems.length === 0) {
      setToast("Cần có tên và ít nhất 1 mục");
      return;
    }

    setSaving(true);
    const sb = supabase.current;

    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;

    const { data: prof } = await sb
      .from("profiles")
      .select("location_id")
      .eq("id", user.id)
      .single();

    const payload = {
      name: formName.trim(),
      type: formType,
      items: cleanItems,
      assigned_to: formAssigned.length > 0 ? formAssigned : null,
      location_id: prof?.location_id ?? "enso",
    };

    if (isNew) {
      await sb.from("checklist_templates").insert(payload);
      setToast("Đã tạo checklist ✓");
    } else {
      await sb
        .from("checklist_templates")
        .update(payload)
        .eq("id", editing!.id);
      setToast("Đã lưu ✓");
    }

    setSaving(false);
    setEditing(null);
    await loadData();
  }

  // ── Delete template ────────────────────────────────────
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Xóa "${name}"? Không thể hoàn tác!`)) return;
    await supabase.current.from("checklist_templates").delete().eq("id", id);
    setToast("Đã xóa");
    await loadData();
  }

  // ── Toggle employee assignment ─────────────────────────
  function toggleAssign(empId: string) {
    setFormAssigned((prev) =>
      prev.includes(empId)
        ? prev.filter((id) => id !== empId)
        : [...prev, empId],
    );
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-md px-4 py-5 pb-28 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 transition-transform active:scale-90"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">
            Quản lý Checklist
          </h1>
          <p className="text-xs text-muted-foreground">
            {templates.length} checklist
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-white transition-all active:scale-95"
          style={{ backgroundColor: "var(--brand-color)" }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Thêm
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="mb-3 rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-2.5 text-center text-sm text-foreground animate-in fade-in slide-in-from-top-2 duration-200">
          {toast}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-foreground/10 p-4"
            >
              <div className="h-4 w-32 animate-pulse rounded bg-foreground/10 mb-2" />
              <div className="h-3 w-20 animate-pulse rounded bg-foreground/8" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && templates.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-sm text-foreground/50">Chưa có checklist nào</p>
          <p className="mt-1 text-xs text-foreground/30">
            Bấm &quot;Thêm&quot; để tạo mới
          </p>
        </div>
      )}

      {/* Template list */}
      {!loading && templates.length > 0 && (
        <div className="space-y-2.5">
          {templates.map((tpl) => {
            const typeLabel =
              TYPES.find((t) => t.value === tpl.type)?.label ?? tpl.type;
            const assignedCount = tpl.assigned_to?.length ?? 0;

            return (
              <div
                key={tpl.id}
                className="rounded-2xl border border-foreground/10 bg-background p-4 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {tpl.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-foreground/40">
                      <span className="rounded bg-foreground/5 px-1.5 py-0.5 font-semibold">
                        {typeLabel}
                      </span>
                      <span>· {tpl.items.length} mục</span>
                      {assignedCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Users size={10} /> {assignedCount}
                        </span>
                      )}
                    </div>
                    {/* Show items preview */}
                    <div className="mt-2 space-y-0.5">
                      {tpl.items.slice(0, 3).map((item, i) => (
                        <p
                          key={i}
                          className="text-xs text-foreground/30 truncate"
                        >
                          {i + 1}. {item}
                        </p>
                      ))}
                      {tpl.items.length > 3 && (
                        <p className="text-xs text-foreground/20">
                          +{tpl.items.length - 3} mục khác...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => openEdit(tpl)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500 transition-transform active:scale-90"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(tpl.id, tpl.name)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 transition-transform active:scale-90"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit/Create Modal ─────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-3xl bg-background p-5 pb-6 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col"
            style={{
              boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
              maxHeight: "85dvh",
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">
                {isNew ? "📋 Tạo Checklist" : "✏️ Sửa Checklist"}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5"
              >
                <X size={18} color="#999" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground/60">
                  Tên checklist
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Đóng quán tối"
                  className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
                />
              </div>

              {/* Type */}
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground/60">
                  Loại
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormType(t.value)}
                      className={`rounded-xl py-2 text-xs font-semibold transition-all active:scale-[0.95] ${
                        formType === t.value
                          ? "text-white"
                          : "bg-foreground/5 text-foreground/60"
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

              {/* Items */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground/60">
                  Các mục ({formItems.filter((s) => s.trim()).length})
                </label>
                <div className="space-y-1.5">
                  {formItems.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const next = [...formItems];
                          next[i] = e.target.value;
                          setFormItems(next);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            setFormItems([...formItems, ""]);
                          }
                        }}
                        placeholder={`Mục ${i + 1}`}
                        className="flex-1 rounded-xl border border-foreground/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
                      />
                      {formItems.length > 1 && (
                        <button
                          onClick={() =>
                            setFormItems(formItems.filter((_, j) => j !== i))
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-400 transition-transform active:scale-90"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setFormItems([...formItems, ""])}
                  className="mt-2 flex items-center gap-1 text-xs font-semibold opacity-50 active:opacity-100"
                  style={{ color: "var(--brand-color)" }}
                >
                  <Plus size={14} /> Thêm mục
                </button>
              </div>

              {/* Assign employees */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground/60">
                  <Users size={12} className="inline mr-1" />
                  Gán cho nhân viên
                  {formAssigned.length === 0 && (
                    <span className="font-normal text-foreground/30 ml-1">
                      (Không chọn = tất cả thấy)
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                  {employees.map((emp) => {
                    const selected = formAssigned.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleAssign(emp.id)}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition-all active:scale-[0.97] ${
                          selected
                            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                            : "bg-foreground/3 text-foreground/50"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-md text-[8px] font-bold ${
                            selected
                              ? "bg-blue-500 text-white"
                              : "bg-foreground/10 text-foreground/40"
                          }`}
                        >
                          {selected ? "✓" : emp.full_name[0]}
                        </span>
                        <span className="truncate">{emp.full_name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-40"
              style={{ backgroundColor: "var(--brand-color)" }}
            >
              <Save size={16} />
              {saving
                ? "Đang lưu..."
                : isNew
                  ? "Tạo Checklist"
                  : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
