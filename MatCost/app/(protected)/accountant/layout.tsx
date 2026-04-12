"use client";

import RoleGuard from "@/components/providers/role-guard";

export default function AccountantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={["Accountant"]}>{children}</RoleGuard>;
}
