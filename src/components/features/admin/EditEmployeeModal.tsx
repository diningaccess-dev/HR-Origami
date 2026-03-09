"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import type { Employee } from "@/app/(app)/admin/employees/page";
import { format } from "date-fns";

const ROLES = [
  { value: "staff", label: "Nhân viên" },
  { value: "azubi", label: "Azubi" },
  { value: "manager", label: "Manager" },
  { value: "owner", label: "Owner" },
];

const LOCATIONS = [
  { value: "enso", label: "🍃 Enso" },
  { value: "origami", label: "🦢 Origami" },
  { value: "okyu", label: "🔴 Okyu" },
];

const DOC_TYPES: Record<string, string> = {
  contract: "📄 Hợp đồng",
  rote_karte: "🔴 Rote Karte",
  gesundheitszeugnis: "🏥 Gesundheitszeugnis",
  au: "🩺 AU Bescheinigung",
  other: "📎 Khác",
};

const TABS = [
  { key: "info", label: "👤 Thông tin" },
  { key: "docs", label: "📄 Tài liệu" },
  { key: "tasks", label: "✅ Công việc" },
];

type Document = {
  id: string;
  type: string;
  file_url: string | null;
  expires_at: string | null;
  created_at: string;
};

type Props = {
  employee: Employee;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditEmployeeModal({
  employee,
  onClose,
  onSaved,
}: Props) {
  const [tab, setTab] = useState("info");

  // ── Info tab state ────────────────────────────────────
  const [fullName, setFullName] = useState(employee.full_name);
  const [role, setRole] = useState(employee.role);
  const [department, setDepartment] = useState(employee.department ?? "");
  const [position, setPosition] = useState(employee.position ?? "");
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [startDate, setStartDate] = useState(employee.start_date ?? "");
  const [birthday, setBirthday] = useState(employee.birthday ?? "");
  const [locationId, setLocationId] = useState(employee.location_id);
  const [saving, setSaving] = useState(false);

  // ── Docs tab state ────────────────────────────────────
  const [docs, setDocs] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const supabase = useRef(createClient());

  const fetchDocs = useCallback(async () => {
    setDocsLoading(true);
    const { data } = await supabase.current
      .from("documents")
      .select("id, type, file_url, expires_at, created_at")
      .eq("profile_id", employee.id)
      .order("created_at", { ascending: false });
    setDocs((data ?? []) as Document[]);
    setDocsLoading(false);
  }, [employee.id]);

  useEffect(() => {
    if (tab === "docs") fetchDocs();
  }, [tab, fetchDocs]);

  // ── Save info ──────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    await supabase.current
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        role,
        location_id: locationId,
        department: department || null,
        position: position || null,
        phone: phone || null,
        start_date: startDate || null,
        birthday: birthday || null,
      })
      .eq("id", employee.id);

    setSaving(false);
    onSaved();
  }

  // ── Initials ───────────────────────────────────────────
  const initials = employee.full_name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-3xl bg-background p-5 pb-6 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.2)", maxHeight: "85dvh" }}
      >
        {/* ── Header ─────────────────────────────── */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: "var(--brand-color)" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground truncate">
              {employee.full_name}
            </p>
            <span
              className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase"
              style={{
                backgroundColor:
                  role === "manager" || role === "owner"
                    ? "#dbeafe"
                    : role === "azubi"
                      ? "#fef3c7"
                      : "#d1fae5",
                color:
                  role === "manager" || role === "owner"
                    ? "#2563eb"
                    : role === "azubi"
                      ? "#d97706"
                      : "#059669",
              }}
            >
              {ROLES.find((r) => r.value === role)?.label ?? role}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5"
          >
            <X size={18} strokeWidth={2} color="#999" />
          </button>
        </div>

        {/* ── Tabs ────────────────────────────────── */}
        <div className="flex gap-0 mb-5 rounded-xl bg-foreground/5 p-1">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  if ("vibrate" in navigator) navigator.vibrate(5);
                  setTab(t.key);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.97] ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-foreground/50"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab content (scrollable) ─────────── */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Tab: Thông tin ──────────────────────── */}
          {tab === "info" && (
            <div
              key="info"
              className="space-y-3 animate-in fade-in duration-200"
            >
              {/* Họ tên + Vai trò */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground/60">
                    Họ tên
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground/60">
                    Vai trò
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm focus:outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phòng ban + Chức vụ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground/60">
                    Phòng ban
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground/60">
                    Chức vụ
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  />
                </div>
              </div>

              {/* SĐT + Ngày vào làm */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground/60">
                    SĐT
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground/60">
                    Ngày vào làm
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Ngày sinh + Quán */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground/60">
                    🎂 Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground/60">
                    🏪 Quán
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm focus:outline-none"
                  >
                    {LOCATIONS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSave}
                disabled={saving || !fullName.trim()}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-40"
                style={{ backgroundColor: "var(--brand-color)" }}
              >
                {saving ? "Đang lưu..." : "🗂️ Lưu thay đổi"}
              </button>
            </div>
          )}

          {/* ── Tab: Tài liệu ──────────────────────── */}
          {tab === "docs" && (
            <div
              key="docs"
              className="space-y-2.5 animate-in fade-in duration-200"
            >
              {docsLoading && (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-foreground/10 p-3"
                    >
                      <div className="h-8 w-8 animate-pulse rounded-lg bg-foreground/10" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 w-20 animate-pulse rounded bg-foreground/10" />
                        <div className="h-2.5 w-28 animate-pulse rounded bg-foreground/8" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!docsLoading && docs.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm text-foreground/40">
                    Chưa có tài liệu nào
                  </p>
                  <p className="mt-1 text-xs text-foreground/30">
                    Upload tài liệu trong mục Giấy tờ
                  </p>
                </div>
              )}

              {!docsLoading &&
                docs.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-foreground/10 p-3 transition-all active:scale-[0.98]"
                  >
                    <span className="text-lg">
                      {DOC_TYPES[doc.type]?.split(" ")[0] ?? "📎"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {DOC_TYPES[doc.type]?.split(" ").slice(1).join(" ") ??
                          doc.type}
                      </p>
                      <p className="text-xs text-foreground/40">
                        {format(new Date(doc.created_at), "dd.MM.yyyy")}
                        {doc.expires_at &&
                          ` · HH: ${format(new Date(doc.expires_at), "dd.MM.yyyy")}`}
                      </p>
                    </div>
                    <svg
                      className="h-4 w-4 text-foreground/20"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                  </a>
                ))}
            </div>
          )}

          {/* ── Tab: Công việc ──────────────────────── */}
          {tab === "tasks" && (
            <div
              key="tasks"
              className="py-10 text-center animate-in fade-in duration-200"
            >
              <p className="text-3xl mb-3">🚧</p>
              <p className="text-sm font-medium text-foreground/50">
                Tính năng đang phát triển
              </p>
              <p className="mt-1 text-xs text-foreground/30">
                Giao việc & theo dõi tiến độ
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
