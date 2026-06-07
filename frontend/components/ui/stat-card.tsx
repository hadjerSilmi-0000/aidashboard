"use client";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string; value: string | number;
  icon?: LucideIcon; iconColor?: string; iconBg?: string;
  sub?: string; delay?: number;
}

export function StatCard({ title, value, icon: Icon, iconColor = "text-violet-500", iconBg = "bg-violet-50", sub, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 0.61, 0.36, 1] }}
      className="card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", iconBg)}>
            <Icon size={17} className={iconColor} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-[#1e1b4b] tabular-nums">{value}</div>
      <div className="text-xs font-medium text-slate-400 mt-0.5">{title}</div>
      {sub && <div className="text-xs text-purple-400 mt-1">{sub}</div>}
    </motion.div>
  );
}
