"use client";

import SupplierDetailPage from "@/components/pages/suppliers/detail/page";

export default function PurchasingSupplierDetailPage() {
  return (
    <>
      <SupplierDetailPage viewOnly={true} role="purchasing" />
    </>
  );
}
