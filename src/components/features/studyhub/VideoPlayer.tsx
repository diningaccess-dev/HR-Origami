"use client";

import { useEffect, useRef, useState } from "react";

/* ── Helpers ───────────────────────────────────── */
function isYouTube(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

function getYouTubeId(url: string): string | null {
  const m =
    url.match(/[?&]v=([^&#]+)/) ||
    url.match(/youtu\.be\/([^?&#]+)/) ||
    url.match(/embed\/([^?&#]+)/);
  return m ? m[1] : null;
}

/* ══════════════════════════════════════════════════
   VideoPlayer
   ══════════════════════════════════════════════════ */
export default function VideoPlayer({
  url,
  durationMinutes,
  onReady,
}: {
  url: string;
  durationMinutes: number | null;
  onReady: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canComplete, setCanComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tính 80% thời lượng ước tính (giây). Nếu không có → 30 giây mặc định
  const threshold = (durationMinutes ?? 1) * 60 * 0.8;

  useEffect(() => {
    // Với YouTube, cho phép hoàn thành sau 80% thời lượng ước tính
    if (isYouTube(url)) {
      timerRef.current = setTimeout(() => {
        setCanComplete(true);
      }, threshold * 1000);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [url, threshold]);

  /* ── Theo dõi tiến độ video HTML5 ── */
  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v || canComplete) return;
    if (v.duration > 0 && v.currentTime >= v.duration * 0.8) {
      setCanComplete(true);
    }
  }

  const ytId = isYouTube(url) ? getYouTubeId(url) : null;

  return (
    <div className="space-y-4">
      {/* Player */}
      {ytId ? (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            src={url}
            className="h-full w-full"
            controls
            playsInline
            onTimeUpdate={handleTimeUpdate}
          />
        </div>
      )}

      {/* Nút hoàn thành */}
      {canComplete ? (
        <button
          onClick={onReady}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity active:opacity-80"
          style={{ backgroundColor: "var(--brand-color)" }}
        >
          Đã xem xong ✓
        </button>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Xem ít nhất 80% để hoàn thành bài học
        </p>
      )}
    </div>
  );
}
