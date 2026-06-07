"use client";
import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { RoleBadge, StatusBadge } from "@/components/ui/badge";
import { User, Lock, Save, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState({ firstName: user?.firstName||"", lastName: user?.lastName||"", username: user?.username||"" });
  const [pw, setPw] = useState({ currentPassword:"", newPassword:"", confirm:"" });
  const [showPw, setShowPw] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await authApi.updateProfile(profile);
      await refreshUser();
      toast.success("Profile updated!");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Update failed"); }
    finally { setSavingProfile(false); }
  };

  const changePw = async () => {
    if (pw.newPassword !== pw.confirm) { toast.error("Passwords don't match"); return; }
    if (pw.newPassword.length < 8) { toast.error("Min. 8 characters"); return; }
    setSavingPw(true);
    try {
      await authApi.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success("Password changed!");
      setPw({ currentPassword:"", newPassword:"", confirm:"" });
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed"); }
    finally { setSavingPw(false); }
  };

  return (
    <Shell>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1e1b4b]">Profile</h2>
        <p className="text-sm text-slate-400 mt-0.5">Manage your account settings</p>
      </div>

      <div className="max-w-xl space-y-5">
        {/* Info card */}
        <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }} className="card-flat p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-violet-600">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1e1b4b]">{user?.firstName} {user?.lastName}</h3>
              <p className="text-sm text-slate-400">{user?.email}</p>
              <div className="flex gap-2 mt-1.5">
                {user?.role && <RoleBadge role={user.role}/>}
                {user?.status && <StatusBadge status={user.status}/>}
                {user?.emailVerified
                  ? <span className="badge bg-green-100 text-green-700">✓ Email verified</span>
                  : <span className="badge bg-red-100 text-red-600">✗ Not verified</span>
                }
              </div>
            </div>
          </div>
        </motion.div>

        {/* Edit profile */}
        <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.07 }} className="card-flat p-5">
          <div className="flex items-center gap-2 mb-4">
            <User size={14} className="text-violet-500"/>
            <span className="text-sm font-semibold text-[#1e1b4b]">Edit Profile</span>
          </div>
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">First Name</label>
                <input type="text" value={profile.firstName} onChange={e=>setProfile(p=>({...p,firstName:e.target.value}))} className="input"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Last Name</label>
                <input type="text" value={profile.lastName} onChange={e=>setProfile(p=>({...p,lastName:e.target.value}))} className="input"/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Username</label>
              <input type="text" value={profile.username} onChange={e=>setProfile(p=>({...p,username:e.target.value}))} className="input"/>
            </div>
            <div className="flex justify-end">
              <button onClick={saveProfile} disabled={savingProfile} className="btn-primary text-sm flex items-center gap-1.5">
                {savingProfile ? <Spinner size="sm"/> : <Save size={13}/>}
                {savingProfile ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Change password */}
        <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.14 }} className="card-flat p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={14} className="text-amber-500"/>
            <span className="text-sm font-semibold text-[#1e1b4b]">Change Password</span>
          </div>
          <div className="space-y-3.5">
            {[
              { k:"currentPassword", label:"Current Password", ph:"Current password" },
              { k:"newPassword",     label:"New Password",     ph:"New password (min. 8)" },
              { k:"confirm",         label:"Confirm Password", ph:"Repeat new password" },
            ].map(f => (
              <div key={f.k}>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{f.label}</label>
                <div className="relative">
                  <input type={showPw?"text":"password"} value={(pw as any)[f.k]}
                    onChange={e=>setPw(p=>({...p,[f.k]:e.target.value}))} className="input pr-10" placeholder={f.ph}/>
                  <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-purple-500">
                    {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <button onClick={changePw} disabled={savingPw||!pw.currentPassword||!pw.newPassword}
                className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-40">
                {savingPw ? <Spinner size="sm"/> : <Lock size={13}/>}
                {savingPw ? "Changing…" : "Change Password"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </Shell>
  );
}
