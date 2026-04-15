"use client";

import RoleGuard from "@/components/providers/role-guard";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={["Manager"]}>{children}</RoleGuard>;
}
