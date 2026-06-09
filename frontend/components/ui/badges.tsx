import { cn, statusColor, priorityColor } from "@/lib/utils";

interface BadgeProps {
  status?: string;
  priority?: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, className }: BadgeProps) {
  if (!status) return null;
  return (
    <span className={cn("badge capitalize", statusColor(status), className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 inline-block" />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority, className }: BadgeProps) {
  if (!priority) return null;
  return (
    <span className={cn("badge capitalize font-semibold", priorityColor(priority), className)}>
      {priority}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={cn(
        "badge capitalize",
        isAdmin
          ? "text-amber-700 bg-amber-100"
          : "text-violet-700 bg-violet-100",
      )}
    >
      {isAdmin ? "⚡" : "●"} {role}
    </span>
  );
}

export function TypeBadge({ type, className }: { type: string; className?: string }) {
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
  };
  return (
    <span className={cn("badge capitalize", colors[type] ?? "bg-slate-100 text-slate-600", className)}>
      {type.replace(/_/g, " ")}
    </span>
  );
}