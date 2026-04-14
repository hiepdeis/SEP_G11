"use client";

import RoleGuard from "@/components/providers/role-guard";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={["Staff"]}>{children}</RoleGuard>;
}
