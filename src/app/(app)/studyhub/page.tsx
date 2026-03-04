"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

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
  created_at: string;
};

type Lesson = {
  id: string;
  course_id: string;
  duration_minutes: number | null;
};

type Enrollment = {
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

const FILTER_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "onboarding", label: "Onboarding" },
  { key: "safety", label: "An toàn" },
  { key: "service", label: "Service" },
  { key: "kitchen", label: "Bếp" },
  { key: "bar", label: "Bar" },
];

/* ══════════════════════════════════════════════════
   StudyhubPage
   ══════════════════════════════════════════════════ */
export default function StudyhubPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
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

  /* ── Tính progress cho 1 course ──────────────── */
  function getCourseProgress(courseId: string): number {
    const courseLessons = lessons.filter((l) => l.course_id === courseId);
    if (courseLessons.length === 0) return 0;
    const completedCount = courseLessons.filter((l) =>
      progress.some((p) => p.lesson_id === l.id && p.is_completed),
    ).length;
    return Math.round((completedCount / courseLessons.length) * 100);
  }

  /* ── Tổng thời lượng 1 course ────────────────── */
  function getCourseDuration(courseId: string): number {
    return lessons
      .filter((l) => l.course_id === courseId)
      .reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0);
  }

  /* ── Số bài trong 1 course ───────────────────── */
  function getLessonCount(courseId: string): number {
    return lessons.filter((l) => l.course_id === courseId).length;
  }

  /* ── Fetch tất cả data ───────────────────────── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);

      // Lấy user + profile
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, location_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      setUserId(user.id);
      setUserRole(profile.role);

      // Fetch courses (published, matching location hoặc global)
      const { data: coursesData, error: coursesErr } = await supabase
        .from("courses")
        .select("*")
        .not("published_at", "is", null)
        .or(`location_id.eq.${profile.location_id},location_id.is.null`)
        .order("created_at", { ascending: false });

      if (coursesErr) throw coursesErr;

      // Fetch lessons (cho tất cả courses)
      const courseIds = (coursesData ?? []).map((c: Course) => c.id);
      let lessonsData: Lesson[] = [];
      if (courseIds.length > 0) {
        const { data: l, error: lErr } = await supabase
          .from("lessons")
          .select("id, course_id, duration_minutes")
          .in("course_id", courseIds);
        if (lErr) throw lErr;
        lessonsData = l ?? [];
      }

      // Fetch enrollments của user
      const { data: enrollData, error: eErr } = await supabase
        .from("course_enrollments")
        .select("course_id, enrolled_at, completed_at")
        .eq("profile_id", user.id);
      if (eErr) throw eErr;

      // Fetch lesson progress của user
      const { data: progressData, error: pErr } = await supabase
        .from("lesson_progress")
        .select("lesson_id, is_completed")
        .eq("profile_id", user.id);
      if (pErr) throw pErr;

      setCourses(coursesData ?? []);
      setLessons(lessonsData);
      setEnrollments(enrollData ?? []);
      setProgress(progressData ?? []);
    } catch {
      setError(true);
      flash("Không thể tải danh sách khóa học", "err");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchData();
  }, [fetchData]);

  /* ── Derived data ────────────────────────────── */
  const enrolledCourseIds = new Set(enrollments.map((e) => e.course_id));

  // Khóa bắt buộc chưa enroll hoặc enroll chưa xong
  const requiredMissing = courses.filter(
    (c) =>
      c.is_required &&
      (!enrolledCourseIds.has(c.id) ||
        enrollments.find(
          (e) => e.course_id === c.id && e.completed_at === null,
        )),
  );

  // Đang học (enrolled, chưa completed)
  const inProgress = courses.filter(
    (c) =>
      enrolledCourseIds.has(c.id) &&
      enrollments.some((e) => e.course_id === c.id && e.completed_at === null),
  );

  // Khóa mới (chưa enroll, published trong 30 ngày)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newCourses = courses.filter(
    (c) =>
      !enrolledCourseIds.has(c.id) && new Date(c.published_at) >= thirtyDaysAgo,
  );

  // Filter tất cả khóa theo category
  const filteredCourses =
    activeFilter === "all"
      ? courses
      : courses.filter((c) => c.category === activeFilter);

  const isManager = userRole === "manager" || userRole === "owner";

  /* ── Loading skeleton ────────────────────────── */
  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 animate-pulse rounded-lg bg-foreground/10" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-foreground/10" />
        </div>

        {/* 3 card skeletons */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex gap-3 rounded-2xl border border-border bg-background p-3 animate-pulse"
          >
            <div className="h-20 w-20 shrink-0 rounded-xl bg-foreground/10" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-3/4 rounded bg-foreground/10" />
              <div className="h-3 w-1/2 rounded bg-foreground/10" />
              <div className="h-2 w-full rounded-full bg-foreground/10" />
            </div>
          </div>
        ))}

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-background p-3 animate-pulse space-y-2"
            >
              <div className="h-24 w-full rounded-xl bg-foreground/10" />
              <div className="h-4 w-3/4 rounded bg-foreground/10" />
              <div className="h-3 w-1/2 rounded bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Empty state ─────────────────────────────── */
  if (!error && courses.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        <Header isManager={isManager} />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-muted-foreground text-sm">
            Chưa có khóa học nào. Quay lại sau!
          </p>
        </div>
      </div>
    );
  }

  /* ── Main render ─────────────────────────────── */
  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-6">
      <Header isManager={isManager} />

      {/* ── 1. Banner cảnh báo ── */}
      {requiredMissing.length > 0 && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <svg
                className="h-5 w-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">
                {requiredMissing.length} khóa học bắt buộc
              </p>
              <p className="text-xs text-red-600">chưa hoàn thành</p>
            </div>
          </div>
          <a
            href="#required"
            className="shrink-0 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white active:bg-red-700"
          >
            Xem ngay
          </a>
        </div>
      )}

      {/* ── 2. Đang học ── */}
      {inProgress.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Đang học
          </h2>
          <div className="space-y-2">
            {inProgress.map((course) => {
              const pct = getCourseProgress(course.id);
              return (
                <Link
                  key={course.id}
                  href={`/studyhub/${course.id}`}
                  className="flex gap-3 rounded-2xl border border-border bg-background p-3 active:bg-foreground/5 transition-colors"
                >
                  {/* Thumbnail */}
                  <div
                    className="h-20 w-20 shrink-0 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
                    style={{
                      backgroundColor:
                        CATEGORY_COLORS[course.category] ??
                        "var(--brand-color)",
                    }}
                  >
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt=""
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      course.title.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {course.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getLessonCount(course.id)} bài ·{" "}
                      {getCourseDuration(course.id)} phút
                    </p>

                    {/* Progress bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: "var(--brand-color)",
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground shrink-0">
                        {pct}%
                      </span>
                    </div>

                    <p
                      className="text-xs font-medium mt-1.5"
                      style={{ color: "var(--brand-color)" }}
                    >
                      Tiếp tục học →
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 3. Khóa học mới ── */}
      {newCourses.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Khóa học mới
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {newCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                lessonCount={getLessonCount(course.id)}
                duration={getCourseDuration(course.id)}
                isManager={false}
                enrollmentCount={0}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 4. Tất cả khóa học ── */}
      <section className="space-y-3" id="required">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tất cả khóa học
        </h2>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === tab.key
                  ? "text-white"
                  : "bg-foreground/5 text-muted-foreground active:bg-foreground/10"
              }`}
              style={
                activeFilter === tab.key
                  ? { backgroundColor: "var(--brand-color)" }
                  : undefined
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filteredCourses.length === 0 ? (
          <div className="rounded-2xl border border-border bg-background px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Không có khóa học nào trong danh mục này
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                lessonCount={getLessonCount(course.id)}
                duration={getCourseDuration(course.id)}
                progress={
                  enrolledCourseIds.has(course.id)
                    ? getCourseProgress(course.id)
                    : undefined
                }
                isManager={isManager}
                enrollmentCount={0}
                isRequired={course.is_required}
                isEnrolled={enrolledCourseIds.has(course.id)}
                isCompleted={
                  enrollments.find((e) => e.course_id === course.id)
                    ?.completed_at !== undefined &&
                  enrollments.find((e) => e.course_id === course.id)
                    ?.completed_at !== null
                }
              />
            ))}
          </div>
        )}
      </section>

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
   Header
   ══════════════════════════════════════════════════ */
function Header({ isManager }: { isManager: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">StudyHub</h1>
        <p className="text-sm text-muted-foreground">Học tập & phát triển</p>
      </div>
      {isManager && (
        <Link
          href="/studyhub/create"
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white active:opacity-80 transition-opacity"
          style={{ backgroundColor: "var(--brand-color)" }}
        >
          <svg
            className="h-4 w-4"
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
          Tạo mới
        </Link>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   CourseCard — card nhỏ trong grid
   ══════════════════════════════════════════════════ */
function CourseCard({
  course,
  lessonCount,
  duration,
  progress,
  isManager,
  enrollmentCount,
  isRequired,
  isEnrolled,
  isCompleted,
}: {
  course: Course;
  lessonCount: number;
  duration: number;
  progress?: number;
  isManager: boolean;
  enrollmentCount: number;
  isRequired?: boolean;
  isEnrolled?: boolean;
  isCompleted?: boolean;
}) {
  return (
    <Link
      href={`/studyhub/${course.id}`}
      className="rounded-2xl border border-border bg-background overflow-hidden active:bg-foreground/5 transition-colors"
    >
      {/* Thumbnail */}
      <div
        className="h-24 w-full flex items-center justify-center text-white text-3xl font-bold relative"
        style={{
          backgroundColor:
            CATEGORY_COLORS[course.category] ?? "var(--brand-color)",
        }}
      >
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          course.title.charAt(0).toUpperCase()
        )}

        {/* Badge bắt buộc */}
        {isRequired && (
          <span className="absolute top-2 left-2 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            Bắt buộc
          </span>
        )}

        {/* Badge hoàn thành */}
        {isCompleted && (
          <span className="absolute top-2 right-2 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            ✓ Xong
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        {/* Category badge */}
        <span
          className="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white"
          style={{
            backgroundColor:
              CATEGORY_COLORS[course.category] ?? "var(--brand-color)",
          }}
        >
          {CATEGORY_LABELS[course.category] ?? course.category}
        </span>

        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
          {course.title}
        </p>

        <p className="text-xs text-muted-foreground">
          {lessonCount} bài · {duration} phút ·{" "}
          {DIFFICULTY_LABELS[course.difficulty] ?? course.difficulty}
        </p>

        {/* Progress bar nếu đã enroll */}
        {isEnrolled && progress !== undefined && (
          <div className="flex items-center gap-2 pt-0.5">
            <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  backgroundColor: "var(--brand-color)",
                }}
              />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">
              {progress}%
            </span>
          </div>
        )}

        {/* Manager: badge nhân viên hoàn thành */}
        {isManager && (
          <p className="text-[10px] text-muted-foreground">
            {enrollmentCount} hoàn thành
          </p>
        )}
      </div>
    </Link>
  );
}
