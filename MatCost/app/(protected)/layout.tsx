"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/services/auth-service";
import { setAccessToken } from "@/lib/axios-client";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await authApi.getMe();
        setAccessToken(res.data.accessToken);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        router.push("/");
      }
    };

    verifySession();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
         <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-500">Checking permission...</p>
         </div>
      </div>
    );
  }

  return <>{children}</>;
}