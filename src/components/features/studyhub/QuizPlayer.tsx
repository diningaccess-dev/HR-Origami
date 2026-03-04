"use client";

import { useState } from "react";

/* ── Types ─────────────────────────────────────── */
type QuizOption = { id: string; text: string };
type QuizQuestion = {
  id: string;
  question: string;
  options: QuizOption[];
  correct_option_id: string;
  explanation: string | null;
  order_index: number;
};

/* ══════════════════════════════════════════════════
   QuizPlayer
   ══════════════════════════════════════════════════ */
export default function QuizPlayer({
  questions,
  onFinish,
}: {
  questions: QuizQuestion[];
  onFinish: (score: number, total: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[currentIndex];
  const isCorrect = selected === q?.correct_option_id;
  const total = questions.length;
  const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const passed = scorePct >= 70;

  /* ── Xác nhận câu trả lời ── */
  function handleConfirm() {
    if (!selected) return;
    setConfirmed(true);
    if (selected === q.correct_option_id) {
      setCorrectCount((c) => c + 1);
    }
  }

  /* ── Sang câu tiếp theo ── */
  function handleNext() {
    if (currentIndex + 1 >= total) {
      // Câu cuối → hiện kết quả
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setConfirmed(false);
    }
  }

  /* ── Màn hình kết quả ── */
  if (finished) {
    return (
      <div className="space-y-6 py-8 text-center">
        <div className="text-6xl">{passed ? "🎉" : "😔"}</div>
        <div>
          <p className="text-2xl font-bold text-foreground">
            {correctCount}/{total} câu đúng
          </p>
          <p className="text-lg font-semibold mt-1" style={{ color: passed ? "#16a34a" : "#dc2626" }}>
            {scorePct}%
          </p>
        </div>

        {passed ? (
          <div className="space-y-2">
            <p className="text-sm text-emerald-600 font-medium">
              Xuất sắc! Bạn đã vượt qua bài quiz.
            </p>
            <button
              onClick={() => onFinish(scorePct, total)}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity active:opacity-80"
              style={{ backgroundColor: "var(--brand-color)" }}
            >
              Hoàn thành ✓
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-600 font-medium">
              Cần đạt ≥ 70% để hoàn thành. Thử lại nhé!
            </p>
            <button
              onClick={() => {
                // Reset quiz
                setCurrentIndex(0);
                setSelected(null);
                setConfirmed(false);
                setCorrectCount(0);
                setFinished(false);
              }}
              className="w-full rounded-xl border-2 py-3 text-sm font-semibold transition-opacity active:opacity-80"
              style={{
                borderColor: "var(--brand-color)",
                color: "var(--brand-color)",
              }}
            >
              Thử lại
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!q) return null;

  /* ── Hiển thị câu hỏi ── */
  return (
    <div className="space-y-5">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((currentIndex + 1) / total) * 100}%`,
              backgroundColor: "var(--brand-color)",
            }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground shrink-0">
          {currentIndex + 1}/{total}
        </span>
      </div>

      {/* Câu hỏi */}
      <p className="text-base font-semibold text-foreground leading-relaxed">
        {q.question}
      </p>

      {/* Options */}
      <div className="space-y-2">
        {q.options.map((opt) => {
          const isThis = selected === opt.id;
          const isAnswer = opt.id === q.correct_option_id;

          let borderColor = "transparent";
          let bgColor = "transparent";
          if (confirmed) {
            if (isAnswer) {
              borderColor = "#16a34a";
              bgColor = "#f0fdf4";
            } else if (isThis && !isCorrect) {
              borderColor = "#dc2626";
              bgColor = "#fef2f2";
            }
          } else if (isThis) {
            borderColor = "var(--brand-color)";
            bgColor = "var(--brand-color)08";
          }

          return (
            <button
              key={opt.id}
              onClick={() => {
                if (!confirmed) setSelected(opt.id);
              }}
              disabled={confirmed}
              className="flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all"
              style={{ borderColor, backgroundColor: bgColor }}
            >
              {/* Radio circle */}
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: confirmed
                    ? isAnswer
                      ? "#16a34a"
                      : isThis
                        ? "#dc2626"
                        : "#d1d5db"
                    : isThis
                      ? "var(--brand-color)"
                      : "#d1d5db",
                }}
              >
                {((confirmed && isAnswer) || (!confirmed && isThis)) && (
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: confirmed
                        ? isAnswer
                          ? "#16a34a"
                          : "#dc2626"
                        : "var(--brand-color)",
                    }}
                  />
                )}
              </div>

              <span className="text-sm text-foreground">{opt.text}</span>

              {/* Icon kết quả */}
              {confirmed && isAnswer && (
                <span className="ml-auto text-emerald-600">✅</span>
              )}
              {confirmed && isThis && !isCorrect && (
                <span className="ml-auto text-red-600">❌</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Giải thích (sau khi confirmed + sai) */}
      {confirmed && !isCorrect && q.explanation && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">Giải thích:</p>
          <p className="text-xs text-amber-700">{q.explanation}</p>
        </div>
      )}

      {/* Buttons */}
      {!confirmed ? (
        <button
          onClick={handleConfirm}
          disabled={!selected}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: "var(--brand-color)" }}
        >
          Xác nhận
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity active:opacity-80"
          style={{ backgroundColor: "var(--brand-color)" }}
        >
          {currentIndex + 1 >= total ? "Xem kết quả" : "Câu tiếp theo →"}
        </button>
      )}
    </div>
  );
}
