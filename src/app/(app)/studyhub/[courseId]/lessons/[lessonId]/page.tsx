"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import VideoPlayer from "@/components/features/studyhub/VideoPlayer";
import QuizPlayer from "@/components/features/studyhub/QuizPlayer";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/* ── Types ─────────────────────────────────────── */
type Lesson = {
  id: string;
  course_id: string;
  title: string;
  content_type: string;
  content_url: string | null;
  content_body: string | null;
  order_index: number;
  duration_minutes: number | null;
};

type Course = { id: string; title: string };

type QuizQuestion = {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  correct_option_id: string;
  explanation: string | null;
  order_index: number;
};

type ProgressRow = {
  id: string;
  is_completed: boolean;
  attempts: number;
  quiz_score: number | null;
};

/* ── Markdown đơn giản → HTML ──────────────────── */
function simpleMarkdown(md: string): string {
  const html = md
    // Escape HTML trước
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-2">$1</h1>')
    // Bold & italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`(.+?)`/g, '<code class="bg-foreground/5 px-1 py-0.5 rounded text-sm">$1</code>')
    // Unordered list
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '<br class="my-2" />')
    .replace(/\n/g, "<br />");
  return html;
}

/* ══════════════════════════════════════════════════
   LessonPlayerPage
   ══════════════════════════════════════════════════ */
