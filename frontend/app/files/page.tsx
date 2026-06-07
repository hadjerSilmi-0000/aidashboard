"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Shell } from "@/components/layout/shell";
import { StatusBadge, TypeBadge } from "@/components/ui/badge";
import { Confirm } from "@/components/ui/modal";
import { Spinner, SkeletonRow } from "@/components/ui/spinner";
import { filesApi, jobsApi } from "@/lib/api";
import { cacheInvalidate } from "@/lib/cache";
import { formatBytes, timeAgo } from "@/lib/utils";
import { Upload, Trash2, Play, Eye, RefreshCw, Files } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Link from "next/link";

export default function FilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [enqueueing, setEnqueueing] = useState<string | null>(null);
  const fetched = useRef(false);

  const load = useCallback(async (force = false) => {
    // Only skip if already fetched AND not forced
    if (!force && fetched.current) return;
    fetched.current = true; // set true before request so concurrent calls skip
    setLoading(true);
    try {
      const r = await filesApi.list();
      setFiles(r.data.files || []);
    } catch {
      toast.error("Failed to load files");
      fetched.current = false; // allow retry on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted[0]) return;
    setUploading(true); setProgress(0);
    try {
      await filesApi.upload(accepted[0], p => setProgress(p));
      toast.success(`"${accepted[0].name}" uploaded`);
      cacheInvalidate("dashboard:files");
      fetched.current = false;
      load(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Upload failed");
    } finally { setUploading(false); setProgress(0); }
  }, [load]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false,
    accept: {
      "text/csv": [".csv"], "application/json": [".json"],
      "application/pdf": [".pdf"], "text/plain": [".txt"],
      "image/*": [".png", ".jpg", ".jpeg"],
    },
  });

  const handleDelete = async (id: string) => {
    try {
      await filesApi.delete(id);
      setFiles(p => p.filter(f => f._id !== id));
      cacheInvalidate("dashboard:files");
      toast.success("Deleted");
    } catch { toast.error("Delete failed"); }
  };

  const handleEnqueue = async (fileId: string) => {
    setEnqueueing(fileId);
    try {
      await jobsApi.enqueue(fileId);
      toast.success("Job enqueued!");
      cacheInvalidate("dashboard:jobstats");
      fetched.current = false;
      load(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Enqueue failed");
    } finally { setEnqueueing(null); }
  };

  const dropBorder = isDragActive ? "#a78bfa" : "#e9d5ff";
  const dropBg     = isDragActive ? "#f5f3ff" : "white";

  return (
    <Shell>
      <div style={{ marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#1e1b4b" }}>Files</h2>
          <p style={{ fontSize:13, color:"#9ca3af", marginTop:2 }}>Upload and manage your data files</p>
        </div>
        <button onClick={() => { fetched.current=false; load(true); }}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:10, fontSize:12, fontWeight:500, border:"1.5px solid #e9d5ff", background:"white", color:"#6b7280", cursor:"pointer" }}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* Dropzone */}
      <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }} style={{ marginBottom:24 }}>
        <div {...getRootProps()} style={{
          background: dropBg, borderRadius:16, border:`2px dashed ${dropBorder}`,
          padding:"40px 20px", textAlign:"center", cursor: uploading?"not-allowed":"pointer",
          transition:"all 0.2s", opacity: uploading?0.6:1,
        }}>
          <input {...getInputProps()} />
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
            <div style={{
              width:52, height:52, borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center",
              background: isDragActive ? "#ede9fe" : "#f5f3ff",
              transition:"all 0.2s", transform: isDragActive ? "scale(1.1)" : "scale(1)",
            }}>
              <Upload size={22} style={{ color: isDragActive?"#8b5cf6":"#c4b5fd" }}/>
            </div>
            {uploading ? (
              <div style={{ width:"100%", maxWidth:280 }}>
                <p style={{ fontSize:13, color:"#6b7280", marginBottom:8 }}>Uploading… {progress}%</p>
                <div style={{ height:6, background:"#ede9fe", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", background:"linear-gradient(90deg,#8b5cf6,#a78bfa)", borderRadius:99, width:`${progress}%`, transition:"width 0.3s" }}/>
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize:14, fontWeight:600, color:"#1e1b4b" }}>{isDragActive ? "Drop to upload" : "Drop a file or click to browse"}</p>
                <p style={{ fontSize:12, color:"#9ca3af" }}>CSV, JSON, PDF, TXT, Images · Max 20 MB</p>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <div className="card-flat" style={{ overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid #f3e8ff", display:"flex", alignItems:"center", gap:8 }}>
          <Files size={15} className="text-violet-500"/>
          <span style={{ fontSize:13, fontWeight:600, color:"#1e1b4b" }}>{files.length} file{files.length !== 1 ? "s" : ""}</span>
        </div>

        {!loading && files.length === 0 ? (
          <div style={{ padding:"60px 20px", textAlign:"center" }}>
            <Files size={36} style={{ color:"#e9d5ff", margin:"0 auto 12px" }}/>
            <p style={{ fontSize:13, color:"#9ca3af" }}>No files yet — drop one above.</p>
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table className="tbl" style={{ width:"100%" }}>
              <thead>
                <tr>
                  <th>Name</th><th>Type</th><th>Size</th>
                  <th>Status</th><th>Uploaded</th>
                  <th style={{ textAlign:"right", paddingRight:20 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [0,1,2,3,4].map(i => <SkeletonRow key={i} cols={6}/>)
                  : files.map((file, i) => (
                    <motion.tr key={file._id} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.035 }}>
                      <td style={{ maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:500, color:"#1e1b4b", fontSize:12 }}>
                        {file.originalName}
                      </td>
                      <td><TypeBadge type={file.fileType || "other"}/></td>
                      <td style={{ fontFamily:"monospace", fontSize:11, color:"#94a3b8" }}>{formatBytes(file.size || 0)}</td>
                      <td><StatusBadge status={file.status}/></td>
                      <td style={{ fontSize:12, color:"#9ca3af", whiteSpace:"nowrap" }}>{timeAgo(file.createdAt)}</td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end", paddingRight:8 }}>
                          {["uploaded","failed"].includes(file.status) && (
                            <button onClick={() => handleEnqueue(file._id)} disabled={enqueueing === file._id}
                              title="Process"
                              style={{ width:28, height:28, borderRadius:8, border:"none", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#a78bfa" }}
                              className="hover:bg-violet-50 transition-colors">
                              {enqueueing === file._id ? <RefreshCw size={12} className="animate-spin"/> : <Play size={12}/>}
                            </button>
                          )}
                          <Link href={`/analytics?fileId=${file._id}`} title="Analytics"
                            style={{ width:28, height:28, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"#94a3b8", textDecoration:"none" }}
                            className="hover:bg-purple-50 hover:text-violet-500 transition-colors">
                            <Eye size={12}/>
                          </Link>
                          <button onClick={() => setDeleteId(file._id)} title="Delete"
                            style={{ width:28, height:28, borderRadius:8, border:"none", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#d1d5db" }}
                            className="hover:bg-red-50 hover:text-red-400 transition-colors">
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Confirm open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete File" message="This will permanently delete the file and all associated data." danger/>
    </Shell>
  );
}
