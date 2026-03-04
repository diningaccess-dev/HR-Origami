"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/* ── Types ─────────────────────────────────────── */
type Course = {
  id: string;
  title: string;
  category: string;
  published_at: string | null;
  location_id: string | null;
  created_at: string;
};



/* ── Constants ─────────────────────────────────── */
const CATEGORY_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  safety: "An toàn",
  service: "Service",
  kitchen: "Bếp",
  bar: "Bar",
  other: "Khác",
};

/* ══════════════════════════════════════════════════
   CourseManagePage — Danh sách quản lý khóa học
   ══════════════════════════════════════════════════ */
export default function CourseManagePage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessonCounts, setLessonCounts] = useState<Record<string, number>>({});
  const [enrollCounts, setEnrollCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [, setLocationId] = useState("");
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);

  const initRef = useRef(false);

  function flash(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* ── Fetch ───────────────────────────────────── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, location_id")
        .eq("id", user.id)
        .single();

      if (!profile || !["manager", "owner"].includes(profile.role)) {
        router.push("/studyhub");
        return;
      }

      setLocationId(profile.location_id ?? "");

      // Courses cho location (+ global)
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, title, category, published_at, location_id, created_at")
        .or(
          `location_id.eq.${profile.location_id},location_id.is.null`,
        )
        .order("created_at", { ascending: false });

      setCourses(coursesData ?? []);

      // Lesson counts
      const cIds = (coursesData ?? []).map((c) => c.id);
      if (cIds.length > 0) {
        const { data: lessons } = await supabase
          .from("lessons")
          .select("course_id")
          .in("course_id", cIds);

        const lc: Record<string, number> = {};
        (lessons ?? []).forEach((l) => {
          lc[l.course_id] = (lc[l.course_id] ?? 0) + 1;
        });
        setLessonCounts(lc);

        // Enrollment counts
        const { data: enrolls } = await supabase
          .from("course_enrollments")
          .select("course_id")
          .in("course_id", cIds);

        const ec: Record<string, number> = {};
        (enrolls ?? []).forEach((e) => {
          ec[e.course_id] = (ec[e.course_id] ?? 0) + 1;
        });
        setEnrollCounts(ec);
      }
    } catch {
      flash("Không thể tải danh sách", "err");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchData();
  }, [fetchData]);

  /* ── Toggle publish ──────────────────────────── */
  async function togglePublish(course: Course) {
    setToggling(course.id);
    try {
      const newVal = course.published_at ? null : new Date().toISOString();
      const { error } = await supabase
        .from("courses")
        .update({ published_at: newVal })
        .eq("id", course.id);
      if (error) throw error;

      setCourses((prev) =>
        prev.map((c) =>
          c.id === course.id ? { ...c, published_at: newVal } : c,
        ),
      );
      flash(newVal ? "Đã xuất bản" : "Đã chuyển về bản nháp", "ok");
    } catch {
      flash("Không thể thay đổi trạng thái", "err");
    } finally {
      setToggling(null);
    }
  }

  /* ── Delete course ───────────────────────────── */
  async function deleteCourse(id: string) {
    setDeleting(id);
    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;

      setCourses((prev) => prev.filter((c) => c.id !== id));
      flash("Đã xóa khóa học", "ok");
    } catch {
      flash("Không thể xóa khóa học", "err");
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  /* ── Loading ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-40 animate-pulse rounded-lg bg-foreground/10" />
          <div className="h-9 w-24 animate-pulse rounded-xl bg-foreground/10" />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border p-4 animate-pulse space-y-2"
          >
            <div className="h-5 w-3/4 rounded bg-foreground/10" />
            <div className="h-4 w-1/2 rounded bg-foreground/10" />
            <div className="flex gap-2 mt-2">
              <div className="h-8 w-20 rounded-lg bg-foreground/10" />
              <div className="h-8 w-20 rounded-lg bg-foreground/10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ── Main ────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Quản lý khóa học</h1>
          <p className="text-xs text-muted-foreground">{courses.length} khóa học</p>
        </div>
        <Link
          href="/studyhub/manage/new"
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white active:opacity-80"
          style={{ backgroundColor: "var(--brand-color)" }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tạo mới
        </Link>
      </div>

      {/* Empty */}
      {courses.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-sm text-muted-foreground">Chưa có khóa học nào</p>
        </div>
      )}

      {/* Course list */}
      {courses.map((course) => (
        <div
          key={course.id}
          className="rounded-2xl border border-border bg-background p-4 space-y-3"
        >
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {course.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {CATEGORY_LABELS[course.category] ?? course.category} ·{" "}
                {lessonCounts[course.id] ?? 0} bài ·{" "}
                {enrollCounts[course.id] ?? 0} đăng ký
              </p>
            </div>

            {/* Status badge */}
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                course.published_at
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {course.published_at ? "Published" : "Draft"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              href={`/studyhub/manage/${course.id}`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground active:bg-foreground/5"
            >
              ✏️ Sửa
            </Link>

            <button
              onClick={() => togglePublish(course)}
              disabled={toggling === course.id}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50 ${
                course.published_at
                  ? "bg-amber-100 text-amber-700 active:bg-amber-200"
                  : "bg-emerald-100 text-emerald-700 active:bg-emerald-200"
              }`}
            >
              {toggling === course.id
                ? "…"
                : course.published_at
                  ? "Ẩn đi"
                  : "Xuất bản"}
            </button>

            {confirmDelete === course.id ? (
              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => deleteCourse(course.id)}
                  disabled={deleting === course.id}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white active:bg-red-700 disabled:opacity-50"
                >
                  {deleting === course.id ? "…" : "Xác nhận"}
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(course.id)}
                className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 active:bg-red-50"
              >
                🗑
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2.5 text-xs font-medium text-white shadow-lg ${
            toast.type === "ok" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
