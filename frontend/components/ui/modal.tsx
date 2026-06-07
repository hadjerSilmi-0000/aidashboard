"use client";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean; onClose: () => void; title?: string;
  children: React.ReactNode; size?: "sm"|"md"|"lg";
}
const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-xl" };

export function Modal({ open, onClose, title, children, size = "md" }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            className={cn("relative w-full card-flat shadow-[0_8px_40px_rgba(139,92,246,0.18)] overflow-hidden", sizes[size])}
          >
            <div className="h-1 bg-gradient-to-r from-purple-400 via-violet-500 to-purple-400" />
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3e8ff]">
                <h2 className="font-semibold text-[#1e1b4b] text-sm">{title}</h2>
                <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-purple-50 flex items-center justify-center transition-colors">
                  <X size={14} className="text-purple-400" />
                </button>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Confirm({ open, onClose, onConfirm, title, message, danger = false }: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-slate-500 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
        <button onClick={() => { onConfirm(); onClose(); }}
          className={danger ? "btn-danger text-sm" : "btn-primary text-sm"}>
          {danger ? "Delete" : "Confirm"}
        </button>
      </div>
    </Modal>
  );
}
