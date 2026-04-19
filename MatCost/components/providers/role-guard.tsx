"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FullPageSpinner } from "@/components/ui/custom/full-page-spinner";

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [isBypassed, setIsBypassed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("DEV_BYPASS_ROLE") === "true";
    }
    return false;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "X") {
        setIsBypassed((prev) => {
          const newState = !prev;
          if (newState) {
            localStorage.setItem("DEV_BYPASS_ROLE", "true");
            console.log("[RoleGuard] Bypass: ON");
          } else {
            localStorage.removeItem("DEV_BYPASS_ROLE");
            console.log("[RoleGuard] Bypass: OFF");
          }
          return newState;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isAuthorized =
    isAuthenticated &&
    user &&
    allowedRoles.some((allowedRole) =>
      user.role.toLowerCase().includes(allowedRole.toLowerCase()),
    );

  const hasAccess = isAuthorized || isBypassed;

  useEffect(() => {
    if (!isLoading && !hasAccess) {
      router.replace("/");
    }
  }, [isLoading, hasAccess, router]);

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
