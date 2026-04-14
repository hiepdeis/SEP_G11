"use client";

import { useEffect, useState } from "react";
import { getAdminDashboard } from "@/services/admin-dashboard";
import {
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// --- TYPES ---
type LowStockMaterial = {
  materialId: number;
  code: string;
  name: string;
  unit: string;
  quantityOnHand: number;
  minStockLevel: number;
  warehouseName: string;
};

type RecentReceipt = {
  id: string;
  date: string;
  supplier?: string;
  warehouseName?: string;
  items?: number;
  status: string;
  statusKey?: string;
};

type RecentIssue = {
  id: string;
  date: string;
  project: string;
  items?: number;
  status: string;
  statusKey?: string;
};

type DashboardResponse = {
  summary: {
    totalMaterials: number;
    lowStockCount: number;
    todayReceipts: number;
    todayIssues: number;
  };
  lowStockMaterials: LowStockMaterial[];
  recentReceipts: RecentReceipt[];
  recentIssues?: RecentIssue[];
};

// --- CONSTANTS ---
const statusColor: Record<string, string> = {
  done: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  reject: "bg-red-50 text-red-700 border-red-100",
};

// --- UTILS ---
const stockPct = (qty: number, min: number) => Math.round((qty / min) * 100);

const urgencyColor = (pct: number) => {
  if (pct <= 30)
    return {
      bar: "bg-red-500",
      badge: "bg-red-100 text-red-700",
      label: "Critical",
    };
  if (pct <= 60)
    return {
      bar: "bg-amber-400",
      badge: "bg-amber-100 text-amber-700",
      label: "Low",
    };
  return {
    bar: "bg-blue-400",
    badge: "bg-blue-100 text-blue-700",
    label: "Warning",
  };
};

const mapStatusKey = (status: string) => {
  const s = status.toLowerCase();
  if (
    s.includes("đã nhập") ||
    s.includes("đã xuất") ||
    s.includes("approved") ||
    s.includes("completed") ||
    s.includes("done")
  ) {
    return "done";
  }
  if (s.includes("chờ") || s.includes("pending") || s.includes("submitted")) {
    return "pending";
  }
  if (s.includes("từ chối") || s.includes("reject") || s.includes("denied")) {
    return "reject";
  }
  return "pending";
};

const formatDateTime = (value: string, locale: string = "vi-VN") => {
  if (!value) return { date: "-", time: "-" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const parts = value.split(" ");
    return { date: parts[0] || value, time: parts[1] || "-" };
  }
  return {
    date: d.toLocaleDateString(locale),
    time: d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
  };
};

// --- PAGE COMPONENT ---
export default function DashboardPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const json = await getAdminDashboard();
        setData(json);
      } catch (error) {
        console.error(error);
        toast.error(t("Failed to load dashboard data"));
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return <div className="p-6 text-gray-500">{t("Loading data...")}</div>;
  }

  if (!data) {
    return <div className="p-6 text-gray-500">{t("No data.")}</div>;
  }

  const {
    summary,
    lowStockMaterials,
    recentReceipts,
    recentIssues = [],
  } = data;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Dashboard")} />
        
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t("System Overview")}
                </p>
                <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {t("Welcome Back")}!
                </h1>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {new Date().toLocaleDateString(i18n.language === "vi" ? "vi-VN" : "en-US", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              <Card className="border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Package className="w-6 h-6 text-indigo-600" />
                  </div>
                  <p className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {summary.totalMaterials}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">
                    {t("Total Materials")}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {summary.lowStockCount}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">
                    {t("Low stock")}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ArrowDownToLine className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {summary.todayReceipts}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">
                    {t("Today's Receipts")}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ArrowUpFromLine className="w-6 h-6 text-violet-600" />
                  </div>
                  <p className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {summary.todayIssues}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">
                    {t("Today's Issues")}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden mt-8">
              <CardHeader className="px-6 py-4 border-b border-slate-50 dark:border-slate-900 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <CardTitle className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      {t("Low Stock Alarm")}
                    </CardTitle>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {summary.lowStockCount} {t("materials require attention")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/admin/materials")}
                  className="rounded-full text-xs font-bold transition-all text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                >
                  {t("View all")} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y divide-slate-50 dark:divide-slate-900">
                  {lowStockMaterials.slice(0, 5).map((m) => {
                    const pct = stockPct(m.quantityOnHand, m.minStockLevel);
                    const { bar, badge, label } = urgencyColor(pct);

                    return (
                      <div
                        key={`${m.materialId}-${m.warehouseName}`}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {m.name}
                            </span>
                            <Badge variant="outline" className="text-[9px] font-medium border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-tighter h-5">
                              {m.code}
                            </Badge>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${badge}`}
                            >
                              {t(label)}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-full h-1.5 max-w-[200px]">
                              <div
                                className={`h-1.5 rounded-full ${bar}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                              {m.quantityOnHand} / {m.minStockLevel} <span className="text-slate-400 font-medium ml-1">{m.unit}</span>
                            </span>
                          </div>
                        </div>

                        <div className="text-right hidden sm:block px-4 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            {t("Warehouse")}
                          </p>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {m.warehouseName}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <Card className="border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
                <CardHeader className="px-6 py-4 border-b border-slate-50 dark:border-slate-900 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
                    <CardTitle className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      {t("Recent Receipts")}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/admin/purchase-orders")}
                    className="rounded-full text-xs font-bold transition-all text-indigo-600 hover:text-indigo-700"
                  >
                    {t("View all")} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="divide-y divide-slate-50 dark:divide-slate-900">
                    {recentReceipts.map((r) => {
                      const dt = formatDateTime(r.date, i18n.language === "vi" ? "vi-VN" : "en-US");
                      const statusKey = r.statusKey || mapStatusKey(r.status);

                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                                {r.id}
                              </span>
                              <Badge variant="outline" className={`text-[9px] font-bold uppercase border-none shadow-none ${statusColor[statusKey]}`}>
                                {t(r.status)}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 font-medium truncate">
                              {r.supplier || r.warehouseName || t("Location Not Specified")}
                            </p>
                          </div>

                          <div className="text-right shrink-0 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end font-black uppercase tracking-tighter">
                              <Clock className="w-3 h-3" />
                              {dt.time}
                            </p>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                              {dt.date}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
                <CardHeader className="px-6 py-4 border-b border-slate-50 dark:border-slate-900 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <ArrowUpFromLine className="w-5 h-5 text-violet-600" />
                    <CardTitle className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      {t("Recent Issues")}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/admin/outbound/issueSlip")}
                    className="rounded-full text-xs font-bold transition-all text-indigo-600 hover:text-indigo-700"
                  >
                    {t("View all")} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="divide-y divide-slate-50 dark:divide-slate-900">
                    {recentIssues.map((s) => {
                      const dt = formatDateTime(s.date, i18n.language === "vi" ? "vi-VN" : "en-US");
                      const statusKey = s.statusKey || mapStatusKey(s.status);

                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                                {s.id}
                              </span>
                              <Badge variant="outline" className={`text-[9px] font-bold uppercase border-none shadow-none ${statusColor[statusKey]}`}>
                                {t(s.status)}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 font-medium truncate">
                              {s.project || t("Project Not Specified")}
                            </p>
                          </div>

                          <div className="text-right shrink-0 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end font-black uppercase tracking-tighter">
                              <Clock className="w-3 h-3" />
                              {dt.time}
                            </p>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                              {dt.date}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
