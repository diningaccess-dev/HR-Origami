// components/ui/FloatToast.tsx
// Toast nổi phía trên bottom nav — thống nhất giao diện mọi trang

type FloatToastProps = {
  message: string;
  type?: "ok" | "err" | "info";
};

// Dùng: {toast && <FloatToast message={toast.msg} type={toast.type} />}
export default function FloatToast({ message, type = "ok" }: FloatToastProps) {
  const bg =
    type === "ok"
      ? "bg-emerald-600"
      : type === "err"
        ? "bg-red-600"
        : "bg-foreground";

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg ${bg}`}
      role="alert"
    >
      {message}
    </div>
  );
}
