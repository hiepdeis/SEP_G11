"use client";

import RoleGuard from "@/components/providers/role-guard";

export default function PurchasingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={["Purchasing"]}>{children}</RoleGuard>;
}
