"use client";

import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { useTranslation } from "react-i18next";
import { WarehousesTab } from "@/components/pages/admin/master-data/warehouses-tab";
import { useState } from "react";
import { BinsTab } from "@/components/pages/admin/master-data/bins-tab";

export default function WarehouseManagementPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"warehouses" | "bins">(
    "warehouses",
  );

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Warehouse Management")} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {t("Warehouse Management")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("Manage warehouses and their details.")}
              </p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("warehouses")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === "warehouses"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t("Warehouses")}
              </button>
              <button
                onClick={() => setActiveTab("bins")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === "bins"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t("Bins")}
              </button>
            </div>
          </div>

          <div className="p-0">
            {activeTab === "warehouses" ? (
              <WarehousesTab role="staff" viewOnly={true} />
            ) : (
              <BinsTab role="staff" viewOnly={true} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
