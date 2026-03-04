// components/ui/Spinner.tsx
// Loading spinner thống nhất — dùng brand color qua CSS variable

type SpinnerProps = {
  fullPage?: boolean; // true = chiếm toàn màn hình; false = inline
  label?: string;
};

export default function Spinner({
  fullPage = true,
  label = "Đang tải...",
}: SpinnerProps) {
  const spinner = (
    <div className="flex items-center gap-2 text-sm text-foreground/50">
      <div
        className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
        style={{ color: "var(--brand-color)" }}
      />
      {label}
    </div>
  );

  if (!fullPage) return spinner;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      {spinner}
    </div>
  );
}
