"use client";
import { ReactNode } from "react";
import { AuthProvider } from "./AuthContext";
import { NotificationsProvider } from "./NotificationsContext";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NotificationsProvider>
        {children}
        <Toaster position="top-right" richColors />
      </NotificationsProvider>
    </AuthProvider>
  );
}
