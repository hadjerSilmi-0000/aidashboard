"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Files, BarChart3, BrainCircuit,
  Bell, Shield, LogOut, Zap, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import toast from "react-hot-toast";
import { cacheClear } from "@/lib/cache";

const NAV = [
  { label: "Dashboard",     href: "/dashboard",    icon: LayoutDashboard },
  { label: "Files",         href: "/files",         icon: Files },
  { label: "Analytics",     href: "/analytics",     icon: BarChart3 },
  { label: "AI Jobs",       href: "/jobs",          icon: BrainCircuit },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const handleLogout = async () => {
    setBusy(true);
    try {
      cacheClear(); // clear all cached data on logout
      await logout();
      router.push("/auth/login");
      toast.success("Logged out");
    } catch { toast.error("Logout failed"); }
    finally { setBusy(false); }
  };

  return (
    <motion.aside
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
      style={{
        position: "fixed", left: 0, top: 0,
        width: "240px", height: "100vh",
        background: "#ffffff",
        borderRight: "1px solid #f3e8ff",
        boxShadow: "2px 0 16px rgba(139,92,246,0.05)",
        display: "flex", flexDirection: "column",
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px", borderBottom: "1px solid #f3e8ff" }}>
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", boxShadow: "0 2px 10px rgba(139,92,246,0.35)" }}>
            <Zap size={15} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: "#1e1b4b", lineHeight: 1 }}>AI Dashboard</div>
            <div className="text-[10px] mt-0.5" style={{ color: "#a78bfa" }}>Insights Platform</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }} className="space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: "#c4b5fd" }}>Menu</p>

        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className={cn("nav-item relative", active && "active")}>
              {active && (
                <motion.div layoutId="nav-pill"
                  style={{ position: "absolute", inset: 0, borderRadius: 10, background: "linear-gradient(135deg,#ede9fe,#f5f3ff)", border: "1px solid #ddd6fe" }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <item.icon size={15} className={cn("relative z-10 flex-shrink-0", active ? "text-violet-600" : "text-slate-400")} />
              <span className={cn("relative z-10 flex-1", active ? "font-semibold" : "")} style={{ color: active ? "#6d28d9" : "" }}>
                {item.label}
              </span>
              {active && <ChevronRight size={12} className="relative z-10 text-violet-400" />}
            </Link>
          );
        })}

        {/* Admin — only for admin role */}
        {user?.role === "admin" && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mt-5 mb-2" style={{ color: "#c4b5fd" }}>Admin</p>
            {(() => {
              const active = isActive("/admin");
              return (
                <Link href="/admin" className={cn("nav-item relative", active && "active")}>
                  {active && (
                    <motion.div layoutId="nav-admin"
                      style={{ position: "absolute", inset: 0, borderRadius: 10, background: "linear-gradient(135deg,#fef3c7,#fffbeb)", border: "1px solid #fde68a" }}
                      transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                  )}
                  <Shield size={15} className={cn("relative z-10 flex-shrink-0", active ? "text-amber-600" : "text-slate-400")} />
                  <span className="relative z-10 flex-1" style={{ color: active ? "#b45309" : "" }}>Admin Panel</span>
                  {active && <ChevronRight size={12} className="relative z-10 text-amber-400" />}
                </Link>
              );
            })()}
          </>
        )}
      </nav>

      {/* User footer */}
      <div style={{ padding: "12px", borderTop: "1px solid #f3e8ff" }} className="space-y-0.5">
        <Link href="/profile" className="nav-item">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#ede9fe,#f5f3ff)", border: "1px solid #ddd6fe" }}>
            <span className="text-[11px] font-bold" style={{ color: "#7c3aed" }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="text-xs font-semibold truncate" style={{ color: "#1e1b4b" }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-[10px] truncate capitalize" style={{ color: "#9ca3af" }}>{user?.role}</div>
          </div>
        </Link>

        <button onClick={handleLogout} disabled={busy}
          className="nav-item w-full"
          style={{ color: "#ef4444" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#fee2e2")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <LogOut size={14} className="flex-shrink-0" />
          <span>{busy ? "Logging out…" : "Logout"}</span>
        </button>
      </div>
    </motion.aside>
  );
}
