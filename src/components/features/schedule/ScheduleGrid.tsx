"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  startOfWeek,
  addDays,
  format,
  isToday,
  addWeeks,
  subWeeks,
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X, Plus } from "lucide-react";

/* ── Types ──────────────────────────────────────────── */
type ShiftRow = {
  id: string;
  profile_id: string;
  start_time: string;
  end_time: string;
  role_tag: string;
  status: string;
};

type Employee = {
  id: string;
  full_name: string;
  role: string;
};

/* ── Shift color by time ────────────────────────────── */
function shiftColor(startHour: number): { bg: string; text: string; label: string } {
  if (startHour < 15) {
    return { bg: "#fef9c3", text: "#a16207", label: "Ca 1" }; // yellow
  }
  return { bg: "#fee2e2", text: "#dc2626", label: "Ca 2" }; // red
}

/* ── Props ──────────────────────────────────────────── */
type ScheduleGridProps = {
  locationId: string;
  isOwner: boolean;
};

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const LOCATIONS = [
  { id: "origami", label: "Origami" },
  { id: "enso", label: "Enso" },
  { id: "okyu", label: "Okyu" },
];

/* ══════════════════════════════════════════════════════
   ScheduleGrid
   ══════════════════════════════════════════════════════ */
export default function ScheduleGrid({ locationId: defaultLoc, isOwner }: ScheduleGridProps) {
  const supabase = useRef(createClient());

  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [activeLoc, setActiveLoc] = useState(defaultLoc);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag state
  const [dragShift, setDragShift] = useState<ShiftRow | null>(null);
  const [dropTarget, setDropTarget] = useState<{ empId: string; dayIdx: number } | null>(null);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    shift: ShiftRow;
    fromName: string;
    toName: string;
    toId: string;
  } | null>(null);

  // New shift modal
  const [newShiftModal, setNewShiftModal] = useState<{
    empId: string;
    empName: string;
    date: string;
  } | null>(null);
  const [newStart, setNewStart] = useState("10:30");
  const [newEnd, setNewEnd] = useState("15:00");
  const [newRole, setNewRole] = useState("service");
  const [creating, setCreating] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Week days ────────────────────────────────────────
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // ── Load data ────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const sb = supabase.current;

    // Employees at location
    const { data: emps } = await sb
      .from("profiles")
      .select("id, full_name, role")
      .eq("location_id", activeLoc)
      .eq("status", "active")
      .order("full_name");

    setEmployees((emps ?? []) as Employee[]);

    // Shifts for the week
    const wsISO = format(weekStart, "yyyy-MM-dd") + "T00:00:00";
    const weISO = format(addDays(weekStart, 6), "yyyy-MM-dd") + "T23:59:59";

    const { data: shiftData } = await sb
      .from("shifts")
      .select("id, profile_id, start_time, end_time, role_tag, status")
      .eq("location_id", activeLoc)
      .gte("start_time", wsISO)
      .lte("start_time", weISO)
      .neq("status", "cancelled")
      .order("start_time");

    setShifts((shiftData ?? []) as ShiftRow[]);
    setLoading(false);
  }, [activeLoc, weekStart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Get shifts for a cell ────────────────────────────
  function getCellShifts(empId: string, dayIdx: number): ShiftRow[] {
    const dayStr = format(weekDays[dayIdx], "yyyy-MM-dd");
    return shifts.filter(
      (s) =>
        s.profile_id === empId &&
        s.start_time.startsWith(dayStr),
    );
  }

  // ── Drag handlers ────────────────────────────────────
  function handleDragStart(shift: ShiftRow) {
    setDragShift(shift);
  }

  function handleDragOver(e: React.DragEvent, empId: string, dayIdx: number) {
    e.preventDefault();
    setDropTarget({ empId, dayIdx });
  }

  function handleDragLeave() {
    setDropTarget(null);
  }

  function handleDrop(empId: string) {
    if (!dragShift || dragShift.profile_id === empId) {
      setDragShift(null);
      setDropTarget(null);
      return;
    }

    const fromEmp = employees.find((e) => e.id === dragShift.profile_id);
    const toEmp = employees.find((e) => e.id === empId);

    setConfirmModal({
      shift: dragShift,
      fromName: fromEmp?.full_name ?? "—",
      toName: toEmp?.full_name ?? "—",
      toId: empId,
    });
    setDragShift(null);
    setDropTarget(null);
  }

  // ── Confirm transfer ─────────────────────────────────
  async function confirmTransfer() {
    if (!confirmModal) return;

    await supabase.current
      .from("shifts")
      .update({ profile_id: confirmModal.toId })
      .eq("id", confirmModal.shift.id);

    setToast(
      `Ca đã chuyển cho ${confirmModal.toName} ✓`,
    );
    setConfirmModal(null);
    await loadData();
  }

  // ── Create new shift ──────────────────────────────────
  async function handleCreateShift() {
    if (!newShiftModal) return;
    setCreating(true);

    const startTime = `${newShiftModal.date}T${newStart}:00`;
    const endTime = `${newShiftModal.date}T${newEnd}:00`;

    await supabase.current.from("shifts").insert({
      profile_id: newShiftModal.empId,
      location_id: activeLoc,
      start_time: startTime,
      end_time: endTime,
      role_tag: newRole,
      status: "scheduled",
      is_marketplace: false,
    });

    setToast("Đã tạo ca ✓");
    setNewShiftModal(null);
    setCreating(false);
    await loadData();
  }

  // ── Week nav ─────────────────────────────────────────
  function goWeek(dir: -1 | 1) {
    if ("vibrate" in navigator) navigator.vibrate(5);
    setCurrentWeek(dir === -1 ? subWeeks(currentWeek, 1) : addWeeks(currentWeek, 1));
  }

  // ── Render ───────────────────────────────────────────
  return (
    <div className="animate-in fade-in duration-300">
      {/* ── Location tabs (Owner only) ─────────────── */}
      {isOwner && (
        <div className="flex gap-1 px-4 pt-3 pb-1">
          {LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setActiveLoc(loc.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                activeLoc === loc.id
                  ? "text-white"
                  : "text-foreground/50 bg-foreground/5"
              }`}
              style={
                activeLoc === loc.id
                  ? { backgroundColor: "var(--brand-color)" }
                  : undefined
              }
            >
              {loc.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Week header ────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => goWeek(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/5 transition-transform active:scale-90"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <span className="text-sm font-bold text-foreground">
          {format(weekStart, "dd.MM")} — {format(addDays(weekStart, 6), "dd.MM.yyyy")}
        </span>
        <button
          onClick={() => goWeek(1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/5 transition-transform active:scale-90"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Toast ──────────────────────────────────── */}
      {toast && (
        <div className="mx-4 mb-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-center text-sm text-emerald-700 animate-in fade-in slide-in-from-top-2 duration-200">
          {toast}
        </div>
      )}

      {/* ── Grid table ─────────────────────────────── */}
      {loading ? (
        <div className="px-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-foreground/10" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto px-2 pb-28">
          <table className="w-full border-collapse" style={{ minWidth: 700 }}>
            {/* Day headers */}
            <thead>
              <tr>
                <th
                  className="sticky left-0 z-10 bg-background border-b border-foreground/10 px-2 py-2 text-left"
                  style={{ width: 120, minWidth: 120 }}
                >
                  <span className="text-[10px] font-bold uppercase text-foreground/40 tracking-wider">
                    Nhân viên
                  </span>
                </th>
                {weekDays.map((day, i) => {
                  const today = isToday(day);
                  return (
                    <th
                      key={i}
                      className={`border-b border-foreground/10 px-1 py-2 text-center ${
                        today ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                      }`}
                      style={{ minWidth: 80 }}
                    >
                      <div className="text-[9px] font-bold uppercase text-foreground/40 tracking-wider">
                        {DAY_LABELS[i]}
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          today ? "text-blue-600" : "text-foreground"
                        }`}
                      >
                        {format(day, "dd")}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Employee rows */}
            <tbody>
              {employees.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-sm text-foreground/30"
                  >
                    Chưa có nhân viên
                  </td>
                </tr>
              )}
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b border-foreground/5">
                  {/* Employee name (sticky) */}
                  <td
                    className="sticky left-0 z-10 bg-background px-2 py-1.5"
                    style={{ width: 120 }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: "var(--brand-color)" }}
                      >
                        {emp.full_name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate" style={{ maxWidth: 80 }}>
                          {emp.full_name}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Day cells */}
                  {weekDays.map((day, dayIdx) => {
                    const cellShifts = getCellShifts(emp.id, dayIdx);
                    const isDropHere =
                      dropTarget?.empId === emp.id &&
                      dropTarget?.dayIdx === dayIdx;
                    const today = isToday(day);

                    return (
                      <td
                        key={dayIdx}
                        className={`px-0.5 py-1 align-top transition-colors ${
                          isDropHere
                            ? "bg-blue-100/60 dark:bg-blue-900/30"
                            : today
                              ? "bg-blue-50/30 dark:bg-blue-950/10"
                              : ""
                        }`}
                        onDragOver={(e) => handleDragOver(e, emp.id, dayIdx)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDrop(emp.id)}
                        onClick={() => {
                          if (cellShifts.length === 0) {
                            setNewShiftModal({
                              empId: emp.id,
                              empName: emp.full_name,
                              date: format(day, "yyyy-MM-dd"),
                            });
                            setNewStart("10:30");
                            setNewEnd("15:00");
                          }
                        }}
                        style={{ cursor: cellShifts.length === 0 ? "pointer" : "default" }}
                      >
                        {cellShifts.length === 0 && (
                          <div className="flex h-10 items-center justify-center opacity-0 hover:opacity-30 transition-opacity">
                            <Plus size={14} className="text-foreground/30" />
                          </div>
                        )}
                        {cellShifts.map((s) => {
                          const startH = new Date(s.start_time).getHours() + new Date(s.start_time).getMinutes() / 60;
                          const colors = shiftColor(startH);
                          const startStr = format(new Date(s.start_time), "HH:mm");
                          const endStr = format(new Date(s.end_time), "HH:mm");

                          return (
                            <div
                              key={s.id}
                              draggable
                              onDragStart={() => handleDragStart(s)}
                              className="mb-0.5 cursor-grab rounded-lg px-1.5 py-1 text-center transition-all active:cursor-grabbing active:scale-95 hover:shadow-sm"
                              style={{
                                backgroundColor: colors.bg,
                                border: `1px solid ${colors.text}30`,
                              }}
                            >
                              <p
                                className="text-[10px] font-bold leading-tight"
                                style={{ color: colors.text }}
                              >
                                {startStr}
                              </p>
                              <p
                                className="text-[9px] leading-tight"
                                style={{ color: `${colors.text}90` }}
                              >
                                {endStr}
                              </p>
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Confirm Modal ──────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-sm rounded-3xl bg-background p-5 animate-in fade-in zoom-in-95 duration-200"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}
          >
            <h3 className="text-base font-bold text-foreground mb-3">
              🔄 Chuyển ca?
            </h3>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-foreground/50">Từ:</span>
                <span className="font-semibold text-foreground">{confirmModal.fromName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-foreground/50">Sang:</span>
                <span className="font-semibold text-foreground">{confirmModal.toName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-foreground/50">Ca:</span>
                <span className="font-semibold text-foreground">
                  {format(new Date(confirmModal.shift.start_time), "HH:mm")} —{" "}
                  {format(new Date(confirmModal.shift.end_time), "HH:mm")}{" "}
                  ({format(new Date(confirmModal.shift.start_time), "EEEE dd.MM", { locale: de })})
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmTransfer}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97]"
                style={{ backgroundColor: "var(--brand-color)" }}
              >
                ✓ Xác nhận
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 rounded-xl border border-foreground/10 py-2.5 text-sm font-semibold text-foreground/50 transition-all active:scale-[0.97]"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Shift Modal ────────────────────────── */}
      {newShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-sm rounded-3xl bg-background p-5 animate-in fade-in zoom-in-95 duration-200"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">
                ➕ Thêm ca
              </h3>
              <button
                onClick={() => setNewShiftModal(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/5"
              >
                <X size={16} color="#999" />
              </button>
            </div>

            <p className="text-xs text-foreground/50 mb-3">
              {newShiftModal.empName} · {format(new Date(newShiftModal.date), "EEEE dd.MM", { locale: de })}
            </p>

            {/* Quick select */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => { setNewStart("10:30"); setNewEnd("15:00"); }}
                className={`rounded-xl py-2.5 text-xs font-semibold transition-all active:scale-95 ${
                  newStart === "10:30" && newEnd === "15:00"
                    ? "text-white"
                    : "bg-foreground/5 text-foreground/60"
                }`}
                style={
                  newStart === "10:30" && newEnd === "15:00"
                    ? { backgroundColor: "#eab308" }
                    : undefined
                }
              >
                🟡 Ca 1: 10:30–15:00
              </button>
              <button
                type="button"
                onClick={() => { setNewStart("15:00"); setNewEnd("22:00"); }}
                className={`rounded-xl py-2.5 text-xs font-semibold transition-all active:scale-95 ${
                  newStart === "15:00" && newEnd === "22:00"
                    ? "text-white"
                    : "bg-foreground/5 text-foreground/60"
                }`}
                style={
                  newStart === "15:00" && newEnd === "22:00"
                    ? { backgroundColor: "#ef4444" }
                    : undefined
                }
              >
                🔴 Ca 2: 15:00–22:00
              </button>
            </div>

            {/* Custom time */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-[10px] font-medium text-foreground/40 mb-1">Bắt đầu</label>
                <input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full rounded-xl border border-foreground/10 px-2 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-foreground/40 mb-1">Kết thúc</label>
                <input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="w-full rounded-xl border border-foreground/10 px-2 py-2 text-sm"
                />
              </div>
            </div>

            {/* Role tag */}
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {[
                { v: "service", l: "Service" },
                { v: "kitchen", l: "Bếp" },
                { v: "bar", l: "Bar" },
              ].map((r) => (
                <button
                  key={r.v}
                  type="button"
                  onClick={() => setNewRole(r.v)}
                  className={`rounded-xl py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                    newRole === r.v
                      ? "text-white"
                      : "bg-foreground/5 text-foreground/60"
                  }`}
                  style={
                    newRole === r.v
                      ? { backgroundColor: "var(--brand-color)" }
                      : undefined
                  }
                >
                  {r.l}
                </button>
              ))}
            </div>

            <button
              onClick={handleCreateShift}
              disabled={creating}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-40"
              style={{ backgroundColor: "var(--brand-color)" }}
            >
              {creating ? "Đang tạo..." : "Tạo ca"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
