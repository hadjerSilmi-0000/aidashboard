"use client";
import { useState } from "react";
import { authApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Zap, UserPlus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({ firstName:"", lastName:"", username:"", email:"", password:"", role:"manager" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setF(p => ({...p, [k]: e.target.value}));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.firstName || !f.lastName || !f.username || !f.email || !f.password) { toast.error("All fields required"); return; }
    setLoading(true);
    try {
      await authApi.register(f);
      toast.success("Account created! Check your email to verify.");
      router.push("/auth/login");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity:0, y:20, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }}
      transition={{ duration:0.45, ease:[0.22,0.61,0.36,1] }} className="w-full max-w-md">
      <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden"
        style={{ boxShadow:"0 8px 40px rgba(139,92,246,0.12)" }}>
        <div className="h-1.5 bg-gradient-to-r from-violet-400 via-purple-500 to-violet-400" />
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-purple">
              <Zap size={22} className="text-white" />
            </div>
          </div>
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-[#1e1b4b]">Create account</h1>
            <p className="text-sm text-slate-400 mt-1">Join AI Dashboard</p>
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">First name</label>
                <input type="text" value={f.firstName} onChange={set("firstName")} className="input" placeholder="John" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Last name</label>
                <input type="text" value={f.lastName} onChange={set("lastName")} className="input" placeholder="Doe" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Username</label>
              <input type="text" value={f.username} onChange={set("username")} className="input" placeholder="johndoe" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email</label>
              <input type="email" value={f.email} onChange={set("email")} className="input" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Password</label>
              <div className="relative">
                <input type={show?"text":"password"} value={f.password} onChange={set("password")} className="input pr-10" placeholder="Min. 8 characters" />
                <button type="button" onClick={()=>setShow(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-purple-500">
                  {show ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Role</label>
              <select value={f.role} onChange={set("role")} className="input cursor-pointer">
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center !mt-5">
              {loading ? <Spinner size="sm"/> : <UserPlus size={15}/>}
              {loading ? "Creating…" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-5">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-violet-600 font-semibold hover:text-violet-800">Sign in</Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
