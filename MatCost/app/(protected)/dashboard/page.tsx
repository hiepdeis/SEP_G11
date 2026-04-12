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
      router.push(`/${user.role.toLowerCase()}`);
    }
  }, [user]);

  if (isLoading) {
    return (
      <>
        <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
        <span className="text-slate-700">Authenticating...</span>
      </>
    );
  }

  return <></>;
}
