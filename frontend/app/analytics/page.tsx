"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/layout/shell";
import { analyticsApi, filesApi } from "@/lib/api";
import { cachedFetch } from "@/lib/cache";
import { Spinner } from "@/components/ui/spinner";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { BarChart3, TrendingUp, AlertTriangle, RefreshCw, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const PURPLES = ["#8b5cf6","#a78bfa","#c4b5fd","#7c3aed","#6d28d9"];
const TT = {
  contentStyle: { background:"#fff", border:"1.5px solid #e9d5ff", borderRadius:12, fontSize:12, color:"#1e1b4b", boxShadow:"0 4px 20px rgba(139,92,246,0.1)" },
  cursor: { fill:"rgba(139,92,246,0.05)" },
};

function AnalyticsContent() {
  const sp = useSearchParams();
  const [files, setFiles] = useState<any[]>([]);
  const [fileId, setFileId] = useState(sp.get("fileId") || "");
  const [overview, setOverview] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [range, setRange] = useState<"day"|"week"|"month">("day");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const filesFetched = useRef(false);
  const analyticsFetched = useRef("");

  // Load file list once
  useEffect(() => {
    if (filesFetched.current) return;
    filesFetched.current = true;
    cachedFetch("analytics:files", () => filesApi.list().then(r => r.data.files || []))
      .then(f => {
        setFiles(f as any[]);
        if (!fileId && (f as any[]).length) setFileId((f as any[])[0]._id);
      }).catch(() => {});
  }, []);

  // Load analytics when fileId or range changes — deduplicated
  useEffect(() => {
    if (!fileId) return;
    const key = `${fileId}:${range}`;
    if (analyticsFetched.current === key) return;
    analyticsFetched.current = key;
    setLoading(true);
    Promise.allSettled([
      cachedFetch(`analytics:overview:${fileId}`,    () => analyticsApi.fileOverview(fileId).then(r => r.data.data || []),        2*60_000),
      cachedFetch(`analytics:trends:${fileId}:${range}`, () => analyticsApi.fileTrends(fileId, range).then(r => r.data.data || []), 2*60_000),
      cachedFetch(`analytics:errors:${fileId}`,      () => analyticsApi.fileErrors(fileId).then(r => r.data.data || []),           2*60_000),
    ]).then(([ov, tr, er]) => {
      if (ov.status === "fulfilled") setOverview(ov.value as any[]);
      if (tr.status === "fulfilled") setTrends(tr.value as any[]);
      if (er.status === "fulfilled") setErrors(er.value as any[]);
    }).finally(() => setLoading(false));
  }, [fileId, range]);

  const runAnalytics = async () => {
    if (!fileId) return;
    setRunning(true);
    try {
      await analyticsApi.runAnalytics(fileId);
      toast.success("Analytics complete!");
      // Reset cache for this file so fresh data loads
      analyticsFetched.current = "";
    } catch { toast.error("Failed to run analytics"); }
    finally { setRunning(false); }
  };

  const empty = !loading && overview.length === 0 && trends.length === 0 && errors.length === 0;

  return (
    <Shell>
      <div style={{ marginBottom:24, display:"flex", flexWrap:"wrap", alignItems:"center", gap:12, justifyContent:"space-between" }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#1e1b4b" }}>Analytics</h2>
          <p style={{ fontSize:13, color:"#9ca3af", marginTop:2 }}>File insights and data trends</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <div style={{ position:"relative" }}>
            <select value={fileId} onChange={e => { setFileId(e.target.value); analyticsFetched.current=""; }}
              className="input" style={{ fontSize:13, paddingRight:32, minWidth:200, appearance:"none", cursor:"pointer" }}>
              <option value="">Select a file…</option>
              {files.map(f => <option key={f._id} value={f._id}>{f.originalName}</option>)}
            </select>
            <ChevronDown size={13} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", color:"#c4b5fd", pointerEvents:"none" }}/>
          </div>
          <div style={{ display:"flex", background:"white", border:"1px solid #f3e8ff", borderRadius:12, padding:4, gap:2 }}>
            {(["day","week","month"] as const).map(r => (
              <button key={r} onClick={() => { setRange(r); analyticsFetched.current=""; }}
                style={{
                  padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer",
                  border:"none", transition:"all 0.18s", textTransform:"capitalize",
                  background: range===r ? "#8b5cf6" : "transparent",
                  color: range===r ? "white" : "#94a3b8",
                }}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={runAnalytics} disabled={!fileId || running}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:10, fontSize:12, fontWeight:500, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#8b5cf6,#7c3aed)", color:"white", opacity: (!fileId||running)?0.4:1 }}>
            {running ? <Spinner size="sm"/> : <RefreshCw size={12}/>} Run
          </button>
        </div>
      </div>

      {!fileId ? (
        <div className="card-flat" style={{ padding:"64px 20px", textAlign:"center" }}>
          <BarChart3 size={36} style={{ color:"#e9d5ff", margin:"0 auto 12px" }}/>
          <p style={{ fontSize:13, color:"#9ca3af" }}>Select a file to view analytics</p>
        </div>
      ) : loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"80px 0" }}><Spinner size="lg"/></div>
      ) : empty ? (
        <div className="card-flat" style={{ padding:"64px 20px", textAlign:"center" }}>
          <BarChart3 size={36} style={{ color:"#e9d5ff", margin:"0 auto 12px" }}/>
          <p style={{ fontSize:13, color:"#9ca3af", marginBottom:4 }}>No analytics data yet</p>
          <p style={{ fontSize:12, color:"#d1d5db" }}>Process the file first, then click Run</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {overview.length > 0 && (
            <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }} className="card-flat" style={{ padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                <BarChart3 size={15} className="text-violet-500"/>
                <span style={{ fontSize:13, fontWeight:600, color:"#1e1b4b" }}>Data Overview by Type</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={overview} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff"/>
                  <XAxis dataKey="dataType" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false}/>
                  <Tooltip {...TT}/>
                  <Bar dataKey="totalRecords" radius={[5,5,0,0]}>
                    {overview.map((_:any, i:number) => <Cell key={i} fill={PURPLES[i % PURPLES.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {trends.length > 0 && (
            <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.07 }} className="card-flat" style={{ padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                <TrendingUp size={15} className="text-violet-500"/>
                <span style={{ fontSize:13, fontWeight:600, color:"#1e1b4b" }}>Data Volume Trends</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trends} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff"/>
                  <XAxis dataKey="_id" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={TT.contentStyle} cursor={{ stroke:"rgba(139,92,246,0.2)" }}/>
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#g1)" dot={{ fill:"#8b5cf6", r:3, strokeWidth:0 }}/>
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {errors.length > 0 && (
            <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.14 }} className="card-flat" style={{ padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                <AlertTriangle size={15} className="text-amber-500"/>
                <span style={{ fontSize:13, fontWeight:600, color:"#1e1b4b" }}>Top Validation Errors</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {errors.map((err:any, i:number) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:10 }} className="hover:bg-purple-50 transition-colors">
                    <div style={{ width:28, height:28, borderRadius:8, background:"#fffbeb", border:"1px solid #fde68a", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:"#d97706" }}>{i+1}</span>
                    </div>
                    <span style={{ flex:1, fontSize:13, color:"#6b7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{err._id || "Unknown field"}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:"#d97706", fontVariantNumeric:"tabular-nums" }}>{err.errorCount}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </Shell>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div style={{ display:"flex", justifyContent:"center", padding:"80px 0" }}><Spinner/></div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
