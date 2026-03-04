"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/* ── Types ─────────────────────────────────────── */
type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  difficulty: string;
  is_required: boolean;
  location_id: string | null;
  published_at: string;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  content_type: string;
  duration_minutes: number | null;
  order_index: number;
};

type Enrollment = {
  id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
};

type LessonProgress = {
  lesson_id: string;
  is_completed: boolean;
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

const CATEGORY_COLORS: Record<string, string> = {
  onboarding: "#2D6A4F",
  safety: "#C62828",
  service: "#1565C0",
  kitchen: "#E65100",
  bar: "#6A1B9A",
  other: "#546E7A",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung bình",
  advanced: "Nâng cao",
};

const TYPE_ICONS: Record<string, string> = {
  video: "🎬",
  text: "📝",
  quiz: "❓",
};

/* ══════════════════════════════════════════════════
   CourseDetailPage
   ══════════════════════════════════════════════════ */
export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState(false);
  const [userId, setUserId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);

  const initRef = useRef(false);

  /* ── helpers ─────────────────────────────────── */
  function flash(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* ── Fetch data ──────────────────────────────── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setUserId(user.id);
      setUserRole(profile?.role ?? "staff");

      // Fetch course
      const { data: courseData, error: cErr } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (cErr || !courseData) {
        setError(true);
        flash("Không tìm thấy khóa học", "err");
        return;
      }
      setCourse(courseData);

      // Fetch lessons (theo thứ tự)
      const { data: lessonsData, error: lErr } = await supabase
        .from("lessons")
        .select(
          "id, course_id, title, content_type, duration_minutes, order_index",
        )
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (lErr) throw lErr;
      setLessons(lessonsData ?? []);

      // Fetch enrollment của user
      const { data: enrollData } = await supabase
        .from("course_enrollments")
        .select("id, course_id, enrolled_at, completed_at")
        .eq("course_id", courseId)
        .eq("profile_id", user.id)
        .maybeSingle();

      setEnrollment(enrollData);

      // Fetch lesson progress của user cho course này
      const lessonIds = (lessonsData ?? []).map((l) => l.id);
      if (lessonIds.length > 0) {
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("lesson_id, is_completed")
          .eq("profile_id", user.id)
          .in("lesson_id", lessonIds);

        setProgress(progressData ?? []);
      }
    } catch {
      setError(true);
      flash("Không thể tải khóa học", "err");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchData();
  }, [fetchData]);

  /* ── Derived ─────────────────────────────────── */
  const completedSet = new Set(
    progress.filter((p) => p.is_completed).map((p) => p.lesson_id),
  );
  const completedCount = completedSet.size;
  const totalLessons = lessons.length;
  const pct =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const totalDuration = lessons.reduce(
    (s, l) => s + (l.duration_minutes ?? 0),
    0,
  );
  const isManager = userRole === "manager" || userRole === "owner";
  const isEnrolled = !!enrollment;
  const isCompleted = !!enrollment?.completed_at;

  /* ── Kiểm tra bài học nào đã mở khóa ────────── */
  function isUnlocked(index: number): boolean {
    // Manager/Owner xem tất cả
    if (isManager) return true;
    // Bài 1 luôn mở
    if (index === 0) return true;
    // Bài N mở nếu bài N-1 đã completed
    const prevLesson = lessons[index - 1];
    return prevLesson ? completedSet.has(prevLesson.id) : false;
  }

  /* ── Tìm bài tiếp theo cần học ───────────────── */
  function getNextLessonId(): string | null {
    for (const lesson of lessons) {
      if (!completedSet.has(lesson.id)) return lesson.id;
    }
    // Tất cả đã xong → bài đầu tiên (ôn lại)
    return lessons.length > 0 ? lessons[0].id : null;
  }

  /* ── Enroll + navigate ───────────────────────── */
  async function handleEnroll() {
    if (!userId || lessons.length === 0) return;
    setEnrolling(true);
    try {
      const { error: eErr } = await supabase
        .from("course_enrollments")
        .insert({ course_id: courseId, profile_id: userId });

      if (eErr) throw eErr;

      // Navigate thẳng bài 1
      router.push(`/studyhub/${courseId}/lessons/${lessons[0].id}`);
    } catch {
      flash("Không thể đăng ký khóa học", "err");
      setEnrolling(false);
    }
  }

  /* ── Loading skeleton ────────────────────────── */
  if (loading) {
    return (
      <div className="mx-auto max-w-md">
        {/* Header skeleton */}
        <div className="h-48 w-full animate-pulse bg-foreground/10" />
        <div className="px-4 py-6 space-y-4">
          <div className="h-6 w-3/4 rounded bg-foreground/10 animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-5 w-16 rounded-full bg-foreground/10 animate-pulse"
              />
            ))}
          </div>
          <div className="h-10 w-full rounded-xl bg-foreground/10 animate-pulse" />
          {/* List skeleton */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-foreground/10" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 rounded bg-foreground/10" />
                <div className="h-3 w-1/3 rounded bg-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Error / not found ───────────────────────── */
  if (error || !course) {
    return (
      <div className="mx-auto max-w-md px-4 py-6 space-y-4">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-sm text-muted-foreground mb-4">
            Không tìm thấy khóa học
          </p>
          <Link
            href="/studyhub"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--brand-color)" }}
          >
            ← Quay lại
          </Link>
        </div>
      </div>
    );
  }

  const bgColor = CATEGORY_COLORS[course.category] ?? "var(--brand-color)";

  /* ── Main render ─────────────────────────────── */
  return (
    <div className="mx-auto max-w-md pb-28">
      {/* ── Header / Thumbnail ── */}
      <div
        className="relative h-48 w-full flex items-end"
        style={{ backgroundColor: bgColor }}
      >
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/20 text-8xl font-bold">
            {course.title.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Nút quay lại */}
        <Link
          href="/studyhub"
          className="absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm active:bg-black/50"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
        </Link>

        {/* Badge bắt buộc */}
        {course.is_required && (
          <span className="absolute top-4 right-4 rounded-md bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
            Bắt buộc
          </span>
        )}

        {/* Title overlay */}
        <div className="relative z-10 px-4 pb-4">
          <h1 className="text-xl font-bold text-white leading-tight">
            {course.title}
          </h1>
        </div>
      </div>

      {/* ── Info section ── */}
      <div className="px-4 py-4 space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: bgColor }}
          >
            {CATEGORY_LABELS[course.category] ?? course.category}
          </span>
          <span className="rounded-md bg-foreground/5 px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {DIFFICULTY_LABELS[course.difficulty] ?? course.difficulty}
          </span>
          <span className="rounded-md bg-foreground/5 px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {totalLessons} bài
          </span>
          {totalDuration > 0 && (
            <span className="rounded-md bg-foreground/5 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              ~{totalDuration} phút
            </span>
          )}
        </div>

        {/* Description */}
        {course.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {course.description}
          </p>
        )}

        {/* Progress bar (nếu đã enroll) */}
        {isEnrolled && totalLessons > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Tiến độ: {completedCount}/{totalLessons} bài
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--brand-color)" }}
              >
                {pct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: "var(--brand-color)",
                }}
              />
            </div>
          </div>
        )}

        {/* ── Action button ── */}
        {totalLessons === 0 ? (
          <div className="rounded-2xl border border-border bg-background px-4 py-6 text-center">
            <div className="text-3xl mb-2">🚧</div>
            <p className="text-sm text-muted-foreground">
              Khóa học đang được chuẩn bị
            </p>
          </div>
        ) : !isEnrolled ? (
          /* Chưa enroll → Bắt đầu học */
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-color)" }}
          >
            {enrolling ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="opacity-25"
                  />
                  <path
                    d="M4 12a8 8 0 018-8"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="opacity-75"
                  />
                </svg>
                Đang đăng ký…
              </span>
            ) : (
              "Bắt đầu học"
            )}
          </button>
        ) : isCompleted ? (
          /* Đã hoàn thành → Ôn lại */
          <Link
            href={`/studyhub/${courseId}/lessons/${lessons[0].id}`}
            className="flex w-full items-center justify-center rounded-xl border-2 py-3 text-sm font-semibold transition-opacity active:opacity-80"
            style={{
              borderColor: "var(--brand-color)",
              color: "var(--brand-color)",
            }}
          >
            ✅ Hoàn thành — Ôn lại
          </Link>
        ) : (
          /* Đang học → Tiếp tục */
          <Link
            href={`/studyhub/${courseId}/lessons/${getNextLessonId()}`}
            className="flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white transition-opacity active:opacity-80"
            style={{ backgroundColor: "var(--brand-color)" }}
          >
            Tiếp tục học →
          </Link>
        )}
      </div>

      {/* ── Lesson list ── */}
      {totalLessons > 0 && (
        <div className="px-4 pb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Nội dung khóa học
          </h2>

          <div className="space-y-1">
            {lessons.map((lesson, index) => {
              const done = completedSet.has(lesson.id);
              const unlocked = isUnlocked(index);
              const canNavigate = (isEnrolled || isManager) && unlocked;

              return (
                <div key={lesson.id}>
                  {canNavigate ? (
                    <Link
                      href={`/studyhub/${courseId}/lessons/${lesson.id}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 active:bg-foreground/5 transition-colors"
                    >
                      <LessonRow
                        lesson={lesson}
                        index={index}
                        done={done}
                        unlocked={unlocked}
                      />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl px-3 py-3 opacity-50">
                      <LessonRow
                        lesson={lesson}
                        index={index}
                        done={done}
                        unlocked={unlocked}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2.5 text-xs font-medium text-white shadow-lg transition-all ${
            toast.type === "ok" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   LessonRow — nội dung 1 dòng bài học
   ══════════════════════════════════════════════════ */
function LessonRow({
  lesson,
  index,
  done,
  unlocked,
}: {
  lesson: Lesson;
  index: number;
  done: boolean;
  unlocked: boolean;
}) {
  return (
    <>
      {/* Số thứ tự / trạng thái */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
          done
            ? "bg-emerald-100 text-emerald-600"
            : unlocked
              ? "bg-foreground/5 text-foreground"
              : "bg-foreground/5 text-muted-foreground"
        }`}
      >
        {done ? "✅" : !unlocked ? "🔒" : index + 1}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {TYPE_ICONS[lesson.content_type] ?? "📄"} {lesson.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {lesson.content_type === "video"
            ? "Video"
            : lesson.content_type === "quiz"
              ? "Quiz"
              : "Bài đọc"}
          {lesson.duration_minutes ? ` · ${lesson.duration_minutes} phút` : ""}
        </p>
      </div>

      {/* Chevron */}
      {unlocked && (
        <svg
          className="h-4 w-4 shrink-0 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.25 4.5 7.5 7.5-7.5 7.5"
          />
        </svg>
      )}
    </>
  );
}
