"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import CreateEmployeeModal from "@/components/features/admin/CreateEmployeeModal";
import EditEmployeeModal from "@/components/features/admin/EditEmployeeModal";

const LOCATION_TABS = [
  { value: "all", label: "Tất cả", emoji: "👥" },
  { value: "origami", label: "Origami", emoji: "🦢" },
  { value: "enso", label: "Enso", emoji: "🍃" },
  { value: "okyu", label: "Okyu", emoji: "🔴" },
];

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  owner: { bg: "#fee2e2", text: "#dc2626" },
  manager: { bg: "#dbeafe", text: "#2563eb" },
  staff: { bg: "#d1fae5", text: "#059669" },
  azubi: { bg: "#fef3c7", text: "#d97706" },
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Nhân viên",
  azubi: "Azubi",
};

const LOC_COLORS: Record<string, { bg: string; text: string }> = {
  enso: { bg: "#D8F3DC", text: "#2D6A4F" },
  origami: { bg: "#F5EFE6", text: "#8B7355" },
  okyu: { bg: "#FFEBEE", text: "#C62828" },
};

export type Employee = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  location_id: string;
  status: string;
  department: string | null;
  position: string | null;
  phone: string | null;
  start_date: string | null;
  birthday: string | null;
  created_at: string;
};

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const supabase = createClient();

  // ── Toast auto-clear ───────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Fetch employees ────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, location_id, status, department, position, phone, start_date, birthday, created_at",
      )
      .in("status", ["active", "pending"])
      .order("full_name");

    setEmployees((data ?? []) as Employee[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Delete employee ────────────────────────────────────
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Xóa tài khoản "${name}"? Không thể hoàn tác!`)) return;

    const { error } = await supabase
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", id);

    if (error) {
      setToast("Không thể xóa. Thử lại sau.");
    } else {
      setToast(`Đã xóa ${name}`);
      fetchEmployees();
    }
  }

  // ── Filter ─────────────────────────────────────────────
  const filtered = employees.filter((emp) => {
    if (activeTab !== "all" && emp.location_id !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        emp.full_name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const initials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-lg px-4 py-5 pb-28 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 transition-transform active:scale-90"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">
            Quản lý nhân viên
          </h1>
          <p className="text-xs text-muted-foreground">
            {employees.length} nhân viên
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-white transition-all active:scale-95"
          style={{ backgroundColor: "var(--brand-color)" }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Thêm
        </button>
      </div>

      {/* ── Location tabs ────────────────────────── */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
        {LOCATION_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => {
                if ("vibrate" in navigator) navigator.vibrate(5);
                setActiveTab(tab.value);
              }}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.95] ${
                isActive
                  ? "text-white shadow-sm"
                  : "bg-foreground/5 text-foreground/60"
              }`}
              style={
                isActive ? { backgroundColor: "var(--brand-color)" } : undefined
              }
            >
              {tab.emoji} {tab.label}
              {tab.value === "all" && (
                <span className="ml-1 opacity-60">{employees.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Search ───────────────────────────────── */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tên, email..."
          className="w-full rounded-xl border border-foreground/10 bg-background pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/20 focus:outline-none focus:ring-2 focus:ring-foreground/5"
        />
      </div>

      {/* ── Toast ─────────────────────────────────── */}
      {toast && (
        <div className="mb-3 rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-2.5 text-center text-sm text-foreground animate-in fade-in slide-in-from-top-2 duration-200">
          {toast}
        </div>
      )}

      {/* ── Loading ──────────────────────────────── */}
      {loading && (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-foreground/10 p-4"
            >
              <div className="h-10 w-10 animate-pulse rounded-xl bg-foreground/10" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-28 animate-pulse rounded bg-foreground/10" />
                <div className="h-3 w-36 animate-pulse rounded bg-foreground/8" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty ────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-foreground/50">
            {search ? "Không tìm thấy nhân viên." : "Chưa có nhân viên nào."}
          </p>
        </div>
      )}

      {/* ── Employee cards ───────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((emp) => {
            const roleStyle = ROLE_COLORS[emp.role] ?? ROLE_COLORS.staff;
            const locStyle = LOC_COLORS[emp.location_id] ?? LOC_COLORS.enso;

            return (
              <div
                key={emp.id}
                className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-background p-3.5 transition-all duration-200 animate-in fade-in duration-200"
              >
                {/* Avatar */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                  style={{
                    backgroundColor: locStyle.bg,
                    color: locStyle.text,
                  }}
                >
                  {initials(emp.full_name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {emp.full_name}
                  </p>
                  <p className="text-xs text-foreground/40 truncate">
                    {emp.email}
                  </p>
                  <div className="flex gap-1.5 mt-1">
                    <span
                      className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase"
                      style={{
                        backgroundColor: roleStyle.bg,
                        color: roleStyle.text,
                      }}
                    >
                      {ROLE_LABELS[emp.role] ?? emp.role}
                    </span>
                    <span
                      className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase"
                      style={{
                        backgroundColor: locStyle.bg,
                        color: locStyle.text,
                      }}
                    >
                      {emp.location_id}
                    </span>
                    {emp.status === "pending" && (
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">
                        Chờ duyệt
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => setEditEmployee(emp)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500 transition-transform active:scale-90"
                    title="Sửa"
                  >
                    <Pencil size={14} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id, emp.full_name)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 transition-transform active:scale-90"
                    title="Xóa"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ────────────────────────────────── */}
      <CreateEmployeeModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setToast("Tạo tài khoản thành công ✓");
          fetchEmployees();
        }}
      />

      {editEmployee && (
        <EditEmployeeModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSaved={() => {
            setToast("Đã lưu thay đổi ✓");
            fetchEmployees();
            setEditEmployee(null);
          }}
        />
      )}
    </div>
  );
}
