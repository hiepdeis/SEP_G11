"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { MaterialsTab } from "../admin/master-data/materials-tab";
import { CategoriesTab } from "../admin/master-data/categories-tab";
import { useTranslation } from "react-i18next";

export default function MaterialManagementPage({
  role = "manager",
}: {
  role?: string;
}) {
  const [activeTab, setActiveTab] = useState<"materials" | "categories">(
    "materials",
  );
  const { t } = useTranslation();

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Material Management")} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {t("Material Management")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("Manage definitions, units, and inventory tracking.")}
              </p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("materials")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === "materials"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t("Materials")}
              </button>
              <button
                onClick={() => setActiveTab("categories")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === "categories"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t("Categories")}
              </button>
            </div>
          </div>

          <div className="p-0">
            {activeTab === "materials" ? (
              <MaterialsTab viewOnly={role === "staff"} role={role} />
            ) : (
              <CategoriesTab viewOnly={role === "staff"} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
