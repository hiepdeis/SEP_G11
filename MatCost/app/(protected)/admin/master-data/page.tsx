"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Shield,
  Layers,
  ClipboardList,
  Truck,
  Warehouse,
  MapPin,
  FolderKanban,
  Package,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";

// Tab Components
import { RolesTab } from "@/components/pages/admin/master-data/roles-tab";
import { CategoriesTab } from "@/components/pages/admin/master-data/categories-tab";
import { MaterialsTab } from "@/components/pages/admin/master-data/materials-tab";
import { SuppliersTab } from "@/components/pages/admin/master-data/suppliers-tab";
import { WarehousesTab } from "@/components/pages/admin/master-data/warehouses-tab";
import { BinsTab } from "@/components/pages/admin/master-data/bins-tab";
import { ProjectsTab } from "@/components/pages/admin/master-data/projects-tab";

// --- TABS DEFINITION ---
const tabs = [
  { key: "roles", label: "Roles", icon: Shield },
  { key: "categories", label: "Categories", icon: Layers },
  { key: "materials", label: "Materials", icon: Package },
  { key: "suppliers", label: "Suppliers", icon: Truck },
  { key: "warehouses", label: "Warehouses", icon: Warehouse },
  { key: "bins", label: "Bin Locations", icon: MapPin },
  { key: "projects", label: "Projects", icon: FolderKanban },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function MasterDataPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const initialTab = (searchParams.get("tab") as TabKey) || "roles";
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    const currentTab = searchParams.get("tab") as TabKey;
    if (currentTab && tabs.some((t) => t.key === currentTab)) {
      setTab(currentTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: TabKey) => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const ActiveTab = useMemo(() => {
    switch (tab) {
      case "roles":
        return RolesTab;
      case "materials":
        return MaterialsTab;
      case "categories":
        return CategoriesTab;
      case "suppliers":
        return SuppliersTab;
      case "warehouses":
        return WarehousesTab;
      case "bins":
        return BinsTab;
      case "projects":
        return ProjectsTab;
      default:
        return RolesTab;
    }
  }, [tab]);

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Master Data Management")} />
        <div className="flex-grow overflow-hidden flex flex-col p-6 lg:p-10">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {t("Master Data Management")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t(
                "Configure and manage system-wide parameters and reference data.",
              )}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl w-fit mb-6 overflow-x-auto no-scrollbar max-w-full border shadow-inner">
            {tabs.map((T) => (
              <Button
                key={T.key}
                variant={tab === T.key ? "default" : "ghost"}
                size="sm"
                onClick={() => handleTabChange(T.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  tab === T.key
                    ? "bg-white text-indigo-600 shadow-sm hover:bg-white"
                    : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50"
                }`}
              >
                <T.icon className="w-4 h-4" />
                {t(T.label)}
              </Button>
            ))}
          </div>

          <div className="flex-grow flex flex-col overflow-hidden">
            <ActiveTab />
          </div>
        </div>
      </main>
    </div>
  );
}
