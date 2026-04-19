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
      const rolePathMap: Record<string, string> = {
        Admin: "/admin",
        Accountant: "/accountant",
        WarehouseManager: "/manager",
        ConstructionTeam: "/construction",
        WarehouseStaff: "/staff",
        Purchasing: "/purchasing",
      };

      const targetPath =
        rolePathMap[user.role] || `/${user.role.toLowerCase()}`;

      router.push(targetPath);
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
