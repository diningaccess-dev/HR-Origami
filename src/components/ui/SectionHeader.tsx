// components/ui/SectionHeader.tsx
// Tiêu đề section thống nhất — uppercase, nhỏ, mờ

type SectionHeaderProps = {
  children: React.ReactNode;
};

export default function SectionHeader({ children }: SectionHeaderProps) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h2>
  );
}
