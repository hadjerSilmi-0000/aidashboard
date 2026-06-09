"use client";
import { useState, useEffect, useRef } from "react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { RoleBadge, StatusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Spinner, SkeletonRow } from "@/components/ui/spinner";
import { adminApi } from "@/lib/api";
import { cachedFetch, cacheInvalidate } from "@/lib/cache";
import {
  Shield, Users, Activity, Cpu, Bell, Trash2, XCircle,
  RefreshCw, AlertTriangle, UserCheck, Terminal, Play,
  CheckCircle, HeartPulse,
} from "lucide-react";
import { motion } from "framer-motion";
import { timeAgo } from "@/lib/utils";
import toast from "react-hot-toast";

type Tab = "overview" | "users" | "system";

export default function AdminPage() {
  // ── Common data ────────────────────────────────────────────────────
  const [overview, setOverview] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── System tab data ────────────────────────────────────────────────
  const [systemStats, setSystemStats] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [adminHealthOk, setAdminHealthOk] = useState<boolean | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemLoaded, setSystemLoaded] = useState(false);
  const [restarting, setRestarting] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("overview");
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [sending, setSending] = useState(false);
  const fetched = useRef(false);

  // ── Load overview / users / metrics ───────────────────────────────
  const load = async (force = false) => {
    if (!force && fetched.current) return;
    fetched.current = true;
    setLoading(true);
    try {
      const ttl = 3 * 60_000;
      const [ovRes, usRes, meRes, ulRes] = await Promise.all([
        cachedFetch("admin:overview", () => adminApi.overview().then(r => r.data.data), ttl),
        cachedFetch("admin:userstats", () => adminApi.getUserStats().then(r => r.data.data), ttl),
        cachedFetch("admin:metrics", () => adminApi.metrics().then(r => r.data.data), ttl),
        cachedFetch("admin:users", () => adminApi.listUsers().then(r => r.data.data?.users || []), ttl),
      ]);
      setOverview(ovRes);
      setUserStats(usRes);
      setMetrics(meRes);
      setUsers(ulRes as any[]);
    } catch { toast.error("Failed to load admin data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Load system tab data (lazy — only when tab is opened) ─────────
  const loadSystem = async (force = false) => {
    if (!force && systemLoaded) return;
    setSystemLoading(true);
    try {
      const [statsRes, logsRes, healthRes] = await Promise.all([
        adminApi.systemStats(),
        adminApi.getLogs(),
        adminApi.adminHealth(),
      ]);
      setSystemStats(statsRes.data.data);
      setLogs(Array.isArray(logsRes.data.data) ? logsRes.data.data : []);
      setAdminHealthOk(healthRes.data.success === true);
      setSystemLoaded(true);
    } catch { toast.error("Failed to load system data"); }
    finally { setSystemLoading(false); }
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === "system") loadSystem();
  };

  const refresh = () => {
    cacheInvalidate("admin:");
    fetched.current = false;
    load(true);
    if (tab === "system") loadSystem(true);
  };

  // ── Actions ───────────────────────────────────────────────────────
  const sendAlert = async () => {
    if (!alertMsg.trim()) { toast.error("Message required"); return; }
    setSending(true);
    try {
      await adminApi.sendAlert(alertMsg);
      toast.success("Alert sent to all managers!");
      setAlertMsg(""); setAlertOpen(false);
    } catch { toast.error("Failed to send alert"); }
    finally { setSending(false); }
  };

  const cleanup = async () => {
    try { await adminApi.cleanup(); toast.success("Old notifications archived"); }
    catch { toast.error("Cleanup failed"); }
  };

  const revokeSessions = async () => {
    try { await adminApi.revokeSessions(); toast.success("All sessions revoked"); }
    catch { toast.error("Failed"); }
  };

  const restartJobs = async () => {
    setRestarting(true);
    try { await adminApi.restartJobs(); toast.success("Background jobs restarted"); }
    catch { toast.error("Restart failed"); }
    finally { setRestarting(false); }
  };

  const updateRole = async (userId: string, role: string) => {
    try {
      await adminApi.updateUserRole(userId, role);
      setUsers(p => p.map(u => u._id === userId ? { ...u, role } : u));
      cacheInvalidate("admin:users");
      toast.success("Role updated");
    } catch { toast.error("Failed"); }
  };

  const updateStatus = async (userId: string, status: string) => {
    try {
      await adminApi.updateUserStatus(userId, status);
      setUsers(p => p.map(u => u._id === userId ? { ...u, status } : u));
      cacheInvalidate("admin:users");
      toast.success("Status updated");
    } catch { toast.error("Failed"); }
  };

  const fmtMB = (b: number) => `${((b || 0) / 1024 / 1024).toFixed(1)} MB`;

  // ── Tabs config ────────────────────────────────────────────────────
  const TABS: { k: Tab; label: string }[] = [
    { k: "overview", label: "Overview" },
    { k: "users", label: "Users" },
    { k: "system", label: "System" },
  ];

  return (
    <Shell adminOnly>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={16} style={{ color: "#d97706" }} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b" }}>Admin Panel</h2>
            <p style={{ fontSize: 13, color: "#9ca3af" }}>System management</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setAlertOpen(true)} className="btn-ghost text-xs flex items-center gap-1.5" style={{ color: "#d97706", borderColor: "#fde68a" }}>
            <Bell size={12} /> Send Alert
          </button>
          <button onClick={refresh} className="btn-ghost text-xs flex items-center gap-1.5">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard title="Total Users" value={overview?.users ?? 0} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-500" delay={0} />
        <StatCard title="Active Sessions" value={overview?.sessions ?? 0} icon={Activity} iconBg="bg-green-50" iconColor="text-green-500" delay={0.07} />
        <StatCard title="Notifications" value={overview?.notifications ?? 0} icon={Bell} iconBg="bg-amber-50" iconColor="text-amber-500" delay={0.14} />
        <StatCard title="Admins" value={userStats?.admins ?? 0} icon={Shield} iconBg="bg-violet-50" iconColor="text-violet-500" delay={0.21} />
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", background: "white", border: "1px solid #f3e8ff", borderRadius: 12, padding: 4, gap: 4, width: "fit-content", marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.k} onClick={() => handleTabChange(t.k)}
            style={{ padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.18s", background: tab === t.k ? "#8b5cf6" : "transparent", color: tab === t.k ? "white" : "#94a3b8" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Metrics */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="card-flat" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Cpu size={14} className="text-violet-500" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>Performance Metrics</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[
                { label: "Heap Used", value: metrics ? fmtMB(metrics.memory?.heapUsed) : "—" },
                { label: "Heap Total", value: metrics ? fmtMB(metrics.memory?.heapTotal) : "—" },
                { label: "RSS", value: metrics ? fmtMB(metrics.memory?.rss) : "—" },
                { label: "Uptime", value: metrics ? `${Math.floor(metrics.uptimeSeconds / 60)}m` : "—" },
                { label: "Load Avg", value: metrics?.loadAvg ? `${(metrics.loadAvg[0] || 0).toFixed(2)}` : "—" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px", borderRadius: 8 }} className="hover:bg-purple-50 transition-colors">
                  <span style={{ fontSize: 13, color: "#6b7280" }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 600, color: "#1e1b4b" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick actions */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.07 }} className="card-flat" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Activity size={14} className="text-green-500" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>Quick Actions</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Send Global Alert", desc: "Notify all managers", icon: Bell, color: "#d97706", bg: "#fffbeb", action: () => setAlertOpen(true) },
                { label: "Archive Old Notifications", desc: "Notifications older than 30 days", icon: Trash2, color: "#2563eb", bg: "#eff6ff", action: cleanup },
                { label: "Revoke All Sessions", desc: "Force everyone to re-login", icon: XCircle, color: "#dc2626", bg: "#fee2e2", action: revokeSessions },
              ].map(a => (
                <button key={a.label} onClick={a.action}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", borderRadius: 12, border: "1px solid #f3e8ff", background: "white", cursor: "pointer", textAlign: "left", transition: "all 0.18s", width: "100%" }}
                  className="hover:bg-purple-50 hover:border-purple-100 transition-colors">
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <a.icon size={14} style={{ color: a.color }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#1e1b4b" }}>{a.label}</p>
                    <p style={{ fontSize: 11, color: "#9ca3af" }}>{a.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* User breakdown — full width */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.14 }} className="card-flat" style={{ padding: 20, gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <UserCheck size={14} className="text-violet-500" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>User Breakdown</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {[
                { label: "Admins", value: userStats?.admins ?? 0, bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
                { label: "Managers", value: userStats?.managers ?? 0, bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
                { label: "Active", value: userStats?.active ?? 0, bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
                { label: "Suspended", value: userStats?.suspended ?? 0, bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
              ].map(s => (
                <div key={s.label} style={{ borderRadius: 12, padding: "16px", background: s.bg, border: `1px solid ${s.border}` }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: s.color, opacity: 0.7, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── USERS TAB ────────────────────────────────────────────────── */}
      {tab === "users" && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="card-flat" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3e8ff", display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={14} className="text-blue-500" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>{users.length} Users</span>
          </div>
          <table className="tbl w-full">
            <thead>
              <tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th style={{ textAlign: "right", paddingRight: 20 }}>Actions</th></tr>
            </thead>
            <tbody>
              {loading
                ? [0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} cols={5} />)
                : users.map((u, i) => (
                  <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1e1b4b" }}>{u.firstName} {u.lastName}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>@{u.username} · {u.email}</div>
                    </td>
                    <td><RoleBadge role={u.role} /></td>
                    <td><StatusBadge status={u.status} /></td>
                    <td style={{ fontSize: 12, color: "#9ca3af" }}>{u.createdAt ? timeAgo(u.createdAt) : "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingRight: 8 }}>
                        <select value={u.role} onChange={e => updateRole(u._id, e.target.value)}
                          style={{ fontSize: 11, border: "1px solid #f3e8ff", borderRadius: 8, padding: "3px 8px", color: "#6b7280", background: "white", cursor: "pointer" }}>
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                        </select>
                        <select value={u.status} onChange={e => updateStatus(u._id, e.target.value)}
                          style={{ fontSize: 11, border: "1px solid #f3e8ff", borderRadius: 8, padding: "3px 8px", color: "#6b7280", background: "white", cursor: "pointer" }}>
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* ── SYSTEM TAB ───────────────────────────────────────────────── */}
      {tab === "system" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Top row: health + stats + restart */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

            {/* Admin health */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="card-flat" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <HeartPulse size={14} className="text-green-500" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>Admin Health</span>
              </div>
              {systemLoading ? (
                <div className="h-8 shimmer" />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%",
                    background: adminHealthOk === null ? "#e5e7eb" : adminHealthOk ? "#10b981" : "#ef4444",
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: adminHealthOk === null ? "#9ca3af" : adminHealthOk ? "#059669" : "#dc2626" }}>
                    {adminHealthOk === null ? "Checking…" : adminHealthOk ? "Healthy" : "Unhealthy"}
                  </span>
                </div>
              )}
            </motion.div>

            {/* System stats */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.07 }} className="card-flat" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Activity size={14} className="text-violet-500" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>System Stats</span>
              </div>
              {systemLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[0, 1, 2].map(i => <div key={i} className="h-5 shimmer" />)}
                </div>
              ) : systemStats ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { label: "Users", value: systemStats.users ?? "—" },
                    { label: "Active Sessions", value: systemStats.activeSessions ?? "—" },
                    { label: "Notifications", value: systemStats.notifications ?? "—" },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{row.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1e1b4b", fontFamily: "monospace" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "#9ca3af" }}>No data</p>
              )}
            </motion.div>

            {/* Restart jobs */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.14 }} className="card-flat" style={{ padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Play size={14} className="text-violet-500" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>Background Jobs</span>
                </div>
                <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>Restart the background job workers if they appear stuck or unresponsive.</p>
              </div>
              <button onClick={restartJobs} disabled={restarting}
                style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 500, border: "none", cursor: restarting ? "not-allowed" : "pointer", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", color: "white", opacity: restarting ? 0.5 : 1 }}>
                {restarting ? <Spinner size="sm" /> : <RefreshCw size={12} />}
                {restarting ? "Restarting…" : "Restart Jobs"}
              </button>
            </motion.div>
          </div>

          {/* Logs viewer */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.21 }} className="card-flat" style={{ overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3e8ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Terminal size={14} className="text-slate-500" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>Recent Logs</span>
                <span style={{ fontSize: 11, color: "#9ca3af", background: "#f3e8ff", padding: "1px 7px", borderRadius: 6 }}>last {logs.length}</span>
              </div>
              <button onClick={() => loadSystem(true)} disabled={systemLoading}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8b5cf6", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                {systemLoading ? <Spinner size="sm" /> : <RefreshCw size={11} />} Reload
              </button>
            </div>

            {systemLoading ? (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-4 shimmer" style={{ opacity: 1 - i * 0.15 }} />)}
              </div>
            ) : logs.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <Terminal size={28} style={{ color: "#e9d5ff", margin: "0 auto 10px" }} />
                <p style={{ fontSize: 13, color: "#9ca3af" }}>No log entries found</p>
              </div>
            ) : (
              <div style={{
                background: "#0f172a",
                padding: "16px 20px",
                maxHeight: 420,
                overflowY: "auto",
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                fontSize: 11,
                lineHeight: 1.7,
              }}>
                {[...logs].reverse().map((line, i) => {
                  // Colour-code by level
                  let color = "#94a3b8";
                  if (line.includes("[error]") || line.includes("ERROR")) color = "#f87171";
                  else if (line.includes("[warn]") || line.includes("WARN")) color = "#fbbf24";
                  else if (line.includes("[info]") || line.includes("INFO")) color = "#86efac";
                  else if (line.includes("[debug]") || line.includes("DEBUG")) color = "#67e8f9";

                  return (
                    <div key={i} style={{ color, wordBreak: "break-all", paddingBottom: 2 }}>
                      {line}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Send alert modal */}
      <Modal open={alertOpen} onClose={() => setAlertOpen(false)} title="Send Global Alert" size="md">
        <div className="space-y-4">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a" }}>
            <AlertTriangle size={14} style={{ color: "#d97706", marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "#92400e" }}>This will send a notification to all managers.</p>
          </div>
          <textarea value={alertMsg} onChange={e => setAlertMsg(e.target.value)} rows={4}
            className="input" style={{ resize: "none" }} placeholder="Enter alert message…" />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setAlertOpen(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={sendAlert} disabled={sending || !alertMsg.trim()}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", background: "#f59e0b", color: "white", opacity: (!alertMsg.trim() || sending) ? 0.5 : 1 }}>
              {sending ? <Spinner size="sm" /> : <Bell size={13} />}
              {sending ? "Sending…" : "Send Alert"}
            </button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}