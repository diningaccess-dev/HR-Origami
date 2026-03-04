"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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

type QuizQuestion = {
  id?: string;
  lesson_id: string;
  question: string;
  options: { id: string; text: string }[];
  correct_option_id: string;
  explanation: string;
  order_index: number;
};

/* ── Zod Schemas ───────────────────────────────── */
const courseSchema = z.object({
  title: z.string().min(1, "Tên khóa học không được trống"),
  description: z.string().optional(),
  category: z.enum([
    "onboarding",
    "safety",
    "service",
    "kitchen",
    "bar",
    "other",
  ]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  is_required: z.boolean(),
});
type CourseForm = z.infer<typeof courseSchema>;

const CATEGORY_OPTIONS = [
  { value: "onboarding", label: "Onboarding" },
  { value: "safety", label: "An toàn" },
  { value: "service", label: "Service" },
  { value: "kitchen", label: "Bếp" },
  { value: "bar", label: "Bar" },
  { value: "other", label: "Khác" },
];

const DIFFICULTY_OPTIONS = [
  { value: "beginner", label: "Cơ bản" },
  { value: "intermediate", label: "Trung bình" },
  { value: "advanced", label: "Nâng cao" },
];

/* ══════════════════════════════════════════════════
   CourseEditorPage
   ══════════════════════════════════════════════════ */
export default function CourseEditorPage() {
  const params = useParams();
  const router = useRouter();
  const courseIdParam = params.courseId as string;
  const isNew = courseIdParam === "new";

  const [activeTab, setActiveTab] = useState<"info" | "lessons" | "quiz">(
    "info",
  );
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [courseId, setCourseId] = useState(isNew ? "" : courseIdParam);
  const [userId, setUserId] = useState("");
  const [locationId, setLocationId] = useState("");

  // Lesson modal
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    content_type: "text" as string,
    content_url: "",
    content_body: "",
    duration_minutes: "",
  });
  const [savingLesson, setSavingLesson] = useState(false);

  // Quiz editor
  const [selectedQuizLesson, setSelectedQuizLesson] = useState<Lesson | null>(
    null,
  );
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);

  const initRef = useRef(false);

  function flash(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* ── react-hook-form ─────────────────────────── */
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "other",
      difficulty: "beginner",
      is_required: false,
    },
  });

  /* ── Fetch ───────────────────────────────────── */
  const fetchData = useCallback(async () => {
    try {
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

      setUserId(user.id);
      setLocationId(profile.location_id ?? "");

      if (!isNew) {
        // Fetch course
        const { data: course } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseIdParam)
          .single();

        if (course) {
          setValue("title", course.title);
          setValue("description", course.description ?? "");
          setValue("category", course.category);
          setValue("difficulty", course.difficulty);
          setValue("is_required", course.is_required);
        }

        // Fetch lessons
        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("*")
          .eq("course_id", courseIdParam)
          .order("order_index", { ascending: true });

        setLessons(lessonsData ?? []);
      }
    } catch {
      flash("Không thể tải dữ liệu", "err");
    } finally {
      setLoading(false);
    }
  }, [isNew, courseIdParam, router, setValue]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchData();
  }, [fetchData]);

  /* ── Save course info ────────────────────────── */
  async function onSaveCourse(data: CourseForm) {
    setSaving(true);
    try {
      if (isNew || !courseId) {
        // Create
        const { data: created, error } = await supabase
          .from("courses")
          .insert({
            title: data.title,
            description: data.description || null,
            category: data.category,
            difficulty: data.difficulty,
            is_required: data.is_required,
            location_id: locationId || null,
            created_by: userId,
          })
          .select("id")
          .single();

        if (error) throw error;
        setCourseId(created.id);
        flash("Đã tạo khóa học", "ok");
        // Cập nhật URL mà không reload
        window.history.replaceState(null, "", `/studyhub/manage/${created.id}`);
      } else {
        // Update
        const { error } = await supabase
          .from("courses")
          .update({
            title: data.title,
            description: data.description || null,
            category: data.category,
            difficulty: data.difficulty,
            is_required: data.is_required,
          })
          .eq("id", courseId);

        if (error) throw error;
        flash("Đã lưu thông tin", "ok");
      }
    } catch {
      flash("Không thể lưu", "err");
    } finally {
      setSaving(false);
    }
  }

  /* ── Lesson CRUD ─────────────────────────────── */
  function openAddLesson() {
    setEditingLesson(null);
    setLessonForm({
      title: "",
      content_type: "text",
      content_url: "",
      content_body: "",
      duration_minutes: "",
    });
    setShowLessonModal(true);
  }

  function openEditLesson(lesson: Lesson) {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      content_type: lesson.content_type,
      content_url: lesson.content_url ?? "",
      content_body: lesson.content_body ?? "",
      duration_minutes: lesson.duration_minutes?.toString() ?? "",
    });
    setShowLessonModal(true);
  }

  async function saveLesson() {
    if (!courseId || !lessonForm.title.trim()) {
      flash("Tên bài học không được trống", "err");
      return;
    }
    setSavingLesson(true);
    try {
      const payload = {
        course_id: courseId,
        title: lessonForm.title.trim(),
        content_type: lessonForm.content_type,
        content_url: lessonForm.content_url || null,
        content_body: lessonForm.content_body || null,
        duration_minutes: lessonForm.duration_minutes
          ? parseInt(lessonForm.duration_minutes)
          : null,
        order_index: editingLesson
          ? editingLesson.order_index
          : lessons.length,
      };

      if (editingLesson) {
        const { error } = await supabase
          .from("lessons")
          .update(payload)
          .eq("id", editingLesson.id);
        if (error) throw error;

        setLessons((prev) =>
          prev.map((l) =>
            l.id === editingLesson.id ? { ...l, ...payload } : l,
          ),
        );
        flash("Đã cập nhật bài học", "ok");
      } else {
        const { data: created, error } = await supabase
          .from("lessons")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;

        setLessons((prev) => [...prev, created]);
        flash("Đã thêm bài học", "ok");
      }
      setShowLessonModal(false);
    } catch {
      flash("Không thể lưu bài học", "err");
    } finally {
      setSavingLesson(false);
    }
  }

  async function deleteLesson(id: string) {
    try {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
      setLessons((prev) => prev.filter((l) => l.id !== id));
      flash("Đã xóa bài học", "ok");
    } catch {
      flash("Không thể xóa", "err");
    }
  }

  /* ── Drag & Drop (HTML5) ─────────────────────── */
  async function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const from = dragItem.current;
    const to = dragOverItem.current;
    if (from === to) return;

    const reordered = [...lessons];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    // Cập nhật order_index
    const updated = reordered.map((l, i) => ({ ...l, order_index: i }));
    setLessons(updated);

    dragItem.current = null;
    dragOverItem.current = null;

    // Persist lên DB
    try {
      for (const l of updated) {
        await supabase
          .from("lessons")
          .update({ order_index: l.order_index })
          .eq("id", l.id);
      }
    } catch {
      flash("Không thể lưu thứ tự", "err");
    }
  }

  /* ── Quiz Editor ─────────────────────────────── */
  async function loadQuizQuestions(lesson: Lesson) {
    setSelectedQuizLesson(lesson);
    setActiveTab("quiz");

    const { data } = await supabase
      .from("quizzes")
      .select("*")
      .eq("lesson_id", lesson.id)
      .order("order_index", { ascending: true });

    setQuizQuestions(data ?? []);
  }

  function addQuestion() {
    if (!selectedQuizLesson) return;
    setQuizQuestions((prev) => [
      ...prev,
      {
        lesson_id: selectedQuizLesson.id,
        question: "",
        options: [
          { id: "a", text: "" },
          { id: "b", text: "" },
          { id: "c", text: "" },
          { id: "d", text: "" },
        ],
        correct_option_id: "a",
        explanation: "",
        order_index: prev.length,
      },
    ]);
  }

  function updateQuestion(index: number, field: string, value: string) {
    setQuizQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)),
    );
  }

  function updateOption(qIndex: number, optId: string, text: string) {
    setQuizQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optId ? { ...o, text } : o,
              ),
            }
          : q,
      ),
    );
  }

  function removeQuestion(index: number) {
    setQuizQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveAllQuestions() {
    if (!selectedQuizLesson) return;

    // Validation
    for (const q of quizQuestions) {
      if (!q.question.trim()) {
        flash("Câu hỏi không được trống", "err");
        return;
      }
      if (q.options.some((o) => !o.text.trim())) {
        flash("Tất cả lựa chọn phải có nội dung", "err");
        return;
      }
    }

    setSavingQuiz(true);
    try {
      // Xóa quiz cũ → insert lại
      await supabase
        .from("quizzes")
        .delete()
        .eq("lesson_id", selectedQuizLesson.id);

      if (quizQuestions.length > 0) {
        const payload = quizQuestions.map((q, i) => ({
          lesson_id: selectedQuizLesson.id,
          question: q.question,
          options: q.options,
          correct_option_id: q.correct_option_id,
          explanation: q.explanation,
          order_index: i,
        }));

        const { error } = await supabase.from("quizzes").insert(payload);
        if (error) throw error;
      }

      flash(`Đã lưu ${quizQuestions.length} câu hỏi`, "ok");
    } catch {
      flash("Không thể lưu quiz", "err");
    } finally {
      setSavingQuiz(false);
    }
  }

  /* ── Loading ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-6 space-y-4">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-foreground/10" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-foreground/10" />
        <div className="h-32 w-full animate-pulse rounded-xl bg-foreground/10" />
      </div>
    );
  }

  const TYPE_ICONS: Record<string, string> = {
    video: "🎬",
    text: "📝",
    quiz: "❓",
  };

  const quizLessons = lessons.filter((l) => l.content_type === "quiz");

  /* ── Main ────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-5 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/studyhub/manage"
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
        <h1 className="text-xl font-bold text-foreground">
          {isNew ? "Tạo khóa học mới" : "Chỉnh sửa khóa học"}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(
          [
            { key: "info", label: "Thông tin" },
            { key: "lessons", label: `Bài học (${lessons.length})` },
            ...(quizLessons.length > 0
              ? [{ key: "quiz", label: "Quiz" }]
              : []),
          ] as { key: "info" | "lessons" | "quiz"; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? "border-b-2 text-foreground"
                : "text-muted-foreground"
            }`}
            style={
              activeTab === tab.key
                ? { borderColor: "var(--brand-color)" }
                : undefined
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════ TAB: INFO ══════ */}
      {activeTab === "info" && (
        <form
          onSubmit={handleSubmit(onSaveCourse)}
          className="space-y-4"
        >
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Tên khóa học *
            </label>
            <input
              {...register("title")}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={
                { "--tw-ring-color": "var(--brand-color)" } as React.CSSProperties
              }
              placeholder="VD: Quy trình vệ sinh nhà hàng"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Mô tả
            </label>
            <textarea
              {...register("description")}
              rows={3}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none"
              style={
                { "--tw-ring-color": "var(--brand-color)" } as React.CSSProperties
              }
              placeholder="Mô tả ngắn về khóa học…"
            />
          </div>

          {/* Category + Difficulty row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Danh mục
              </label>
              <select
                {...register("category")}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Độ khó
              </label>
              <select
                {...register("difficulty")}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                {DIFFICULTY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Is Required */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register("is_required")}
              className="h-5 w-5 rounded border-border accent-(--brand-color)"
            />
            <span className="text-sm text-foreground">
              Bắt buộc hoàn thành
            </span>
          </label>

          {/* Save button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-color)" }}
          >
            {saving ? "Đang lưu…" : "Lưu thông tin"}
          </button>
        </form>
      )}

      {/* ══════ TAB: LESSONS ══════ */}
      {activeTab === "lessons" && (
        <div className="space-y-3">
          {!courseId && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-center">
              <p className="text-xs text-amber-700">
                Lưu thông tin khóa học trước khi thêm bài học
              </p>
            </div>
          )}

          {courseId && (
            <>
              {lessons.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">📖</div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Chưa có bài học nào
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      draggable
                      onDragStart={() => {
                        dragItem.current = index;
                      }}
                      onDragEnter={() => {
                        dragOverItem.current = index;
                      }}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 cursor-grab active:cursor-grabbing"
                    >
                      {/* Drag handle */}
                      <span className="text-muted-foreground text-xs select-none">
                        ⠿
                      </span>

                      {/* Number + icon */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-xs font-bold">
                        {TYPE_ICONS[lesson.content_type] ?? "📄"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {index + 1}. {lesson.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {lesson.content_type}
                          {lesson.duration_minutes
                            ? ` · ${lesson.duration_minutes} phút`
                            : ""}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {lesson.content_type === "quiz" && (
                          <button
                            onClick={() => loadQuizQuestions(lesson)}
                            className="rounded-lg px-2 py-1 text-[10px] font-medium text-purple-600 active:bg-purple-50"
                          >
                            ❓ Quiz
                          </button>
                        )}
                        <button
                          onClick={() => openEditLesson(lesson)}
                          className="rounded-lg px-2 py-1 text-[10px] font-medium text-foreground active:bg-foreground/5"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteLesson(lesson.id)}
                          className="rounded-lg px-2 py-1 text-[10px] font-medium text-red-600 active:bg-red-50"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={openAddLesson}
                className="w-full rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground active:bg-foreground/5"
              >
                + Thêm bài học
              </button>
            </>
          )}
        </div>
      )}

      {/* ══════ TAB: QUIZ ══════ */}
      {activeTab === "quiz" && (
        <div className="space-y-4">
          {/* Chọn quiz lesson */}
          {quizLessons.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {quizLessons.map((ql) => (
                <button
                  key={ql.id}
                  onClick={() => loadQuizQuestions(ql)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                    selectedQuizLesson?.id === ql.id
                      ? "text-white"
                      : "bg-foreground/5 text-muted-foreground"
                  }`}
                  style={
                    selectedQuizLesson?.id === ql.id
                      ? { backgroundColor: "var(--brand-color)" }
                      : undefined
                  }
                >
                  {ql.title}
                </button>
              ))}
            </div>
          )}

          {!selectedQuizLesson && (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground">
                Chọn bài quiz để chỉnh sửa câu hỏi
              </p>
            </div>
          )}

          {selectedQuizLesson && (
            <>
              <p className="text-sm font-semibold text-foreground">
                {selectedQuizLesson.title} — {quizQuestions.length} câu hỏi
              </p>

              {quizQuestions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="rounded-xl border border-border bg-background p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">
                      Câu {qIdx + 1}
                    </span>
                    <button
                      onClick={() => removeQuestion(qIdx)}
                      className="text-xs text-red-600 active:opacity-70"
                    >
                      Xóa
                    </button>
                  </div>

                  {/* Question text */}
                  <input
                    value={q.question}
                    onChange={(e) =>
                      updateQuestion(qIdx, "question", e.target.value)
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Nội dung câu hỏi…"
                  />

                  {/* 4 options */}
                  {q.options.map((opt) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={q.correct_option_id === opt.id}
                        onChange={() =>
                          updateQuestion(qIdx, "correct_option_id", opt.id)
                        }
                        className="accent-(--brand-color)"
                      />
                      <input
                        value={opt.text}
                        onChange={(e) =>
                          updateOption(qIdx, opt.id, e.target.value)
                        }
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                        placeholder={`Lựa chọn ${opt.id.toUpperCase()}`}
                      />
                    </div>
                  ))}

                  {/* Explanation */}
                  <input
                    value={q.explanation}
                    onChange={(e) =>
                      updateQuestion(qIdx, "explanation", e.target.value)
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                    placeholder="Giải thích đáp án (tùy chọn)"
                  />
                </div>
              ))}

              <button
                onClick={addQuestion}
                className="w-full rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground active:bg-foreground/5"
              >
                + Thêm câu hỏi
              </button>

              <button
                onClick={saveAllQuestions}
                disabled={savingQuiz}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-color)" }}
              >
                {savingQuiz ? "Đang lưu…" : "Lưu tất cả câu hỏi"}
              </button>
            </>
          )}
        </div>
      )}

      {/* ══════ LESSON MODAL ══════ */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md rounded-t-3xl bg-background px-4 py-6 space-y-4 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                {editingLesson ? "Sửa bài học" : "Thêm bài học"}
              </h3>
              <button
                onClick={() => setShowLessonModal(false)}
                className="text-muted-foreground"
              >
                ✕
              </button>
            </div>

            {/* Title */}
            <input
              value={lessonForm.title}
              onChange={(e) =>
                setLessonForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              placeholder="Tên bài học"
            />

            {/* Content type */}
            <div className="flex gap-2">
              {(["text", "video", "quiz"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    setLessonForm((f) => ({ ...f, content_type: t }))
                  }
                  className={`flex-1 rounded-xl py-2 text-xs font-medium ${
                    lessonForm.content_type === t
                      ? "text-white"
                      : "bg-foreground/5 text-muted-foreground"
                  }`}
                  style={
                    lessonForm.content_type === t
                      ? { backgroundColor: "var(--brand-color)" }
                      : undefined
                  }
                >
                  {t === "text" ? "📝 Text" : t === "video" ? "🎬 Video" : "❓ Quiz"}
                </button>
              ))}
            </div>

            {/* Video URL */}
            {lessonForm.content_type === "video" && (
              <input
                value={lessonForm.content_url}
                onChange={(e) =>
                  setLessonForm((f) => ({ ...f, content_url: e.target.value }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                placeholder="URL video (YouTube hoặc trực tiếp)"
              />
            )}

            {/* Text content */}
            {lessonForm.content_type === "text" && (
              <textarea
                value={lessonForm.content_body}
                onChange={(e) =>
                  setLessonForm((f) => ({
                    ...f,
                    content_body: e.target.value,
                  }))
                }
                rows={6}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none"
                placeholder="Nội dung bài học (hỗ trợ Markdown)…"
              />
            )}

            {/* Duration */}
            <input
              value={lessonForm.duration_minutes}
              onChange={(e) =>
                setLessonForm((f) => ({
                  ...f,
                  duration_minutes: e.target.value,
                }))
              }
              type="number"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              placeholder="Thời lượng ước tính (phút)"
            />

            {/* Save */}
            <button
              onClick={saveLesson}
              disabled={savingLesson}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-color)" }}
            >
              {savingLesson
                ? "Đang lưu…"
                : editingLesson
                  ? "Cập nhật"
                  : "Thêm bài học"}
            </button>
          </div>
        </div>
      )}

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
