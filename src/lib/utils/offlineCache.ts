// lib/utils/offlineCache.ts
// Tiện ích cache localStorage đơn giản cho dữ liệu offline

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ

type CacheEntry<T> = {
  data: T;
  cachedAt: number; // timestamp ms
};

// ── Lưu data vào cache ─────────────────────────────────────────
export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Bỏ qua nếu localStorage không khả dụng (private mode, đầy bộ nhớ)
    console.warn("[offlineCache] Không thể lưu cache:", key);
  }
}

// ── Đọc data từ cache ──────────────────────────────────────────
export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry<T>;

    // Kiểm tra TTL
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

// ── Xóa cache cụ thể ──────────────────────────────────────────
export function clearCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // noop
  }
}

// ── Cache keys ─────────────────────────────────────────────────
export const CACHE_KEYS = {
  shifts: (userId: string, weekOffset: number) =>
    `shifts_${userId}_week${weekOffset}`,
  profile: (userId: string) => `profile_${userId}`,
} as const;
