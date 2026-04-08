"use client";

import AdminLayout from "@/components/pages/admin/AdminLayout";
import { NotificationsProvider } from "@/components/pages/admin/NotificationsContext";
import AuthProvider from "@/components/providers/auth-provider";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      {children}
      <NotificationsProvider>
        <AdminLayout>{children}</AdminLayout>
      </NotificationsProvider>  
    </AuthProvider>
  );
}