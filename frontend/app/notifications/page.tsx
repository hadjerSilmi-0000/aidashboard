"use client";
import { useEffect, useState, useRef } from "react";
import { Shell } from "@/components/layout/shell";
import { TypeBadge, PriorityDot } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { notificationsApi } from "@/lib/api";
import { cacheInvalidate } from "@/lib/cache";
import { useSocketEvent } from "@/lib/socket-context";
import { Bell, CheckCheck, Trash2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { timeAgo } from "@/lib/utils";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const fetched = useRef(false);
  const limit = 20;

  const load = async (p = 1, force = false) => {
    if (!force && fetched.current && p === 1) return;
    fetched.current = true;
    setLoading(true);
    try {
      const [nRes, sRes] = await Promise.all([
        notificationsApi.list(p, limit),
        notificationsApi.stats(),
      ]);
      setItems(nRes.data.notifications || []);
      setStats(sRes.data);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(page); }, [page]);

  // ── Socket: prepend newly created notifications in real-time ──────
  useSocketEvent<any>("notification:new", (notification) => {
    setItems(prev => {
      // Avoid duplicates if the notification is already in the list
      if (prev.some(n => n._id === notification._id)) return prev;
      return [notification, ...prev];
    });
    setStats((s: any) =>
      s ? { ...s, unreadCount: (s.unreadCount || 0) + 1, total: (s.total || 0) + 1 } : s
    );
    cacheInvalidate("notif:");
  });
  // ─────────────────────────────────────────────────────────────────

  const markRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setItems(p => p.map(n => n._id === id ? { ...n, delivery: { ...n.delivery, status: "read" } } : n));
      setStats((s: any) => s ? { ...s, unreadCount: Math.max(0, s.unreadCount - 1) } : s);
      cacheInvalidate("notif:");
    } catch { toast.error("Failed"); }
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems(p => p.map(n => ({ ...n, delivery: { ...n.delivery, status: "read" } })));
      setStats((s: any) => s ? { ...s, unreadCount: 0 } : s);
      cacheInvalidate("notif:");
      toast.success("All marked as read");
    } catch { toast.error("Failed"); }
  };

  const del = async (id: string) => {
    try {
      await notificationsApi.delete(id);
      setItems(p => p.filter(n => n._id !== id));
      setStats((s: any) => s ? { ...s, total: Math.max(0, (s.total || 1) - 1) } : s);
      cacheInvalidate("notif:");
      toast.success("Deleted");
    } catch { toast.error("Failed"); }
  };

  return (
    <Shell>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b" }}>Notifications</h2>
          <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
            {stats?.unreadCount ?? 0} unread · {stats?.total ?? 0} total
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={markAll} className="btn-ghost text-xs flex items-center gap-1.5">
            <CheckCheck size={13} /> Mark all read
          </button>
          <button onClick={() => { fetched.current = false; load(page, true); }} className="btn-ghost text-xs flex items-center gap-1.5">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="card-flat" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3e8ff", display: "flex", alignItems: "center", gap: 8 }}>
          <Bell size={14} className="text-amber-500" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>All Notifications</span>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner /></div>
        ) : items.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <Bell size={36} style={{ color: "#e9d5ff", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: "#9ca3af" }}>No notifications yet</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((n, i) => {
              const unread = n.delivery?.status !== "read";
              return (
                <motion.div key={n._id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                  transition={{ delay: i < 5 ? i * 0.03 : 0 }}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "14px 20px",
                    borderBottom: i < items.length - 1 ? "1px solid #faf5ff" : "none",
                    background: unread ? "#faf5ff" : "white",
                    transition: "background 0.15s",
                  }}>
                  <div style={{ marginTop: 5, flexShrink: 0 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: unread ? "#8b5cf6" : "#e5e7eb" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: unread ? 600 : 500, color: unread ? "#1e1b4b" : "#6b7280" }}>{n.title}</span>
                      <TypeBadge type={n.type} />
                      <PriorityDot priority={n.priority} />
                    </div>
                    <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>{n.message}</p>
                    <p style={{ fontSize: 11, color: "#d1d5db", marginTop: 4 }}>{timeAgo(n.createdAt)}</p>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {unread && (
                      <button onClick={() => markRead(n._id)}
                        style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none", background: "transparent", color: "#a78bfa" }}
                        className="hover:bg-violet-100 transition-colors" title="Mark read">
                        <CheckCheck size={12} />
                      </button>
                    )}
                    <button onClick={() => del(n._id)}
                      style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none", background: "transparent", color: "#d1d5db" }}
                      className="hover:bg-red-50 hover:text-red-400 transition-colors" title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {items.length >= limit && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f3e8ff", display: "flex", justifyContent: "center", gap: 12 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-ghost text-xs disabled:opacity-30">← Prev</button>
            <span style={{ fontSize: 12, color: "#9ca3af", alignSelf: "center" }}>Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} className="btn-ghost text-xs">Next →</button>
          </div>
        )}
      </div>
    </Shell>
  );
}