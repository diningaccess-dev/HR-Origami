"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, differenceInDays } from "date-fns";

// ── Constants ────────────────────────────────────────────────
const DOCUMENT_EXPIRY_WARNING_DAYS = 30;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const TYPE_LABELS: Record<string, string> = {
  contract: "Hợp đồng",
  rote_karte: "Rote Karte",
  gesundheitszeugnis: "Gesundheitszeugnis",
  au: "AU Bescheinigung",
  other: "Khác",
};

const TYPE_ICONS: Record<string, string> = {
  contract: "📄",
  rote_karte: "🔴",
  gesundheitszeugnis: "🏥",
  au: "🩺",
  other: "📎",
};

// ── Types ────────────────────────────────────────────────────
type Document = {
  id: string;
  profile_id: string;
  type: string;
  file_url: string | null;
  issued_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  // Join cho manager view
  owner_name?: string;
};

type Profile = {
  id: string;
  full_name: string;
  role: string;
  location_id: string;
};

// ── Component ────────────────────────────────────────────────
export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Upload form state
  const [uploadType, setUploadType] = useState("contract");
  const [uploadIssuedAt, setUploadIssuedAt] = useState("");
  const [uploadExpiresAt, setUploadExpiresAt] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useRef(createClient());

  const isManager = profile?.role === "manager" || profile?.role === "owner";
  const brandColor = "var(--brand-color)";

  // ── Toast tự ẩn ────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Load profile + documents ───────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const sb = supabase.current;

    // Lấy user hiện tại
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;

    // Lấy profile
    const { data: prof } = await sb
      .from("profiles")
      .select("id, full_name, role, location_id")
      .eq("id", user.id)
      .single();

    if (!prof) {
      setIsLoading(false);
      return;
    }
    setProfile(prof);

    const isManagerRole = prof.role === "manager" || prof.role === "owner";

    if (isManagerRole) {
      // Manager: lấy tất cả documents trong location
      // Trước tiên lấy danh sách profile_id trong cùng location
      const { data: locationProfiles } = await sb
        .from("profiles")
        .select("id, full_name")
        .eq("location_id", prof.location_id);

      const profileMap = new Map(
        (locationProfiles ?? []).map((p: { id: string; full_name: string }) => [
          p.id,
          p.full_name,
        ]),
      );
      const profileIds = Array.from(profileMap.keys());

      if (profileIds.length > 0) {
        const { data: docs } = await sb
          .from("documents")
          .select("*")
          .in("profile_id", profileIds)
          .order("created_at", { ascending: false });

        setDocuments(
          (docs ?? []).map((d: Record<string, unknown>) => ({
            ...(d as Document),
            owner_name: profileMap.get(d.profile_id as string) ?? "Unknown",
          })),
        );
      }
    } else {
      // Staff: chỉ xem document của mình
      const { data: docs } = await sb
        .from("documents")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false });

      setDocuments(
        (docs ?? []).map((d: Record<string, unknown>) => ({
          ...(d as Document),
          owner_name: prof.full_name,
        })),
      );
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Xử lý chọn file ───────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setToast("File quá lớn. Tối đa 10MB.");
      e.target.value = "";
      return;
    }

    setUploadFile(file);
  }

  // ── Upload document ────────────────────────────────────────
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !profile || isUploading) return;

    setIsUploading(true);
    const sb = supabase.current;

    try {
      // Lấy user id
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error("Chưa đăng nhập");

      // Upload file lên Supabase Storage
      const fileExt = uploadFile.name.split(".").pop() ?? "pdf";
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await sb.storage
        .from("documents")
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Lấy public URL
      const {
        data: { publicUrl },
      } = sb.storage.from("documents").getPublicUrl(filePath);

      // Ghi vào bảng documents
      const { error: insertError } = await sb.from("documents").insert({
        profile_id: user.id,
        type: uploadType,
        file_url: publicUrl,
        issued_at: uploadIssuedAt || null,
        expires_at: uploadExpiresAt || null,
        notes: uploadNotes || null,
      });

      if (insertError) throw insertError;

      // Reset form + reload
      setShowUploadForm(false);
      setUploadFile(null);
      setUploadType("contract");
      setUploadIssuedAt("");
      setUploadExpiresAt("");
      setUploadNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      setToast("Đã tải lên thành công ✓");
      await loadData();
    } catch (err) {
      console.error("Upload error:", err);
      setToast("Không thể tải lên. Thử lại sau.");
    } finally {
      setIsUploading(false);
    }
  }

  // ── Tính trạng thái hết hạn ────────────────────────────────
  function getExpiryStatus(expiresAt: string | null): {
    label: string;
    color: string;
    bgColor: string;
  } | null {
    if (!expiresAt) return null;

    const daysLeft = differenceInDays(new Date(expiresAt), new Date());

    if (daysLeft < 0) {
      return {
        label: "Hết hạn",
        color: "text-red-700 dark:text-red-300",
        bgColor: "bg-red-100 dark:bg-red-950/40",
      };
    }

    if (daysLeft <= DOCUMENT_EXPIRY_WARNING_DAYS) {
      return {
        label: `Còn ${daysLeft} ngày`,
        color: "text-amber-700 dark:text-amber-300",
        bgColor: "bg-amber-100 dark:bg-amber-950/40",
      };
    }

    return {
      label: "Còn hạn",
      color: "text-emerald-700 dark:text-emerald-300",
      bgColor: "bg-emerald-100 dark:bg-emerald-950/40",
    };
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-md px-4 py-6">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Giấy tờ</h1>
          <p className="text-xs text-foreground/50">
            {isManager ? "Tất cả nhân viên" : "Giấy tờ cá nhân"}
          </p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform active:scale-95"
          style={{ backgroundColor: brandColor }}
          aria-label="Thêm giấy tờ"
        >
          <svg
            className={`h-5 w-5 transition-transform ${showUploadForm ? "rotate-45" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </button>
      </div>

      {/* ── Toast ──────────────────────────────────────────── */}
      {toast && (
        <div className="mb-4 rounded-xl border border-foreground/10 bg-foreground/[0.04] px-4 py-3 text-center text-sm text-foreground">
          {toast}
        </div>
      )}

      {/* ── Upload Form ───────────────────────────────────── */}
      {showUploadForm && (
        <form
          onSubmit={handleUpload}
          className="mb-5 space-y-3 rounded-2xl border border-foreground/10 bg-background p-4"
        >
          <p className="text-sm font-semibold text-foreground">
            Tải lên giấy tờ mới
          </p>

          {/* Loại giấy tờ */}
          <div>
            <label className="mb-1 block text-xs text-foreground/50">
              Loại giấy tờ
            </label>
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              className="w-full rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-sm text-foreground focus:outline-none"
            >
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Ngày cấp + Ngày hết hạn */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-foreground/50">
                Ngày cấp
              </label>
              <input
                type="date"
                value={uploadIssuedAt}
                onChange={(e) => setUploadIssuedAt(e.target.value)}
                className="w-full rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-sm text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground/50">
                Hết hạn
              </label>
              <input
                type="date"
                value={uploadExpiresAt}
                onChange={(e) => setUploadExpiresAt(e.target.value)}
                className="w-full rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-sm text-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="mb-1 block text-xs text-foreground/50">
              Ghi chú
            </label>
            <input
              type="text"
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              placeholder="Tùy chọn"
              className="w-full rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none"
            />
          </div>

          {/* File input */}
          <div>
            <label className="mb-1 block text-xs text-foreground/50">
              File (PDF hoặc ảnh, tối đa 10MB)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileChange}
              className="w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground/70"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!uploadFile || isUploading}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: brandColor }}
          >
            {isUploading ? "Đang tải lên..." : "Tải lên"}
          </button>
        </form>
      )}

      {/* ── Loading skeleton ──────────────────────────────── */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-foreground/10 p-4"
            >
              <div className="h-10 w-10 animate-pulse rounded-xl bg-foreground/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-24 animate-pulse rounded bg-foreground/10" />
                <div className="h-3 w-32 animate-pulse rounded bg-foreground/10" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-foreground/10" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────── */}
      {!isLoading && documents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
            style={{ backgroundColor: brandColor }}
          >
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">
            {isManager
              ? "Chưa có nhân viên nào upload giấy tờ."
              : "Chưa có giấy tờ nào."}
          </p>
          {!isManager && (
            <p className="mt-1 text-xs text-foreground/50">
              Nhấn + để thêm giấy tờ mới
            </p>
          )}
        </div>
      )}

      {/* ── Document list ─────────────────────────────────── */}
      {!isLoading && documents.length > 0 && (
        <div className="space-y-2.5">
          {documents.map((doc) => {
            const status = getExpiryStatus(doc.expires_at);
            const typeLabel = TYPE_LABELS[doc.type] ?? doc.type;
            const typeIcon = TYPE_ICONS[doc.type] ?? "📎";

            return (
              <a
                key={doc.id}
                href={doc.file_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-background px-4 py-3.5 transition-colors active:bg-foreground/[0.03]"
              >
                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.06] text-lg">
                  {typeIcon}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {typeLabel}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-foreground/50">
                    {isManager && doc.owner_name && (
                      <>
                        <span>{doc.owner_name}</span>
                        <span>·</span>
                      </>
                    )}
                    {doc.expires_at && (
                      <span>
                        HH: {format(new Date(doc.expires_at), "dd.MM.yyyy")}
                      </span>
                    )}
                    {!doc.expires_at && doc.issued_at && (
                      <span>
                        Cấp: {format(new Date(doc.issued_at), "dd.MM.yyyy")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Badge trạng thái */}
                {status && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${status.color} ${status.bgColor}`}
                  >
                    {status.label}
                  </span>
                )}

                {/* Arrow */}
                <svg
                  className="h-4 w-4 shrink-0 text-foreground/20"
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
            );
          })}
        </div>
      )}
    </div>
  );
}
