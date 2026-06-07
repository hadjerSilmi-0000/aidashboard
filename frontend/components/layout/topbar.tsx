"use client";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useRef, useState } from "react";
import { notificationsApi } from "@/lib/api";

const TITLES: Record<string, string> = {
  "/dashboard":     "Dashboard",
  "/files":         "Files",
  "/analytics":     "Analytics",
  "/jobs":          "AI Jobs",
  "/notifications": "Notifications",
  "/profile":       "Profile",
  "/admin":         "Admin Panel",
};

export function Topbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFetched = useRef<number>(0);

  const title = Object.entries(TITLES).find(([p]) =>
    pathname === p || pathname.startsWith(p + "/")
  )?.[1] ?? "AI Dashboard";

  const fetchUnread = async () => {
    // Hard throttle: never fetch more than once per 60s
    if (Date.now() - lastFetched.current < 60_000) return;
    lastFetched.current = Date.now();
    try {
      const r = await notificationsApi.stats();
      setUnread(r.data.unreadCount || 0);
    } catch { /* ignore 403/429 */ }
  };

  useEffect(() => {
    if (!user) return;
    // Delay first fetch by 3s to let page settle, then poll every 2 minutes
    const initial = setTimeout(fetchUnread, 3000);
    intervalRef.current = setInterval(fetchUnread, 2 * 60 * 1000);
    return () => {
      clearTimeout(initial);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <header
      style={{
        position: "fixed", top: 0, right: 0, left: "240px",
        height: "56px", zIndex: 30,
        background: "#ffffff",
        borderBottom: "1px solid #f3e8ff",
        boxShadow: "0 1px 8px rgba(139,92,246,0.04)",
        display: "flex", alignItems: "center",
        padding: "0 28px", gap: 16,
      }}
    >
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "#1e1b4b" }}>{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/notifications"
          style={{ position: "relative", width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}
          className="hover:bg-purple-50 transition-colors">
          <Bell size={16} className="text-slate-400" />
          {unread > 0 && (
            <span style={{
              position: "absolute", top: -2, right: -2,
              width: 16, height: 16, borderRadius: "50%",
              background: "#8b5cf6", border: "2px solid white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 700, color: "white",
            }}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <Link href="/profile"
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: "linear-gradient(135deg,#ede9fe,#f5f3ff)",
            border: "1px solid #ddd6fe",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          className="hover:border-violet-300 transition-colors">
          <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed" }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </span>
        </Link>
      </div>
    </header>
  );
}
