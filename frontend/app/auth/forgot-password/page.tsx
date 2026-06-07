"use client";
import { useState } from "react";
import { authApi } from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Email required"); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send reset email");
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.4 }} className="w-full max-w-sm">
      <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden"
        style={{ boxShadow:"0 8px 40px rgba(139,92,246,0.12)" }}>
        <div className="h-1.5 bg-gradient-to-r from-violet-400 via-purple-500 to-violet-400" />
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-purple">
              <Zap size={22} className="text-white" />
            </div>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto">
                <CheckCircle size={26} className="text-green-500" />
              </div>
              <h2 className="text-lg font-bold text-[#1e1b4b]">Check your inbox</h2>
              <p className="text-sm text-slate-400">We sent a reset link to <span className="text-violet-600 font-medium">{email}</span></p>
              <Link href="/auth/login" className="btn-outline inline-flex mt-2 text-sm">
                <ArrowLeft size={14} /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-[#1e1b4b]">Reset password</h1>
                <p className="text-sm text-slate-400 mt-1">We'll send you a reset link</p>
              </div>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input" placeholder="you@example.com" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                  {loading ? <Spinner size="sm"/> : <Mail size={15}/>}
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
              <p className="text-center mt-5">
                <Link href="/auth/login" className="text-sm text-violet-500 hover:text-violet-700 font-medium inline-flex items-center gap-1">
                  <ArrowLeft size={13}/> Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
