"use client";

import RoleGuard from "@/components/providers/role-guard";

export default function ConstructionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={["Construction"]}>{children}</RoleGuard>;
}
