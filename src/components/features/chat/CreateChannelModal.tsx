"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";

const CHANNEL_TYPES = [
  {
    value: "location",
    label: "Toàn quán",
    emoji: "🏠",
    desc: "Tất cả nhân viên",
  },
  {
    value: "role",
    label: "Theo vị trí",
    emoji: "👨‍🍳",
    desc: "Bếp / Service / Bar",
  },
  {
    value: "announcement",
    label: "Thông báo",
    emoji: "📢",
    desc: "Tin quan trọng",
  },
];

type CreateChannelModalProps = {
  locationId: string;
};

export default function CreateChannelModal({
  locationId,
}: CreateChannelModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("location");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Nhập tên kênh");
      return;
    }

    setSaving(true);
    setError("");

    const supabase = createClient();
    const { error: insertError } = await supabase.from("channels").insert({
      name: trimmed,
      type,
      location_id: locationId,
    });

    if (insertError) {
      setError("Không thể tạo kênh. Thử lại sau.");
      console.error(insertError);
      setSaving(false);
      return;
    }

    setOpen(false);
    setName("");
    setType("location");
    setSaving(false);
    router.refresh();
  }

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center rounded-xl text-white"
        style={{
          width: 44,
          height: 44,
          background: "var(--brand-color)",
        }}
      >
        <Plus size={18} strokeWidth={2} />
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-100 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[20px] bg-white"
            style={{
              padding: "16px 16px 24px",
              paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2
                style={{
                  fontFamily: "Sora, sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#1a1a1a",
                }}
              >
                Tạo kênh mới
              </h2>
              <button onClick={() => setOpen(false)} className="text-gray-400">
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Channel name */}
            <div className="mb-3">
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#999",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Tên kênh
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Bếp Enso, Thông báo..."
                className="w-full mt-1 border-none outline-none"
                style={{
                  background: "#f4f4f4",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "#333",
                  fontFamily: "DM Sans, sans-serif",
                }}
              />
            </div>

            {/* Channel type */}
            <div className="mb-4">
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#999",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Loại kênh
              </label>
              <div className="flex flex-col gap-1.5 mt-1">
                {CHANNEL_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className="flex items-center gap-2.5 rounded-xl text-left"
                    style={{
                      padding: "10px 12px",
                      background:
                        type === t.value
                          ? "var(--brand-surface, #D8F3DC)"
                          : "#f4f4f4",
                      border:
                        type === t.value
                          ? "1.5px solid var(--brand-color)"
                          : "1.5px solid transparent",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{t.emoji}</span>
                    <div>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color:
                            type === t.value ? "var(--brand-color)" : "#333",
                        }}
                      >
                        {t.label}
                      </p>
                      <p style={{ fontSize: 10, color: "#aaa" }}>{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="mb-2" style={{ fontSize: 11, color: "#ef4444" }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="w-full rounded-[14px] text-white py-3 disabled:opacity-40"
              style={{
                background: "var(--brand-color)",
                fontFamily: "Sora, sans-serif",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {saving ? "Đang tạo..." : "Tạo kênh"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
