"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user?.role) {
      const role = user.role.toLowerCase();

      if (role.includes("admin")) {
        router.push("/admin");
      } else if (role.includes("accountant")) {
        router.push("/accountant");
      } else if (role.includes("manager")) {
        router.push("/manager");
      } else if (role.includes("staff")) {
        router.push("/staff");
      } else if (role.includes("construction")) {
        router.push("/construction");
      } else if (role.includes("purchasing")) {
        router.push("/purchasing");
      } else {
        router.push(`/${role}`);
      }
    }
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center gap-2 bg-slate-50">
        <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
        <span className="text-slate-700 font-medium">Authenticating...</span>
      </div>
    );
  }

  return null;
}