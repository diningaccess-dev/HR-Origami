"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";

const ROLES = [
  { value: "staff", label: "Nhân viên" },
  { value: "azubi", label: "Azubi" },
  { value: "manager", label: "Manager" },
];

const LOCATIONS = [
  { value: "enso", label: "🍃 Enso" },
  { value: "origami", label: "🦢 Origami" },
  { value: "okyu", label: "🔴 Okyu" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateEmployeeModal({
  open,
  onClose,
  onCreated,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [locationId, setLocationId] = useState("enso");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email || !password) return;
    if (password.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();

    // 1. Tạo auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        setError("Email đã được sử dụng");
      } else {
        setError("Không thể tạo tài khoản: " + signUpError.message);
      }
      setLoading(false);
      return;
    }

    // 2. Cập nhật profile
    if (data.user) {
      await new Promise((r) => setTimeout(r, 500)); // chờ trigger tạo profile

      const updates: Record<string, string | null> = {
        full_name: fullName.trim(),
        role,
        location_id: locationId,
        status: "active",
      };
      if (department) updates.department = department;
      if (position) updates.position = position;
      if (phone) updates.phone = phone;
      if (startDate) updates.start_date = startDate;

      await supabase.from("profiles").update(updates).eq("id", data.user.id);
    }

    // 3. Reset & close
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("staff");
    setLocationId("enso");
    setDepartment("");
    setPosition("");
    setPhone("");
    setStartDate("");
    setLoading(false);
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div
        className="w-full max-w-md rounded-t-3xl bg-background p-5 pb-8 animate-in slide-in-from-bottom duration-250 max-h-[90dvh] overflow-y-auto"
        style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-foreground">
            ➕ Tạo tài khoản mới
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5"
          >
            <X size={18} strokeWidth={2} color="#999" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 animate-in fade-in duration-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Họ tên */}
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/60">
              Họ tên <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/60">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@gmail.com"
              className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          {/* Mật khẩu */}
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/60">
              Mật khẩu <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full rounded-xl border border-foreground/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          {/* Vai trò + Quán */}
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/60">
                Quán
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
                placeholder="VD: Kế toán"
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
                placeholder="VD: Nhân viên KT"
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
                placeholder="0901234567"
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !fullName.trim() || !email || !password}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-40"
            style={{ backgroundColor: "var(--brand-color)" }}
          >
            {loading ? "Đang tạo..." : "Tạo tài khoản"}
          </button>
        </form>
      </div>
    </div>
  );
}
