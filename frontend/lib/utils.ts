import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export const formatDate = (d: string | Date) => format(new Date(d), "MMM dd, yyyy");
export const formatDateTime = (d: string | Date) => format(new Date(d), "MMM dd, yyyy · HH:mm");
export const timeAgo = (d: string | Date) => formatDistanceToNow(new Date(d), { addSuffix: true });

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024, sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function statusColor(s: string) {
  const m: Record<string, string> = {
    uploaded: "bg-blue-100 text-blue-700",
    queued: "bg-amber-100 text-amber-700",
    processing: "bg-violet-100 text-violet-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
    running: "bg-violet-100 text-violet-700",
    active: "bg-green-100 text-green-700",
    inactive: "bg-slate-100 text-slate-500",
    suspended: "bg-red-100 text-red-600",
  };
  return m[s] ?? "bg-slate-100 text-slate-500";
}

export function priorityColor(p: string) {
  const m: Record<string, string> = {
    low: "text-green-600", medium: "text-amber-600", high: "text-orange-600", critical: "text-red-600",
  };
  return m[p] ?? "text-slate-400";
}

export function fileTypeIcon(t: string) {
  const m: Record<string, string> = { csv: "📊", json: "📋", pdf: "📄", image: "🖼️", text: "📝", excel: "📈", other: "📁" };
  return m[t] ?? "📁";
}
