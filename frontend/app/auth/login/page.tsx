"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Zap, ArrowRight } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("Both fields are required"); return; }
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Invalid credentials";
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
      className="w-full max-w-sm"
    >
      <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden"
        style={{ boxShadow: "0 8px 40px rgba(139,92,246,0.12), 0 1px 0 rgba(255,255,255,0.8)" }}>
        {/* Purple top bar */}
        <div className="h-1.5 bg-gradient-to-r from-violet-400 via-purple-500 to-violet-400" />

        <div className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-7">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-purple">
              <Zap size={22} className="text-white" />
            </div>
          </div>

          <div className="text-center mb-7">
            <h1 className="text-xl font-bold text-[#1e1b4b]">Welcome back</h1>
            <p className="text-sm text-slate-400 mt-1">Sign in to AI Dashboard</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input" placeholder="you@example.com" autoComplete="email" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-500">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-violet-500 hover:text-violet-700 font-medium">Forgot?</Link>
              </div>
              <div className="relative">
                <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  className="input pr-10" placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-purple-500 transition-colors">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center mt-1">
              {loading ? <Spinner size="sm" /> : <ArrowRight size={15} />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            No account?{" "}
            <Link href="/auth/register" className="text-violet-600 font-semibold hover:text-violet-800">Sign up</Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
