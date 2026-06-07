"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { PageSpinner } from "@/components/ui/spinner";
import { motion } from "framer-motion";
import { authApi } from "@/lib/api";
import { Mail, X } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
}

function VerificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  // Only show if user exists and email is not verified
  if (dismissed || !user || user.emailVerified) return null;

  const resend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification(user.email);
      toast.success("Verification email sent!");
    } catch {
      toast.error("Failed to send email");
    } finally { setSending(false); }
  };

  return (
    <div style={{
      margin: "16px 28px 0",
      padding: "10px 16px",
      borderRadius: 12,
      background: "#fffbeb",
      border: "1px solid #fde68a",
      display: "flex", alignItems: "center", gap: 10,
      fontSize: 12,
    }}>
      <Mail size={14} style={{ color: "#d97706", flexShrink: 0 }} />
      <span style={{ color: "#92400e", flex: 1 }}>
        Email <strong>{user.email}</strong> is not verified — add{" "}
        <code style={{ background: "#fef3c7", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>
          REQUIRE_EMAIL_VERIFICATION=false
        </code>{" "}
        to your backend <code style={{ background: "#fef3c7", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>.env</code>{" "}
        to fully unlock the app.
      </span>
      <button onClick={resend} disabled={sending}
        style={{ fontSize: 11, fontWeight: 600, color: "#b45309", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}>
        {sending ? "Sending…" : "Resend email"}
      </button>
      <button onClick={() => setDismissed(true)}
        style={{ color: "#d97706", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
        <X size={12} />
      </button>
    </div>
  );
}

export function Shell({ children, adminOnly = false }: Props) {
  const { user, loading, emailNotVerified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // Redirect to login only if no user AND not in email-not-verified state
    if (!user && !emailNotVerified) {
      router.replace("/auth/login");
      return;
    }
    // Admin-only guard
    if (adminOnly && user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, loading, router, adminOnly, emailNotVerified]);

  if (loading) return <PageSpinner />;

  // Block render if truly not authenticated
  if (!user && !emailNotVerified) return null;

  // Admin guard
  if (adminOnly && user?.role !== "admin") return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f3ff" }}>
      <Sidebar />
      <Topbar />

      {/* Content area offset: sidebar=240px, topbar=56px */}
      <main style={{ paddingLeft: "240px", paddingTop: "56px", minHeight: "100vh" }}>
        {/* Show verification banner if email not verified */}
        {user && !user.emailVerified && <VerificationBanner />}

        <motion.div
          key={typeof window !== "undefined" ? window.location.pathname : "page"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{ padding: "24px 28px", maxWidth: 1360 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
