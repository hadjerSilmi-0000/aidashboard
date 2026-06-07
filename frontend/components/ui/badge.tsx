import { cn, statusColor, priorityColor } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("badge capitalize", statusColor(status))}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn("badge capitalize", role === "admin"
      ? "bg-amber-100 text-amber-700"
      : "bg-violet-100 text-violet-700")}>
      {role === "admin" ? "⚡" : "●"} {role}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    analysis: "bg-blue-100 text-blue-700",
    insights: "bg-emerald-100 text-emerald-700",
    patterns: "bg-violet-100 text-violet-700",
    question: "bg-amber-100 text-amber-700",
    csv: "bg-teal-100 text-teal-700",
    json: "bg-orange-100 text-orange-700",
    pdf: "bg-red-100 text-red-700",
    image: "bg-pink-100 text-pink-700",
    excel: "bg-green-100 text-green-700",
    text: "bg-sky-100 text-sky-700",
    system: "bg-slate-100 text-slate-600",
    user: "bg-indigo-100 text-indigo-700",
    file_processing: "bg-cyan-100 text-cyan-700",
    ai_analysis: "bg-purple-100 text-purple-700",
    security: "bg-red-100 text-red-700",
    admin: "bg-amber-100 text-amber-700",
    other: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={cn("badge capitalize", colors[type] ?? "bg-slate-100 text-slate-600")}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: string }) {
  const c: Record<string, string> = {
    low: "bg-green-400", medium: "bg-amber-400", high: "bg-orange-500", critical: "bg-red-500",
  };
  return <span className={cn("inline-block w-2 h-2 rounded-full", c[priority] ?? "bg-slate-300")} title={priority} />;
}
