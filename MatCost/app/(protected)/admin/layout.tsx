"use client";

import RoleGuard from "@/components/providers/role-guard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={["Admin"]}>{children}</RoleGuard>;
}
