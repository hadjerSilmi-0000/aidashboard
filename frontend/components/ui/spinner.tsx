import { cn } from "@/lib/utils";

export function Spinner({ size = "md", className }: { size?: "sm"|"md"|"lg"; className?: string }) {
  const s = { sm: "w-4 h-4 border-2", md: "w-5 h-5 border-2", lg: "w-8 h-8 border-3" }[size];
  return <div className={cn("rounded-full border-purple-200 border-t-purple-500 animate-spin", s, className)} />;
}

export function PageSpinner() {
  return (
    <div className="min-h-screen bg-[#f5f3ff] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white border border-purple-100 shadow-card flex items-center justify-center">
          <Spinner size="md" />
        </div>
        <p className="text-sm text-purple-400 font-medium">Loading…</p>
      </div>
    </div>
  );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 shimmer" /></td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="h-4 w-1/3 shimmer" />
      <div className="h-8 w-2/3 shimmer" />
      <div className="h-3 w-1/2 shimmer" />
    </div>
  );
}
