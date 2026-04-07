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
const statusStyle: Record<string, string> = {
  done: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  reject: "bg-red-100 text-red-600",
};

// --- UTILS ---
const stockPct = (qty: number, min: number) => Math.round((qty / min) * 100);

const urgencyColor = (pct: number) => {
  if (pct <= 30)
    return {
      bar: "bg-red-500",
      badge: "bg-red-100 text-red-700",
      label: "Nguy cấp",
    };
  if (pct <= 60)
    return {
      bar: "bg-amber-400",
      badge: "bg-amber-100 text-amber-700",
      label: "Thấp",
    };
  return {
    bar: "bg-blue-400",
    badge: "bg-blue-100 text-blue-700",
    label: "Cảnh báo",
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

const formatDateTime = (value: string) => {
  if (!value) return { date: "-", time: "-" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const parts = value.split(" ");
    return { date: parts[0] || value, time: parts[1] || "-" };
  }
  return {
    date: d.toLocaleDateString("vi-VN"),
    time: d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
  };
};

// --- PAGE COMPONENT ---
export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
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
        toast.error("Không tải được dữ liệu dashboard");
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return <div className="p-6 text-gray-500">Đang tải dữ liệu...</div>;
  }

  if (!data) {
    return <div className="p-6 text-gray-500">Không có dữ liệu.</div>;
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
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {t("Dashboard")}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {t("Warehouse overview")} —{" "}
                {new Date().toLocaleDateString("vi-VN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.totalMaterials}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{t("Total Materials")}</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.lowStockCount}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{t("Low stock")}</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
                  <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.todayReceipts}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{t("Today's Receipts")}</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center mb-3">
                  <ArrowUpFromLine className="w-5 h-5 text-violet-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.todayIssues}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{t("Today's Issues")}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-6">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="font-semibold text-gray-900">
                    {t("Low Stock Alarm")}
                  </span>
                  <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                    {summary.lowStockCount} {t("materials")}
                  </span>
                </div>
                <button
                  onClick={() => router.push("/admin/materials")}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                >
                  {t("View all")} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-gray-50">
                {lowStockMaterials.map((m) => {
                  const pct = stockPct(m.quantityOnHand, m.minStockLevel);
                  const { bar, badge, label } = urgencyColor(pct);

                  return (
                    <div
                      key={`${m.materialId}-${m.warehouseName}`}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {m.name}
                          </span>
                          <span className="text-xs text-gray-400">{m.code}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge}`}
                          >
                            {t(label)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[120px]">
                            <div
                              className={`h-1.5 rounded-full ${bar}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {m.quantityOnHand} / {m.minStockLevel} {m.unit}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
                        {m.warehouseName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-gray-900">
                      {t("Recent Receipts")}
                    </span>
                  </div>
                  <button
                    onClick={() => router.push("/admin/purchase-orders")}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    {t("View all")} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-gray-50">
                  {recentReceipts.map((r) => {
                    const dt = formatDateTime(r.date);
                    const statusKey = r.statusKey || mapStatusKey(r.status);

                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-blue-600">
                              {r.id}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusStyle[statusKey]}`}
                            >
                              {t(r.status)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {r.supplier || r.warehouseName || "-"}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end font-medium">
                            <Clock className="w-3 h-3" />
                            {dt.time}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {dt.date}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <ArrowUpFromLine className="w-4 h-4 text-violet-600" />
                    <span className="font-semibold text-gray-900">
                      {t("Recent Issues")}
                    </span>
                  </div>
                  <button
                    onClick={() => router.push("/admin/outbound/issueSlip")}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    {t("View all")} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-gray-50">
                  {recentIssues.map((s) => {
                    const dt = formatDateTime(s.date);
                    const statusKey = s.statusKey || mapStatusKey(s.status);

                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-violet-600">
                              {s.id}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusStyle[statusKey]}`}
                            >
                              {t(s.status)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {s.project}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end font-medium">
                            <Clock className="w-3 h-3" />
                            {dt.time}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {dt.date}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
