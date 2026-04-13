"use client";

import { useEffect, useState, useMemo } from "react";
import {
  purchasingPurchaseOrderApi,
  purchasingPurchaseRequestApi,
  adminPurchaseOrderApi,
  adminPurchaseRequestApi,
  PurchaseOrderDto,
  PurchaseRequestDto,
} from "@/services/import-service";
import {
  Package,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  ChevronRight,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAuth } from "@/components/providers/auth-provider";

// --- CONSTANTS ---
const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f59e0b",
  "#10b981",
];

const statusColor: Record<string, string> = {
  done: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  reject: "bg-red-50 text-red-700 border-red-100",
  approved: "bg-blue-50 text-blue-700 border-blue-100",
};

// --- UTILS ---
const mapStatusKey = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes("approved") || s.includes("done") || s.includes("completed"))
    return "approved";
  if (s.includes("reject") || s.includes("denied")) return "reject";
  return "pending";
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    month: "short",
    day: "numeric",
  });
};

// --- PAGE COMPONENT ---
export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();

  // States for Analytics (Charts)
  const [pendingOrders, setPendingOrders] = useState<PurchaseOrderDto[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<
    PurchaseRequestDto[]
  >([]);

  // States for Approvals Table
  const [pendingAdminOrders, setPendingAdminOrders] = useState<
    PurchaseOrderDto[]
  >([]);
  const [adminRequests, setAdminRequests] = useState<PurchaseRequestDto[]>([]);

  const [activeTab, setActiveTab] = useState<"orders" | "requests">("orders");
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(14); // Default to 14 days

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [poRes, prRes, adminPoRes, adminPrRes] = await Promise.all([
          purchasingPurchaseOrderApi.getOrders(),
          purchasingPurchaseRequestApi.getRequests(),
          adminPurchaseOrderApi.getPendingOrders(),
          adminPurchaseRequestApi.getRequests(),
        ]);

        // Data for charts
        setPendingOrders(poRes.data || []);
        setPurchaseRequests(prRes.data || []);

        // Data for approvals table
        setPendingAdminOrders(adminPoRes.data || []);
        setAdminRequests(adminPrRes.data || []);
      } catch (error) {
        console.error(error);
        toast.error(t("Failed to load dashboard data"));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [t]);

  // --- DATA PROCESSING ---
  const summary = useMemo(() => {
    const totalPOValue = pendingOrders.reduce(
      (sum, po) => sum + (po.totalAmount || 0),
      0,
    );
    const totalPRItems = purchaseRequests.reduce(
      (sum, pr) => sum + (pr.items?.length || 0),
      0,
    );
    return {
      poCount: pendingOrders.length,
      prCount: purchaseRequests.length,
      poValue: totalPOValue,
      prItems: totalPRItems,
    };
  }, [pendingOrders, purchaseRequests]);

  const supplierData = useMemo(() => {
    const map: Record<string, number> = {};
    pendingOrders.forEach((po) => {
      map[po.supplierName] =
        (map[po.supplierName] || 0) + (po.totalAmount || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [pendingOrders]);

  const projectData = useMemo(() => {
    const map: Record<string, number> = {};
    purchaseRequests.forEach((pr) => {
      map[pr.projectName] = (map[pr.projectName] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [purchaseRequests]);

  const trendData = useMemo(() => {
    const days = Array.from({ length: timeRange }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (timeRange - 1 - i));
      return d.toISOString().split("T")[0];
    });

    return days.map((date) => {
      const pos = pendingOrders.filter((po) =>
        po.createdAt.startsWith(date),
      ).length;
      const prs = purchaseRequests.filter((pr) =>
        pr.createdAt.startsWith(date),
      ).length;
      return {
        date: formatDate(date),
        orders: pos,
        requests: prs,
      };
    });
  }, [pendingOrders, purchaseRequests, timeRange]);

  if (loading) {
    return (
      <div className="flex flex-row h-screen w-screen bg-slate-50/50">
        <Sidebar />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Activity className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-sm font-bold text-slate-500">
              {t("Loading Analytics...")}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50 text-slate-900">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Admin Dashboard")} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-8">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                {t("Welcome Back")}
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                {t(user?.fullName || "Admin")}
              </h1>
            </div>
            <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm">
              {[7, 14, 30].map((days) => (
                <Button
                  key={days}
                  variant={timeRange === days ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeRange(days)}
                  className="rounded-lg text-[10px] font-bold h-8 px-4"
                >
                  {days}D
                </Button>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: t("Pending Orders"),
                val: summary.poCount,
                color: "indigo",
                icon: Package,
              },
              {
                label: t("New Requests"),
                val: summary.prCount,
                color: "emerald",
                icon: FileText,
              },
              {
                label: t("Total Value"),
                val: formatCurrency(summary.poValue),
                color: "violet",
                icon: DollarSign,
                isWide: true,
              },
              {
                label: t("Items Requested"),
                val: summary.prItems,
                color: "amber",
                icon: TrendingUp,
              },
            ].map((stat, i) => (
              <Card
                key={i}
                className="group border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white dark:bg-slate-950 py-0"
              >
                <CardContent className="p-6 relative">
                  <div
                    className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-${stat.color}-500/5 rounded-full group-hover:scale-110 transition-transform`}
                  />
                  <div
                    className={`w-10 h-10 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 flex items-center justify-center mb-4`}
                  >
                    <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                  </div>
                  <p className="text-2xl font-black tracking-tighter text-slate-900 dark:text-slate-100">
                    {stat.val}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {stat.label}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Visuals */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-none shadow-sm bg-white dark:bg-slate-950">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-black tracking-tight">
                    {t("Procurement Trend")}
                  </CardTitle>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {t("Orders vs Requests Volume")}
                  </p>
                </div>
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </CardHeader>
              <CardContent className="h-[350px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient
                        id="colorOrders"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#6366f1"
                          stopOpacity={0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6366f1"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorRequests"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorOrders)"
                    />
                    <Area
                      type="monotone"
                      dataKey="requests"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRequests)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white dark:bg-slate-950">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-black tracking-tight">
                    {t("Project Distribution")}
                  </CardTitle>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {t("Request focus by project")}
                  </p>
                </div>
                <PieChartIcon className="w-5 h-5 text-slate-400" />
              </CardHeader>
              <CardContent className="h-[350px] flex flex-col items-center justify-center">
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                        dataKey="value"
                        nameKey="name"
                      >
                        {projectData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full mt-6 space-y-2">
                  {projectData.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-[11px] font-bold text-slate-600 truncate max-w-[120px]">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-slate-900">
                        {p.value} PRs
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Supplier Analysis */}
            <Card className="border-none shadow-sm bg-white dark:bg-slate-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black tracking-tight">
                  {t("Top Suppliers")}
                </CardTitle>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {t("Spending by partner")}
                </p>
              </CardHeader>
              <CardContent className="h-[300px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supplierData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={100}
                      tick={{ fontSize: 9, fontWeight: 700, fill: "#64748b" }}
                    />
                    <Tooltip cursor={{ fill: "transparent" }} />
                    <Bar
                      dataKey="value"
                      fill="#8b5cf6"
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Pending Approvals */}
            <Card className="lg:col-span-2 border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden gap-0">
              <CardHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-slate-50 dark:border-slate-900">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3 min-w-[300px]">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-black tracking-tight">
                        {t("Pending Approvals")}
                      </CardTitle>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {activeTab === "orders"
                          ? t("Critical Purchase Orders")
                          : t("Critical Purchase Requests")}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.push(
                      activeTab === "orders"
                        ? "/admin/purchase-orders"
                        : "/admin/purchase-requests",
                    )
                  }
                  className="rounded-full text-xs font-bold text-indigo-600 hover:text-white"
                >
                  {t("View all")} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </CardHeader>
              <div className="sm:flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 m-auto mt-2">
                <Button
                  variant={activeTab === "orders" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("orders")}
                  className="text-[10px] font-bold h-7 px-3 rounded-md"
                >
                  {t("Orders")}
                </Button>
                <Button
                  variant={activeTab === "requests" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("requests")}
                  className="text-[10px] font-bold h-7 px-3 rounded-md"
                >
                  {t("Requests")}
                </Button>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50 dark:divide-slate-900 min-h-[400px]">
                  {activeTab === "orders" ? (
                    pendingAdminOrders.slice(0, 5).length > 0 ? (
                      pendingAdminOrders.slice(0, 5).map((po) => (
                        <div
                          key={po.purchaseOrderId}
                          className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/admin/purchase-orders`)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-black tracking-tight">
                                {po.purchaseOrderCode}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[8px] font-bold uppercase border-none ${statusColor[mapStatusKey(po.status)]}`}
                              >
                                {t(po.status)}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 font-medium truncate">
                              {po.supplierName} • {po.projectName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-900">
                              {formatCurrency(po.totalAmount || 0)}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase">
                              {formatDate(po.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center p-12 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        {t("No pending orders")}
                      </div>
                    )
                  ) : adminRequests.slice(0, 5).length > 0 ? (
                    adminRequests.slice(0, 5).map((pr) => (
                      <div
                        key={pr.requestId}
                        className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/purchase-requests`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-black tracking-tight">
                              {pr.requestCode}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[8px] font-bold uppercase border-none ${statusColor[mapStatusKey(pr.status)]}`}
                            >
                              {t(pr.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 font-medium truncate">
                            {pr.projectName} • {pr.items?.length || 0}{" "}
                            {t("items")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">
                            PR
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase">
                            {formatDate(pr.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center p-12 text-slate-400 text-xs font-bold uppercase tracking-widest">
                      {t("No pending requests")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
