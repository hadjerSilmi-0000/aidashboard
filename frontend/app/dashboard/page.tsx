"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/ui/spinner";
import { filesApi, jobsApi, healthApi } from "@/lib/api";
import { cachedFetch } from "@/lib/cache";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { Files, BrainCircuit, CheckCircle, Activity, Zap } from "lucide-react";
import { timeAgo, formatDate } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [jobStats, setJobStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      cachedFetch("dashboard:files",    () => filesApi.list().then(r => r.data.files || []),    3 * 60_000),
      cachedFetch("dashboard:jobstats", () => jobsApi.getStats().then(r => r.data.stats),       3 * 60_000),
      cachedFetch("dashboard:health",   () => healthApi.check().then(r => r.data),              5 * 60_000),
    ]).then(([f, j, h]) => {
      if (!mounted) return;
      if (f.status === "fulfilled") setFiles(f.value as any[]);
      if (j.status === "fulfilled") setJobStats(j.value);
      if (h.status === "fulfilled") setHealth(h.value);
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const completed = files.filter(f => f.status === "completed").length;

  return (
    <Shell>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1e1b4b" }}>
          Hello, {user?.firstName} 👋
        </h2>
        <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
          {formatDate(new Date())} · Here's your overview
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
          {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard title="Total Files"  value={files.length}          icon={Files}       iconBg="bg-blue-50"   iconColor="text-blue-500"   delay={0}    />
          <StatCard title="Completed"    value={completed}             icon={CheckCircle} iconBg="bg-green-50"  iconColor="text-green-500"  delay={0.07} />
          <StatCard title="Active Jobs"  value={jobStats?.active ?? 0} icon={BrainCircuit} iconBg="bg-violet-50" iconColor="text-violet-500" delay={0.14} />
          <StatCard title="Jobs Total"   value={jobStats ? (jobStats.waiting+jobStats.active+jobStats.completed+jobStats.failed) : 0} icon={Activity} iconBg="bg-amber-50" iconColor="text-amber-500" delay={0.21} />
        </div>
      )}

      {/* Two-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>

        {/* Recent files */}
        <div className="card-flat" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3e8ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Files size={15} className="text-violet-500" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>Recent Files</span>
            </div>
            <Link href="/files" style={{ fontSize: 12, color: "#8b5cf6", fontWeight: 500, textDecoration: "none" }}>View all →</Link>
          </div>

          {loading ? (
            <div style={{ padding: 20 }} className="space-y-2">
              {[0,1,2,3].map(i => <div key={i} className="h-10 shimmer" />)}
            </div>
          ) : files.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <Files size={32} style={{ color: "#e9d5ff", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: "#9ca3af" }}>No files uploaded yet</p>
              <Link href="/files" style={{ fontSize: 12, color: "#8b5cf6", fontWeight: 500 }}>Upload your first file →</Link>
            </div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Uploaded</th></tr></thead>
              <tbody>
                {files.slice(0,6).map((file, i) => (
                  <motion.tr key={file._id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.04 }}>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500, color: "#1e1b4b", fontSize: 12 }}>
                      {file.originalName}
                    </td>
                    <td><span style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", color: "#94a3b8", background: "#f8fafc", padding: "2px 6px", borderRadius: 4 }}>{file.fileType}</span></td>
                    <td><StatusBadge status={file.status} /></td>
                    <td style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>{timeAgo(file.createdAt)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Job queue */}
          <div className="card-flat" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Activity size={14} className="text-violet-500" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>Job Queue</span>
            </div>
            {loading ? (
              <div className="space-y-2">{[0,1,2,3].map(i=><div key={i} className="h-7 shimmer"/>)}</div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { label:"Waiting",   value: jobStats?.waiting   ?? 0, color:"#f59e0b" },
                    { label:"Active",    value: jobStats?.active    ?? 0, color:"#8b5cf6" },
                    { label:"Completed", value: jobStats?.completed ?? 0, color:"#10b981" },
                    { label:"Failed",    value: jobStats?.failed    ?? 0, color:"#ef4444" },
                  ].map(row => (
                    <div key={row.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 8px", borderRadius:8 }}
                      className="hover:bg-purple-50 transition-colors">
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:row.color }} />
                        <span style={{ fontSize:13, color:"#6b7280" }}>{row.label}</span>
                      </div>
                      <span style={{ fontSize:13, fontWeight:700, color:"#1e1b4b", fontVariantNumeric:"tabular-nums" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <Link href="/jobs" style={{ display:"block", textAlign:"center", fontSize:12, color:"#8b5cf6", fontWeight:500, marginTop:12, padding:"6px 0", borderRadius:8, textDecoration:"none" }}
                  className="hover:bg-purple-50 transition-colors">
                  View all jobs →
                </Link>
              </>
            )}
          </div>

          {/* System health */}
          <div className="card-flat" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Zap size={14} className="text-green-500" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>System Health</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: health?.status === "healthy" ? "#10b981" : "#ef4444", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 13, color: "#6b7280", textTransform: "capitalize" }}>{health?.status ?? "Checking…"}</span>
            </div>
            {health?.health?.services && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(health.health.services).map(([name, svc]: [string, any]) => (
                  <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "#9ca3af", textTransform: "capitalize" }}>{name}</span>
                    <span style={{ fontWeight: 600, color: svc.status === "healthy" ? "#059669" : "#dc2626" }}>{svc.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
