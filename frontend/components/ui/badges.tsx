import { cn, getStatusColor, getPriorityColor } from "@/lib/utils";

interface BadgeProps {
  status?: string;
  priority?: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, className }: BadgeProps) {
  if (!status) return null;
  return (
    <span className={cn("badge capitalize", getStatusColor(status), className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 inline-block" />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority, className }: BadgeProps) {
  if (!priority) return null;
  return (
    <span className={cn("badge capitalize font-semibold", getPriorityColor(priority), className)}>
      {priority}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span className={cn(
      "badge capitalize",
      isAdmin
        ? "text-amber-400 bg-amber-400/10 border border-amber-400/20"
        : "text-sky-400 bg-sky-400/10 border border-sky-400/20"
    )}>
      {isAdmin ? "⚡" : "●"} {role}
    </span>
  );
}

export function TypeBadge({ type, className }: { type: string; className?: string }) {
  const colors: Record<string, string> = {
    analysis: "text-blue-400 bg-blue-400/10",
    insights: "text-emerald-400 bg-emerald-400/10",
    patterns: "text-violet-400 bg-violet-400/10",
    question: "text-amber-400 bg-amber-400/10",
    csv: "text-teal-400 bg-teal-400/10",
    json: "text-orange-400 bg-orange-400/10",
    pdf: "text-red-400 bg-red-400/10",
    image: "text-pink-400 bg-pink-400/10",
    excel: "text-green-400 bg-green-400/10",
    text: "text-blue-300 bg-blue-300/10",
    system: "text-gray-400 bg-gray-400/10",
    user: "text-indigo-400 bg-indigo-400/10",
    file_processing: "text-cyan-400 bg-cyan-400/10",
    ai_analysis: "text-violet-400 bg-violet-400/10",
    security: "text-red-400 bg-red-400/10",
    admin: "text-amber-400 bg-amber-400/10",
  };
  return (
    <span className={cn("badge capitalize", colors[type] || "text-gray-400 bg-gray-400/10", className)}>
      {type.replace(/_/g, " ")}
    </span>
  );
}
