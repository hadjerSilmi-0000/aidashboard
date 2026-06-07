"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import toast from "react-hot-toast";

function Form() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || !confirm) { toast.error("Both fields required"); return; }
    if (pw !== confirm) { toast.error("Passwords don't match"); return; }
    if (!token) { toast.error("Invalid reset link"); return; }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password: pw });
      toast.success("Password reset! Please log in.");
      router.push("/auth/login");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Reset failed");
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }} className="w-full max-w-sm">
      <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden" style={{ boxShadow:"0 8px 40px rgba(139,92,246,0.12)" }}>
        <div className="h-1.5 bg-gradient-to-r from-violet-400 via-purple-500 to-violet-400" />
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-purple">
              <Zap size={22} className="text-white" />
            </div>
          </div>
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-[#1e1b4b]">New password</h1>
            <p className="text-sm text-slate-400 mt-1">Enter your new password</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {[{ label:"New Password", val:pw, setVal:setPw }, { label:"Confirm Password", val:confirm, setVal:setConfirm }].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{f.label}</label>
                <div className="relative">
                  <input type={show?"text":"password"} value={f.val} onChange={e=>f.setVal(e.target.value)}
                    className="input pr-10" placeholder="••••••••" />
                  <button type="button" onClick={()=>setShow(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-purple-500">
                    {show ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center !mt-5">
              {loading ? <Spinner size="sm"/> : <Lock size={15}/>}
              {loading ? "Resetting…" : "Reset Password"}
            </button>
          </form>
          <p className="text-center mt-5">
            <Link href="/auth/login" className="text-sm text-violet-500 hover:text-violet-700 font-medium inline-flex items-center gap-1">
              <ArrowLeft size={13}/> Back to login
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm bg-white rounded-2xl p-10 text-center text-slate-400">Loading…</div>}>
      <Form />
    </Suspense>
  );
}
