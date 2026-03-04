// components/ui/EmptyState.tsx
// Empty state thống nhất — icon, tiêu đề, mô tả

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
};

// Icon mặc định: hộp rỗng
function DefaultIcon() {
  return (
    <svg
      className="h-12 w-12 text-muted-foreground/30"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

export default function EmptyState({
  title,
  description,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground/5">
        {icon ?? <DefaultIcon />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground/60">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
