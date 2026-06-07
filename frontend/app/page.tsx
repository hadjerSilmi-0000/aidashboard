"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    router.replace(token ? "/dashboard" : "/auth/login");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f3ff]">
      <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
    </div>
  );
}
