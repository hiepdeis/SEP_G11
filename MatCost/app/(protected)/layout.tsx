"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/services/auth-service";
import { setAccessToken } from "@/lib/axios-client";
import { FullPageSpinner } from "@/components/ui/custom/full-page-spinner";

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
        const token = res.data.accessToken;
        setAccessToken(token);
        if (typeof window !== "undefined") {
          (window as any).jwt = token;
        }
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        router.push("/");
      }
    };

    verifySession();
  }, [router]);

  if (isLoading) {
    return <FullPageSpinner />;
  }

  return <>{children}</>;
}