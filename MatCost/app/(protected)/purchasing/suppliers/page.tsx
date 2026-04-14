"use client";

import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { useTranslation } from "react-i18next";
import { SuppliersTab } from "@/components/pages/admin/master-data/suppliers-tab";

export default function SupplierManagementPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Supplier Management")} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {t("Supplier Management")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("Manage suppliers and their contracts.")}
              </p>
            </div>
          </div>

          <div className="p-0">
            <SuppliersTab viewOnly={true} role="purchasing" />
          </div>
        </div>
      </main>
    </div>
  );
}
