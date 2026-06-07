"use client";
import { useState, useEffect, useRef } from "react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge, TypeBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { aiJobsApi, jobsApi } from "@/lib/api";
import { cachedFetch, cacheInvalidate } from "@/lib/cache";
import { BrainCircuit, Plus, RefreshCw, Activity, CheckCircle, Clock, XCircle, Play } from "lucide-react";
import { motion } from "framer-motion";
import { timeAgo } from "@/lib/utils";
import toast from "react-hot-toast";

const JOB_TYPES = [
  { value:"analysis",  label:"Data Analysis",     icon:"📊", desc:"Statistical summary" },
  { value:"insights",  label:"Generate Insights", icon:"💡", desc:"AI-powered insights" },
  { value:"patterns",  label:"Pattern Detection", icon:"🔍", desc:"Outliers & trends" },
  { value:"question",  label:"Ask a Question",    icon:"💬", desc:"Natural language Q&A" },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("analysis");
  const [dataset, setDataset] = useState('{"values": [1, 2, 3, 4, 5]}');
  const [question, setQuestion] = useState("");
  const [creating, setCreating] = useState(false);
  const fetched = useRef(false);

  const load = async (force = false) => {
    if (!force && fetched.current) return;
    fetched.current = true;
    try {
      const s = await cachedFetch("jobs:stats", () => jobsApi.getStats().then(r => r.data.stats), 2 * 60_000);
      setStats(s);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreating(true);
    try {
      let ds: any;
      try { ds = JSON.parse(dataset); } catch { toast.error("Invalid JSON"); return; }
      if (type === "question") {
        if (!question.trim()) { toast.error("Question required"); return; }
        ds = { question: question.trim(), context: ds };
      }
      const res = await aiJobsApi.create({ dataset: ds, type: type as any });
      toast.success("Job created!");
      setJobs(p => [{ ...res.data, type, createdAt: new Date() }, ...p]);
      cacheInvalidate("jobs:");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Failed to create job");
    } finally { setCreating(false); }
  };

  const checkStatus = async (id: string) => {
    try {
      const res = await aiJobsApi.getById(id);
      setJobs(p => p.map(j => (j._id===id||j.jobId===id ? res.data : j)));
    } catch { toast.error("Failed"); }
  };

  return (
    <Shell>
      <div style={{ marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#1e1b4b" }}>AI Jobs</h2>
          <p style={{ fontSize:13, color:"#9ca3af", marginTop:2 }}>Create and monitor AI analysis tasks</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => { fetched.current=false; load(true); }} className="btn-ghost text-xs flex items-center gap-1.5">
            <RefreshCw size={12}/> Refresh
          </button>
          <button onClick={() => setOpen(true)} className="btn-primary text-xs flex items-center gap-1.5">
            <Plus size={13}/> New Job
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
        <StatCard title="Waiting"   value={stats?.waiting   ?? 0} icon={Clock}        iconBg="bg-amber-50"  iconColor="text-amber-500"  delay={0}    />
        <StatCard title="Active"    value={stats?.active    ?? 0} icon={Activity}      iconBg="bg-violet-50" iconColor="text-violet-500" delay={0.07} />
        <StatCard title="Completed" value={stats?.completed ?? 0} icon={CheckCircle}   iconBg="bg-green-50"  iconColor="text-green-500"  delay={0.14} />
        <StatCard title="Failed"    value={stats?.failed    ?? 0} icon={XCircle}       iconBg="bg-red-50"    iconColor="text-red-500"    delay={0.21} />
      </div>

      <div className="card-flat" style={{ overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid #f3e8ff", display:"flex", alignItems:"center", gap:8 }}>
          <BrainCircuit size={14} className="text-violet-500"/>
          <span style={{ fontSize:13, fontWeight:600, color:"#1e1b4b" }}>AI Jobs ({jobs.length})</span>
        </div>
        {jobs.length === 0 ? (
          <div style={{ padding:"60px 20px", textAlign:"center" }}>
            <BrainCircuit size={36} style={{ color:"#e9d5ff", margin:"0 auto 12px" }}/>
            <p style={{ fontSize:13, color:"#9ca3af", marginBottom:8 }}>No AI jobs yet</p>
            <button onClick={() => setOpen(true)} style={{ fontSize:12, color:"#8b5cf6", fontWeight:500, background:"none", border:"none", cursor:"pointer" }}>
              Create your first job →
            </button>
          </div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Job ID</th><th>Type</th><th>Status</th><th>Created</th><th style={{ textAlign:"right", paddingRight:20 }}>Actions</th></tr></thead>
            <tbody>
              {jobs.map((job, i) => (
                <motion.tr key={job._id||job.jobId||i} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.04 }}>
                  <td style={{ fontFamily:"monospace", fontSize:11, color:"#94a3b8", maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {job._id || job.jobId || "—"}
                  </td>
                  <td><TypeBadge type={job.type||"analysis"}/></td>
                  <td><StatusBadge status={job.status||"pending"}/></td>
                  <td style={{ fontSize:12, color:"#9ca3af" }}>{job.createdAt ? timeAgo(job.createdAt) : "—"}</td>
                  <td style={{ textAlign:"right", paddingRight:16 }}>
                    <button onClick={() => checkStatus(job._id||job.jobId)}
                      style={{ width:28, height:28, borderRadius:8, border:"none", background:"transparent", cursor:"pointer", display:"inline-flex", alignItems:"center", justifyContent:"center", color:"#9ca3af" }}
                      className="hover:bg-purple-50 hover:text-violet-500 transition-colors" title="Refresh">
                      <RefreshCw size={12}/>
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create AI Job" size="lg">
        <div className="space-y-4">
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Job Type</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {JOB_TYPES.map(t => (
                <button key={t.value} onClick={() => setType(t.value)}
                  style={{
                    padding:"12px", borderRadius:12, textAlign:"left", cursor:"pointer", transition:"all 0.18s",
                    border: type===t.value ? "1.5px solid #a78bfa" : "1.5px solid #f3e8ff",
                    background: type===t.value ? "#f5f3ff" : "white",
                  }}>
                  <span style={{ fontSize:18 }}>{t.icon}</span>
                  <p style={{ fontSize:12, fontWeight:600, color: type===t.value?"#6d28d9":"#1e1b4b", marginTop:4 }}>{t.label}</p>
                  <p style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
          {type === "question" && (
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Question</label>
              <input value={question} onChange={e=>setQuestion(e.target.value)} className="input" placeholder="What is the average value?" />
            </div>
          )}
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
              Dataset (JSON){type==="question"?" / Context":""}
            </label>
            <textarea value={dataset} onChange={e=>setDataset(e.target.value)} rows={4}
              className="input" style={{ fontFamily:"monospace", fontSize:12, resize:"none" }} placeholder='{"values": [1, 2, 3]}'/>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", paddingTop:4 }}>
            <button onClick={() => setOpen(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={create} disabled={creating} className="btn-primary text-sm flex items-center gap-1.5">
              {creating ? <Spinner size="sm"/> : <Play size={13}/>}
              {creating ? "Creating…" : "Create Job"}
            </button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}
