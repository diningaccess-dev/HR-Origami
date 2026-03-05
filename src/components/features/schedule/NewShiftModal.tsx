"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";

// ── Zod schema ──────────────────────────────────────────────
const shiftSchema = z
  .object({
    profile_id: z.string().min(1, "Chọn nhân viên"),
    date: z.string().min(1, "Chọn ngày"),
    start_time: z.string().min(1, "Nhập giờ bắt đầu"),
    end_time: z.string().min(1, "Nhập giờ kết thúc"),
    role_tag: z.enum(["bar", "kitchen", "service", "all"]),
    is_marketplace: z.boolean(),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: "Giờ kết thúc phải sau giờ bắt đầu",
    path: ["end_time"],
  });

type ShiftForm = z.infer<typeof shiftSchema>;

type Profile = {
  id: string;
  full_name: string;
};

type NewShiftModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  locationId: string;
  defaultDate: string;
};

const ROLE_OPTIONS = [
  { value: "kitchen", label: "🍳 Bếp" },
  { value: "service", label: "🍜 Service" },
  { value: "bar", label: "🍶 Bar" },
  { value: "all", label: "⭐ Tất cả" },
];

export default function NewShiftModal({
  open,
  onClose,
  onCreated,
  locationId,
  defaultDate,
}: NewShiftModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShiftForm>({
    defaultValues: {
      profile_id: "",
      date: defaultDate,
      start_time: "",
      end_time: "",
      role_tag: "service",
      is_marketplace: false,
    },
  });

  // Cập nhật date khi defaultDate thay đổi
  useEffect(() => {
    reset((prev) => ({ ...prev, date: defaultDate }));
  }, [defaultDate, reset]);

  // Lấy danh sách nhân viên của location
  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("location_id", locationId)
      .in("role", ["staff", "azubi"])
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => {
        setProfiles(data ?? []);
      });
  }, [open, locationId]);

  async function onSubmit(data: ShiftForm) {
    setSubmitting(true);
    setError("");
    try {
      const supabase = createClient();

      // Tạo timestamp từ date + time
      const startISO = new Date(
        `${data.date}T${data.start_time}:00`,
      ).toISOString();
      const endISO = new Date(`${data.date}T${data.end_time}:00`).toISOString();

      // Kiểm tra ca trùng
      const { data: existing } = await supabase
        .from("shifts")
        .select("id")
        .eq("profile_id", data.profile_id)
        .neq("status", "cancelled")
        .gte("start_time", new Date(`${data.date}T00:00:00`).toISOString())
        .lte("start_time", new Date(`${data.date}T23:59:59`).toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        setError("Nhân viên đã có ca trong ngày này");
        setSubmitting(false);
        return;
      }

      const { error: insertErr } = await supabase.from("shifts").insert({
        profile_id: data.is_marketplace ? null : data.profile_id,
        location_id: locationId,
        start_time: startISO,
        end_time: endISO,
        role_tag: data.role_tag,
        status: data.is_marketplace ? "open" : "scheduled",
        is_marketplace: data.is_marketplace,
      });

      if (insertErr) throw insertErr;

      reset();
      onCreated();
      onClose();
    } catch {
      setError("Không thể tạo ca. Thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-8"
        style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2
            style={{
              fontFamily: "Sora, sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: "#1a1a1a",
            }}
          >
            Thêm ca mới
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100"
          >
            <X size={18} strokeWidth={2} color="#999" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nhân viên */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Nhân viên
            </label>
            <select
              {...register("profile_id")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{ ["--tw-ring-color" as string]: "var(--brand-color)" }}
            >
              <option value="">Chọn nhân viên...</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
            {errors.profile_id && (
              <p className="text-xs text-red-500 mt-1">
                {errors.profile_id.message}
              </p>
            )}
          </div>

          {/* Ngày */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Ngày
            </label>
            <input
              type="date"
              {...register("date")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
            />
          </div>

          {/* Giờ bắt đầu / kết thúc */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                Bắt đầu
              </label>
              <input
                type="time"
                {...register("start_time")}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              />
              {errors.start_time && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.start_time.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                Kết thúc
              </label>
              <input
                type="time"
                {...register("end_time")}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              />
              {errors.end_time && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.end_time.message}
                </p>
              )}
            </div>
          </div>

          {/* Khu vực */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Khu vực
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 py-2.5 cursor-pointer has-[:checked]:border-2 transition-all"
                  style={{
                    ["--tw-border-opacity" as string]: "1",
                  }}
                >
                  <input
                    type="radio"
                    value={opt.value}
                    {...register("role_tag")}
                    className="sr-only"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Cần người toggle */}
          <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-3 cursor-pointer">
            <input
              type="checkbox"
              {...register("is_marketplace")}
              className="h-4 w-4 rounded accent-current"
              style={{ accentColor: "var(--brand-color)" }}
            />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Đăng tìm người
              </p>
              <p className="text-xs text-gray-400">
                Ca sẽ hiện trên Marketplace
              </p>
            </div>
          </label>

          {/* Error */}
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50"
            style={{ background: "var(--brand-color)" }}
          >
            {submitting ? "Đang tạo..." : "Tạo ca"}
          </button>
        </form>
      </div>
    </div>
  );
}
