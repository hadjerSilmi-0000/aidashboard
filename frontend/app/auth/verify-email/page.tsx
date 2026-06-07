"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, CheckCircle, XCircle, Loader2 } from "lucide-react";

function Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<"loading"|"success"|"error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setMsg("No verification token found."); return; }
    authApi.verifyEmail(token)
      .then(() => { setStatus("success"); setMsg("Email verified successfully!"); setTimeout(() => router.push("/auth/login"), 3000); })
      .catch(err => { setStatus("error"); setMsg(err?.response?.data?.message || "Verification failed. Token may be expired."); });
  }, [token, router]);

  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }} className="w-full max-w-sm">
      <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden text-center" style={{ boxShadow:"0 8px 40px rgba(139,92,246,0.12)" }}>
        <div className="h-1.5 bg-gradient-to-r from-violet-400 via-purple-500 to-violet-400" />
        <div className="p-10">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-purple">
              <Zap size={22} className="text-white" />
            </div>
          </div>
          {status === "loading" && (<>
            <Loader2 size={36} className="text-violet-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-bold text-[#1e1b4b]">Verifying…</h2>
            <p className="text-sm text-slate-400 mt-1">Please wait</p>
          </>)}
          {status === "success" && (<>
            <CheckCircle size={36} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#1e1b4b]">Email verified!</h2>
            <p className="text-sm text-slate-400 mt-1">{msg}</p>
            <p className="text-xs text-violet-400 mt-2">Redirecting to login…</p>
          </>)}
          {status === "error" && (<>
            <XCircle size={36} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#1e1b4b]">Verification failed</h2>
            <p className="text-sm text-slate-400 mt-1">{msg}</p>
            <Link href="/auth/login" className="btn-primary inline-flex mt-5 text-sm">Go to Login</Link>
          </>)}
        </div>
      </div>
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="bg-white rounded-2xl p-10 text-center text-slate-400">Loading…</div>}>
      <Content />
    </Suspense>
  );
}