export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [progressRow, setProgressRow] = useState<ProgressRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userId, setUserId] = useState("");
  const [, setUserRole] = useState("");
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);

  const initRef = useRef(false);

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

      // Course info
      const { data: courseData } = await supabase
        .from("courses")
        .select("id, title")
        .eq("id", courseId)
        .single();
      setCourse(courseData);

      // Tất cả lessons của course (để navigation)
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("id, course_id, title, content_type, content_url, content_body, order_index, duration_minutes")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      setAllLessons(lessonsData ?? []);
      const current = (lessonsData ?? []).find((l) => l.id === lessonId);
      setLesson(current ?? null);

      if (!current) {
        setError(true);
        return;
      }

      // Kiểm tra enrollment (trừ manager/owner)
      const isManager = profile?.role === "manager" || profile?.role === "owner";
      if (!isManager) {
        const { data: enroll } = await supabase
          .from("course_enrollments")
          .select("id")
          .eq("course_id", courseId)
          .eq("profile_id", user.id)
          .maybeSingle();

        if (!enroll) {
          // Chưa enroll → redirect về course detail
          flash("Bạn cần đăng ký khóa học trước", "err");
          router.push(`/studyhub/${courseId}`);
          return;
        }
      }

      // Quiz questions nếu lesson là quiz
      if (current.content_type === "quiz") {
        const { data: quizData } = await supabase
          .from("quizzes")
          .select("id, question, options, correct_option_id, explanation, order_index")
          .eq("lesson_id", lessonId)
          .order("order_index", { ascending: true });
        setQuizQuestions(quizData ?? []);
      }

      // Lesson progress hiện tại
      const { data: progData } = await supabase
        .from("lesson_progress")
        .select("id, is_completed, attempts, quiz_score")
        .eq("lesson_id", lessonId)
        .eq("profile_id", user.id)
        .maybeSingle();

      setProgressRow(progData);
      if (progData?.is_completed) {
        setCompleted(true);
      }
    } catch {
      setError(true);
      flash("Không thể tải bài học", "err");
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId, router]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchData();
  }, [fetchData]);

  /* ── Derived data ────────────────────────────── */
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  /* ── Hoàn thành bài học ──────────────────────── */
  async function markCompleted(quizScore?: number) {
    if (completing || !userId) return;
    setCompleting(true);
    try {
      const attempts = (progressRow?.attempts ?? 0) + 1;

      // 1. Upsert lesson_progress
      if (progressRow) {
        await supabase
          .from("lesson_progress")
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
            quiz_score: quizScore ?? progressRow.quiz_score,
            attempts,
          })
          .eq("id", progressRow.id);
      } else {
        await supabase.from("lesson_progress").insert({
          lesson_id: lessonId,
          profile_id: userId,
          is_completed: true,
          completed_at: new Date().toISOString(),
          quiz_score: quizScore ?? null,
          attempts,
        });
      }

      // 2. Tính XP
      let xp = 0;
      if (lesson?.content_type === "quiz") {
        xp = attempts === 1 ? 20 : 10;
      } else {
        xp = 10;
      }

      // Insert XP transaction
      await supabase.from("xp_transactions").insert({
        profile_id: userId,
        amount: xp,
        reason:
          lesson?.content_type === "quiz"
            ? "quiz_perfect"
            : "lesson_complete",
        reference_id: lessonId,
      });

      setXpGained(xp);

      // 3. Kiểm tra course hoàn thành
      const allIds = allLessons.map((l) => l.id);
      const { data: allProgress } = await supabase
        .from("lesson_progress")
        .select("lesson_id, is_completed")
        .eq("profile_id", userId)
        .in("lesson_id", allIds);

      const completedIds = new Set(
        (allProgress ?? [])
          .filter((p) => p.is_completed)
          .map((p) => p.lesson_id),
      );
      // Bao gồm lesson vừa mới xong
      completedIds.add(lessonId);

      if (completedIds.size >= allIds.length) {
        // Hoàn thành cả course
        await supabase
          .from("course_enrollments")
          .update({ completed_at: new Date().toISOString() })
          .eq("course_id", courseId)
          .eq("profile_id", userId);

        // +50 XP bonus
        await supabase.from("xp_transactions").insert({
          profile_id: userId,
          amount: 50,
          reason: "course_complete",
          reference_id: courseId,
        });

        setXpGained((prev) => prev + 50);
      }

      setCompleted(true);

      // 4. Auto navigate sang bài tiếp theo sau 2 giây
      if (nextLesson) {
        setCountdown(2);
      }
    } catch {
      flash("Không thể lưu tiến độ", "err");
    } finally {
      setCompleting(false);
    }
  }

  /* ── Countdown effect → navigate ─────────────── */
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0 && nextLesson) {
      router.push(`/studyhub/${courseId}/lessons/${nextLesson.id}`);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, nextLesson, courseId, router]);

  /* ── Loading ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="mx-auto max-w-md">
        <div className="h-12 w-full animate-pulse bg-foreground/10" />
        <div className="px-4 py-6 space-y-4">
          <div className="h-6 w-3/4 rounded bg-foreground/10 animate-pulse" />
          <div className="h-48 w-full rounded-2xl bg-foreground/10 animate-pulse" />
          <div className="h-4 w-full rounded bg-foreground/10 animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-foreground/10 animate-pulse" />
          <div className="h-10 w-full rounded-xl bg-foreground/10 animate-pulse" />
        </div>
      </div>
    );
  }

  /* ── Error / not found ───────────────────────── */
  if (error || !lesson || !course) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-sm text-muted-foreground mb-4">
            Không tìm thấy bài học
          </p>
          <Link
            href={`/studyhub/${courseId}`}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--brand-color)" }}
          >
            ← Quay lại
          </Link>
        </div>
      </div>
    );
  }

  /* ── Main render ─────────────────────────────── */
  return (
    <div className="mx-auto max-w-md pb-28">
      {/* ── Top nav bar ── */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        <Link
          href={`/studyhub/${courseId}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full active:bg-foreground/5"
        >
          <svg
            className="h-5 w-5 text-foreground"
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {course.title}
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          Bài {currentIndex + 1}/{allLessons.length}
        </span>
      </div>

      {/* ── Content area ── */}
      <div className="px-4 py-5 space-y-5">
        {/* Lesson title */}
        <h1 className="text-lg font-bold text-foreground">{lesson.title}</h1>

        {/* ── Completion banner ── */}
        {completed && xpGained > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center space-y-1">
            <div className="text-3xl">✅</div>
            <p className="text-sm font-semibold text-emerald-800">
              Tuyệt vời! +{xpGained} XP
            </p>
            {countdown !== null && nextLesson && (
              <p className="text-xs text-emerald-600">
                Chuyển bài tiếp theo sau {countdown}s…
              </p>
            )}
          </div>
        )}

        {/* Đã hoàn thành trước đó → hiện badge nhẹ */}
        {completed && xpGained === 0 && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center gap-2">
            <span className="text-emerald-600">✅</span>
            <span className="text-xs text-emerald-700 font-medium">
              Bạn đã hoàn thành bài này
            </span>
          </div>
        )}

        {/* ── Video content ── */}
        {lesson.content_type === "video" && lesson.content_url && (
          <VideoPlayer
            url={lesson.content_url}
            durationMinutes={lesson.duration_minutes}
            onReady={() => {
              if (!completed) markCompleted();
            }}
          />
        )}

        {/* ── Text content ── */}
        {lesson.content_type === "text" && (
          <div className="space-y-4">
            {lesson.content_body && (
              <div
                className="prose-sm text-sm text-foreground leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: simpleMarkdown(lesson.content_body),
                }}
              />
            )}
            {!completed && (
              <button
                onClick={() => markCompleted()}
                disabled={completing}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-color)" }}
              >
                {completing ? "Đang lưu…" : "Đã đọc xong ✓"}
              </button>
            )}
          </div>
        )}

        {/* ── Quiz content ── */}
        {lesson.content_type === "quiz" && quizQuestions.length > 0 && !completed && (
          <QuizPlayer
            questions={quizQuestions}
            onFinish={(score) => {
              markCompleted(score);
            }}
          />
        )}

        {lesson.content_type === "quiz" && quizQuestions.length === 0 && (
          <div className="rounded-2xl border border-border bg-background px-4 py-6 text-center">
            <div className="text-3xl mb-2">🚧</div>
            <p className="text-sm text-muted-foreground">
              Quiz đang được chuẩn bị
            </p>
          </div>
        )}
      </div>

      {/* ── Bottom navigation ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          {prevLesson ? (
            <Link
              href={`/studyhub/${courseId}/lessons/${prevLesson.id}`}
              className="flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 text-xs font-medium text-foreground active:bg-foreground/5"
            >
              ← Bài trước
            </Link>
          ) : (
            <div />
          )}

          {nextLesson ? (
            <Link
              href={`/studyhub/${courseId}/lessons/${nextLesson.id}`}
              className="flex items-center gap-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-white active:opacity-80"
              style={{ backgroundColor: "var(--brand-color)" }}
            >
              Bài tiếp theo →
            </Link>
          ) : (
            <Link
              href={`/studyhub/${courseId}`}
              className="flex items-center gap-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-white active:opacity-80"
              style={{ backgroundColor: "var(--brand-color)" }}
            >
              Về khóa học
            </Link>
          )}
        </div>
      </div>

      {/* ── Toast ── */}
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
