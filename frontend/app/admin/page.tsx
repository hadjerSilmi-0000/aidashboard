"use client";
import { useState, useEffect, useRef } from "react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { RoleBadge, StatusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Spinner, SkeletonRow } from "@/components/ui/spinner";
import { adminApi } from "@/lib/api";
import { cachedFetch, cacheInvalidate } from "@/lib/cache";
import { Shield, Users, Activity, Cpu, Bell, Trash2, XCircle, RefreshCw, AlertTriangle, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { timeAgo } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AdminPage() {
  const [overview, setOverview] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview"|"users">("overview");
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [sending, setSending] = useState(false);
  const fetched = useRef(false);

  const load = async (force = false) => {
    if (!force && fetched.current) return;
    fetched.current = true;
    setLoading(true);
    try {
      const ttl = 3 * 60_000;
      const [ovRes, usRes, meRes, ulRes] = await Promise.all([
        cachedFetch("admin:overview",   () => adminApi.overview().then(r => r.data.data),           ttl),
        cachedFetch("admin:userstats",  () => adminApi.getUserStats().then(r => r.data.data),       ttl),
        cachedFetch("admin:metrics",    () => adminApi.metrics().then(r => r.data.data),            ttl),
        cachedFetch("admin:users",      () => adminApi.listUsers().then(r => r.data.data?.users || []), ttl),
      ]);
      setOverview(ovRes);
      setUserStats(usRes);
      setMetrics(meRes);
      setUsers(ulRes as any[]);
    } catch { toast.error("Failed to load admin data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const refresh = () => {
    cacheInvalidate("admin:");
    fetched.current = false;
    load(true);
  };

  const sendAlert = async () => {
    if (!alertMsg.trim()) { toast.error("Message required"); return; }
    setSending(true);
    try { await adminApi.sendAlert(alertMsg); toast.success("Alert sent!"); setAlertMsg(""); setAlertOpen(false); }
    catch { toast.error("Failed"); }
    finally { setSending(false); }
  };

  const cleanup = async () => {
    try { await adminApi.cleanup(); toast.success("Cleanup done"); }
    catch { toast.error("Cleanup failed"); }
  };

  const revokeSessions = async () => {
    try { await adminApi.revokeSessions(); toast.success("All sessions revoked"); }
    catch { toast.error("Failed"); }
  };

  const updateRole = async (userId: string, role: string) => {
    try {
      await adminApi.updateUserRole(userId, role);
      setUsers(p => p.map(u => u._id===userId ? {...u,role} : u));
      cacheInvalidate("admin:users");
      toast.success("Role updated");
    } catch { toast.error("Failed"); }
  };

  const updateStatus = async (userId: string, status: string) => {
    try {
      await adminApi.updateUserStatus(userId, status);
      setUsers(p => p.map(u => u._id===userId ? {...u,status} : u));
      cacheInvalidate("admin:users");
      toast.success("Status updated");
    } catch { toast.error("Failed"); }
  };

  const fmtMB = (b: number) => `${((b||0)/1024/1024).toFixed(1)} MB`;

  return (
    <Shell adminOnly>
      <div style={{ marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:12, background:"#fffbeb", border:"1px solid #fde68a", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Shield size={16} style={{ color:"#d97706" }}/>
          </div>
          <div>
            <h2 style={{ fontSize:20, fontWeight:700, color:"#1e1b4b" }}>Admin Panel</h2>
            <p style={{ fontSize:13, color:"#9ca3af" }}>System management</p>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => setAlertOpen(true)} className="btn-ghost text-xs flex items-center gap-1.5" style={{ color:"#d97706", borderColor:"#fde68a" }}>
            <Bell size={12}/> Send Alert
          </button>
          <button onClick={refresh} className="btn-ghost text-xs flex items-center gap-1.5">
            <RefreshCw size={12}/> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
        <StatCard title="Total Users"    value={overview?.users        ?? 0} icon={Users}    iconBg="bg-blue-50"   iconColor="text-blue-500"   delay={0}    />
        <StatCard title="Active Sessions" value={overview?.sessions   ?? 0} icon={Activity} iconBg="bg-green-50"  iconColor="text-green-500"  delay={0.07} />
        <StatCard title="Notifications"  value={overview?.notifications ?? 0} icon={Bell}   iconBg="bg-amber-50"  iconColor="text-amber-500"  delay={0.14} />
        <StatCard title="Admins"         value={userStats?.admins     ?? 0} icon={Shield}   iconBg="bg-violet-50" iconColor="text-violet-500" delay={0.21} />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:"white", border:"1px solid #f3e8ff", borderRadius:12, padding:4, gap:4, width:"fit-content", marginBottom:20 }}>
        {[{ k:"overview", label:"Overview" }, { k:"users", label:"Users" }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            style={{
              padding:"6px 16px", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", border:"none", transition:"all 0.18s",
              background: tab===t.k ? "#8b5cf6" : "transparent",
              color: tab===t.k ? "white" : "#94a3b8",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          {/* Metrics */}
          <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }} className="card-flat" style={{ padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <Cpu size={14} className="text-violet-500"/>
              <span style={{ fontSize:13, fontWeight:600, color:"#1e1b4b" }}>System Metrics</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              {[
                { label:"Heap Used",  value: metrics ? fmtMB(metrics.memory?.heapUsed)  : "—" },
                { label:"Heap Total", value: metrics ? fmtMB(metrics.memory?.heapTotal) : "—" },
                { label:"RSS",        value: metrics ? fmtMB(metrics.memory?.rss)        : "—" },
                { label:"Uptime",     value: metrics ? `${Math.floor(metrics.uptimeSeconds/60)}m` : "—" },
                { label:"Load Avg",   value: metrics?.loadAvg ? `${(metrics.loadAvg[0]||0).toFixed(2)}` : "—" },
              ].map(row => (
                <div key={row.label} style={{ display:"flex", justifyContent:"space-between", padding:"8px", borderRadius:8 }} className="hover:bg-purple-50 transition-colors">
                  <span style={{ fontSize:13, color:"#6b7280" }}>{row.label}</span>
                  <span style={{ fontSize:13, fontFamily:"monospace", fontWeight:600, color:"#1e1b4b" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick actions */}
          <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.07 }} className="card-flat" style={{ padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <Activity size={14} className="text-green-500"/>
              <span style={{ fontSize:13, fontWeight:600, color:"#1e1b4b" }}>Quick Actions</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { label:"Send Global Alert",          desc:"Notify all managers",             icon:Bell,    color:"#d97706", bg:"#fffbeb", action:() => setAlertOpen(true) },
                { label:"Archive Old Notifications",  desc:"Notifications older than 30 days", icon:Trash2, color:"#2563eb", bg:"#eff6ff", action:cleanup },
                { label:"Revoke All Sessions",        desc:"Force everyone to re-login",       icon:XCircle, color:"#dc2626", bg:"#fee2e2", action:revokeSessions },
              ].map(a => (
                <button key={a.label} onClick={a.action}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"12px", borderRadius:12, border:"1px solid #f3e8ff", background:"white", cursor:"pointer", textAlign:"left", transition:"all 0.18s", width:"100%" }}
                  className="hover:bg-purple-50 hover:border-purple-100 transition-colors">
                  <div style={{ width:32, height:32, borderRadius:8, background:a.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <a.icon size={14} style={{ color:a.color }}/>
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:500, color:"#1e1b4b" }}>{a.label}</p>
                    <p style={{ fontSize:11, color:"#9ca3af" }}>{a.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* User breakdown — full width */}
          <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.14 }} className="card-flat" style={{ padding:20, gridColumn:"1 / -1" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <UserCheck size={14} className="text-violet-500"/>
              <span style={{ fontSize:13, fontWeight:600, color:"#1e1b4b" }}>User Breakdown</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              {[
                { label:"Admins",    value:userStats?.admins    ?? 0, bg:"#fffbeb", color:"#b45309", border:"#fde68a" },
                { label:"Managers",  value:userStats?.managers  ?? 0, bg:"#f5f3ff", color:"#6d28d9", border:"#ddd6fe" },
                { label:"Active",    value:userStats?.active    ?? 0, bg:"#f0fdf4", color:"#15803d", border:"#bbf7d0" },
                { label:"Suspended", value:userStats?.suspended ?? 0, bg:"#fef2f2", color:"#b91c1c", border:"#fecaca" },
              ].map(s => (
                <div key={s.label} style={{ borderRadius:12, padding:"16px", background:s.bg, border:`1px solid ${s.border}` }}>
                  <div style={{ fontSize:24, fontWeight:700, color:s.color, fontVariantNumeric:"tabular-nums" }}>{s.value}</div>
                  <div style={{ fontSize:12, fontWeight:500, color:s.color, opacity:0.7, marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {tab === "users" && (
        <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }} className="card-flat" style={{ overflow:"hidden" }}>
          <div style={{ padding:"14px 20px", borderBottom:"1px solid #f3e8ff", display:"flex", alignItems:"center", gap:8 }}>
            <Users size={14} className="text-blue-500"/>
            <span style={{ fontSize:13, fontWeight:600, color:"#1e1b4b" }}>{users.length} Users</span>
          </div>
          <table className="tbl w-full">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th style={{ textAlign:"right", paddingRight:20 }}>Actions</th></tr></thead>
            <tbody>
              {loading
                ? [0,1,2,3,4].map(i => <SkeletonRow key={i} cols={5}/>)
                : users.map((u, i) => (
                  <motion.tr key={u._id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.03 }}>
                    <td>
                      <div style={{ fontSize:12, fontWeight:600, color:"#1e1b4b" }}>{u.firstName} {u.lastName}</div>
                      <div style={{ fontSize:10, color:"#9ca3af" }}>@{u.username} · {u.email}</div>
                    </td>
                    <td><RoleBadge role={u.role}/></td>
                    <td><StatusBadge status={u.status}/></td>
                    <td style={{ fontSize:12, color:"#9ca3af" }}>{u.createdAt ? timeAgo(u.createdAt) : "—"}</td>
                    <td>
                      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", paddingRight:8 }}>
                        <select value={u.role} onChange={e => updateRole(u._id, e.target.value)}
                          style={{ fontSize:11, border:"1px solid #f3e8ff", borderRadius:8, padding:"3px 8px", color:"#6b7280", background:"white", cursor:"pointer" }}>
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                        </select>
                        <select value={u.status} onChange={e => updateStatus(u._id, e.target.value)}
                          style={{ fontSize:11, border:"1px solid #f3e8ff", borderRadius:8, padding:"3px 8px", color:"#6b7280", background:"white", cursor:"pointer" }}>
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

      <Modal open={alertOpen} onClose={() => setAlertOpen(false)} title="Send Global Alert" size="md">
        <div className="space-y-4">
          <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 12px", borderRadius:10, background:"#fffbeb", border:"1px solid #fde68a" }}>
            <AlertTriangle size={14} style={{ color:"#d97706", marginTop:1, flexShrink:0 }}/>
            <p style={{ fontSize:12, color:"#92400e" }}>This will send a notification to all managers.</p>
          </div>
          <textarea value={alertMsg} onChange={e => setAlertMsg(e.target.value)} rows={4}
            className="input" style={{ resize:"none" }} placeholder="Enter alert message…"/>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button onClick={() => setAlertOpen(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={sendAlert} disabled={sending || !alertMsg.trim()}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:10, fontSize:13, fontWeight:500, border:"none", cursor:"pointer", background:"#f59e0b", color:"white", opacity:(!alertMsg.trim()||sending)?0.5:1 }}>
              {sending ? <Spinner size="sm"/> : <Bell size={13}/>}
              {sending ? "Sending…" : "Send Alert"}
            </button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}
