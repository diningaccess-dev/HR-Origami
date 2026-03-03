// Màu brand theo SKILL.md mục 6
export const BRAND_COLORS: Record<string, string> = {
  enso: "#2D6A4F",
  origami: "#8B7355",
  okyu: "#C62828",
};

/**
 * Trả về hex color cho từng location.
 * Mặc định về enso nếu locationId không hợp lệ.
 */
export function getBrandColor(locationId: string): string {
  return BRAND_COLORS[locationId] ?? BRAND_COLORS.enso;
}
