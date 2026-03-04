// components/ui/PageWrapper.tsx
// Wrapper thống nhất cho tất cả trang — spacing, max-width, padding bottom cho nav

type PageWrapperProps = {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean; // max-w-md (default); narrow=false → max-w-lg
};

export default function PageWrapper({
  children,
  className = "",
  narrow = true,
}: PageWrapperProps) {
  const maxW = narrow ? "max-w-md" : "max-w-lg";
  return (
    <div className={`mx-auto ${maxW} px-4 py-6 space-y-5 ${className}`}>
      {children}
    </div>
  );
}
