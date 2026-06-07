"use client";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoadingPage } from "@/components/ui/loading";
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.push("/auth/login"); }, [user, loading, router]);
  if (loading) return <LoadingPage />;
  if (!user) return null;
  return (
    <div className="min-h-screen">
      <Sidebar />
      <Topbar />
      <main className="pl-64 pt-16 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
