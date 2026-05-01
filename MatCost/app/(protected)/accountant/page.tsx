"use client";

import { Sidebar } from "@/components/sidebar";
import {
  Bell,
  User,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Calendar,
  DollarSign,
  FileSignature,
  Receipt,
  AlertTriangle,
  LayoutDashboard,
  ClipboardCheck,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { UserDropdown } from "@/components/user-dropdown";
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/custom/card-wrapper";
import { useAuth } from "@/components/providers/auth-provider";

import {
  accountantPurchaseOrderApi,
  accountantReceiptsApi,
} from "@/services/import-service";
import { issueSlipApi } from "@/services/issueslip-service";
import { AuditListItemDto, auditService } from "@/services/audit-service";

import {
  PurchaseOrderDto,
  AccountantReceiptSummaryDto,
} from "@/services/import-service";

import { useTranslation } from "react-i18next";
import { formatDateTime } from "@/lib/format-date-time";

interface StatData {
  label: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down" | "neutral";
  icon: React.ElementType;
  theme: "blue" | "orange" | "purple" | "slate" | "red" | "green";
}

export default function AccountantDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  const [pendingOrders, setPendingOrders] = useState<PurchaseOrderDto[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<
    AccountantReceiptSummaryDto[]
  >([]);
  const [issueSlips, setIssueSlips] = useState<any[]>([]);
  const [audits, setAudits] = useState<AuditListItemDto[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [ordersRes, receiptsRes, slipsRes, auditsRes] = await Promise.all(
          [
            accountantPurchaseOrderApi.getPendingOrders(),
            accountantReceiptsApi.getReceipts(),
            issueSlipApi.getIssueSlips(),
            auditService.getAll(),
          ],
        );

        setPendingOrders(ordersRes.data || []);

        const allReceipts = receiptsRes.data || [];
        const completedReceipts = allReceipts.filter(
          (receipt) => receipt.status === "Stamped",
        );
        setPendingReceipts(completedReceipts);

        setIssueSlips(slipsRes || []);
        setAudits(auditsRes || []);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu Accountant Dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const pendingIssueSlips = useMemo(() => {
    return issueSlips.slice(0, 2);
  }, [issueSlips]);

  const auditsToReconcile = useMemo(() => {
    return audits
      .filter(
        (a) =>
          a.status === "PendingAccountantReview" ||
          a.status === "PendingAccountantApproval",
      )
      .slice(0, 5);
  }, [audits]);

  const totalPendingOrderValue = useMemo(() => {
    return pendingOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0,
    );
  }, [pendingOrders]);

  const statsData: StatData[] = useMemo(() => {
    const ordersCount = pendingOrders.length;
    const receiptsCount = pendingReceipts.length;
    const actionRequiredCount =
      ordersCount +
      receiptsCount +
      pendingIssueSlips.length +
      auditsToReconcile.length;

    return [
      {
        label: t("Pending PO Approvals"),
        value: ordersCount.toLocaleString(),
        trend: t("Require financial review"),
        trendDirection: ordersCount > 0 ? "up" : "neutral",
        icon: FileSignature,
        theme: "orange",
      },
      {
        label: t("Pending Value"),
        value: new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(totalPendingOrderValue),
        trend: t("Total value to approve"),
        trendDirection: totalPendingOrderValue > 0 ? "up" : "neutral",
        icon: DollarSign,
        theme: "purple",
      },
      {
        label: t("Receipts to Reconcile"),
        value: receiptsCount.toLocaleString(),
        trend: t("Accounts payable"),
        trendDirection: receiptsCount > 0 ? "up" : "neutral",
        icon: Receipt,
        theme: "blue",
      },
      {
        label: t("Action Required"),
        value: actionRequiredCount.toLocaleString(),
        trend: t("Total pending tasks"),
        trendDirection: actionRequiredCount > 0 ? "up" : "neutral",
        icon: AlertTriangle,
        theme: "red",
      },
    ];
  }, [
    pendingOrders,
    pendingReceipts,
    pendingIssueSlips,
    auditsToReconcile,
    totalPendingOrderValue,
    t,
  ]);

  const quickLinks = [
    {
      label: t("Purchase Orders"),
      href: "/accountant/purchase-orders",
      icon: FileSignature,
      desc: t("Approve budget & POs"),
    },
    {
      label: t("Receipt Reconciliation"),
      href: "/accountant/inbound-requests",
      icon: Receipt,
      desc: t("Close AP accounts"),
    },
    {
      label: t("Issue Slips"),
      href: "/outbound/common/IssueSlipList",
      icon: ClipboardList,
      desc: t("Approve material exports"),
    },
    {
      label: t("Inventory Audit"),
      href: "/accountant/audit",
      icon: ClipboardCheck,
      desc: t("Financial adjustments"),
    },
  ];

  const getThemeClasses = (theme: StatData["theme"]) => {
    switch (theme) {
      case "blue":
        return "bg-blue-100 text-blue-600";
      case "orange":
        return "bg-orange-100 text-orange-600";
      case "purple":
        return "bg-purple-100 text-purple-600";
      case "red":
        return "bg-red-100 text-red-600";
      case "green":
        return "bg-green-100 text-green-600";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getSparklinePath = (direction: string) => {
    if (direction === "up")
      return "M0,40 C20,30 40,40 60,10 C80,-10 90,20 100,10";
    if (direction === "down")
      return "M0,10 C20,10 40,30 60,20 C80,10 90,40 100,35";
    return "M0,30 C20,20 40,35 60,25 C80,15 90,30 100,25";
  };

  const getThemeColor = (theme: string) => {
    switch (theme) {
      case "blue":
        return "#3b82f6";
      case "red":
        return "#ef4444";
      case "green":
        return "#22c55e";
      case "purple":
        return "#a855f7";
      case "orange":
        return "#f97316";
      default:
        return "#94a3b8";
    }
  };

  const currentDate = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="hidden md:block">
              <h2 className="text-lg font-semibold text-slate-900">
                {t("Financial Dashboard")}
              </h2>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
                <Bell className="w-5 h-5" />
                {(pendingOrders.length > 0 || pendingReceipts.length > 0) && (
                  <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>

              <UserDropdown
                align="end"
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                }
              />
            </div>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto">
          <div className="px-6 lg:px-10 py-8 mx-auto w-full">
            {/* Welcome Section */}
            <div className="mb-8 flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-indigo-500 uppercase">
                  {t("Welcome Back")}
                </p>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {t(user?.fullName || "Accountant")}
                </h1>
              </div>
              <div className="hidden md:flex items-center gap-2 text-slate-500 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-100">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">{currentDate}</span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Activity className="w-8 h-8 text-slate-300 animate-spin" />
              </div>
            ) : (
              <>
                {/* 4 Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {statsData.map((stat, i) => {
                    const TrendIcon =
                      stat.trendDirection === "up"
                        ? ArrowUpRight
                        : stat.trendDirection === "down"
                          ? ArrowDownRight
                          : Clock;
                    const trendColorClass =
                      stat.trendDirection === "up"
                        ? "text-green-600 bg-green-50"
                        : stat.trendDirection === "down"
                          ? "text-orange-600 bg-orange-50"
                          : "text-slate-600 bg-slate-50";

                    return (
                      <Card
                        interactive
                        key={i}
                        className="flex flex-col justify-between h-full relative overflow-hidden group"
                      >
                        <div className="flex items-start justify-between mb-4 relative z-10">
                          <div>
                            <p className="text-slate-500 text-sm font-medium mb-1 group-hover:text-slate-700 transition-colors">
                              {stat.label}
                            </p>
                            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                              {stat.value}
                            </h3>
                          </div>
                          <div
                            className={`p-3 rounded-xl ${getThemeClasses(stat.theme)} shadow-sm`}
                          >
                            <stat.icon className="w-6 h-6" />
                          </div>
                        </div>

                        <div className="flex items-center text-sm font-medium relative z-10">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${trendColorClass}`}
                          >
                            <TrendIcon className="w-4 h-4" />
                            {stat.trend}
                          </span>
                        </div>

                        {/* Mini Sparkline Background */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none opacity-[0.12] group-hover:opacity-20 transition-opacity duration-300">
                          <svg
                            viewBox="0 0 100 40"
                            preserveAspectRatio="none"
                            className="w-full h-full"
                          >
                            <path
                              d={`${getSparklinePath(stat.trendDirection)} L100,40 L0,40 Z`}
                              fill={`url(#gradient-${stat.theme})`}
                            />
                            <path
                              d={getSparklinePath(stat.trendDirection)}
                              fill="none"
                              stroke={getThemeColor(stat.theme)}
                              strokeWidth="2"
                            />
                            <defs>
                              <linearGradient
                                id={`gradient-${stat.theme}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor={getThemeColor(stat.theme)}
                                  stopOpacity="1"
                                />
                                <stop
                                  offset="100%"
                                  stopColor={getThemeColor(stat.theme)}
                                  stopOpacity="0"
                                />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  {/* Left Column: Quick Access & Table */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Quick Access */}
                    <Card>
                      <h3 className="text-lg font-semibold text-slate-900 mb-6">
                        {t("Quick Access")}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {quickLinks.map((link, i) => (
                          <div
                            key={i}
                            onClick={() => router.push(link.href)}
                            className="cursor-pointer flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors border border-slate-100 hover:border-indigo-200 group text-center"
                          >
                            <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-md text-slate-500 group-hover:text-indigo-600 transition-all">
                              <link.icon className="w-6 h-6" />
                            </div>
                            <div>
                              <span className="block font-semibold text-slate-700 group-hover:text-indigo-700 text-sm mb-0.5">
                                {link.label}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {link.desc}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Table: Pending Purchase Orders */}
                    <Card className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {t("Purchase Orders Pending Approval")}
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push("/accountant/purchase-orders")
                          }
                        >
                          {t("View All")}
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 border-b">
                            <tr>
                              <th className="px-4 py-3 font-medium rounded-tl-lg">
                                {t("PO Code")}
                              </th>
                              <th className="px-4 py-3 font-medium">
                                {t("Date")}
                              </th>
                              <th className="px-4 py-3 font-medium">
                                {t("Total Value")}
                              </th>
                              <th className="px-4 py-3 font-medium">
                                {t("Status")}
                              </th>
                              <th className="px-4 py-3 font-medium rounded-tr-lg"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingOrders.slice(0, 5).map((po) => (
                              <tr
                                key={po.purchaseOrderId}
                                className="border-b last:border-0 hover:bg-slate-50 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/accountant/purchase-orders/${po.purchaseOrderId}`,
                                  );
                                }}
                              >
                                <td className="px-4 py-3 font-medium text-slate-900">
                                  {po.purchaseOrderCode}
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {formatDateTime(po.createdAt)}
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-700">
                                  {new Intl.NumberFormat("vi-VN", {
                                    style: "currency",
                                    currency: "VND",
                                  }).format(po.totalAmount || 0)}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-700">
                                    {t(po.status || "Pending")}
                                  </span>
                                </td>
                                <td className="flex justify-end py-3 pr-4">
                                  <Button
                                    onClick={() =>
                                      router.push(
                                        `/accountant/purchase-orders/${po.purchaseOrderId}`,
                                      )
                                    }
                                    size="sm"
                                  >
                                    {t("Review")}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                            {pendingOrders.length === 0 && (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="text-center py-6 text-slate-500"
                                >
                                  {t("No purchase orders pending approval.")}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>

                  {/* Right Column: Action Required (Receipts, Audits, Issue Slips) */}
                  <div className="flex flex-col gap-6">
                    {/* Receipts to Reconcile */}
                    <Card className="flex-1 flex flex-col">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-blue-500" />
                        {t("Receipts to Close")}
                      </h3>
                      <div className="space-y-3 flex-1">
                        {pendingReceipts.slice(0, 2).map((receipt) => (
                          <div
                            key={receipt.receiptId || receipt.receiptCode}
                            className="p-3 border border-slate-100 rounded-xl bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer"
                            onClick={() =>
                              router.push(
                                `/accountant/inbound-requests/${receipt.receiptId}`,
                              )
                            }
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-slate-800">
                                {receipt.receiptCode}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {t("Action Needed")}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mb-2">
                              {t("Date: ")} {formatDateTime(receipt.stampedAt)}
                            </p>
                          </div>
                        ))}
                        {pendingReceipts.length === 0 && (
                          <p className="text-center text-sm text-slate-500 py-4">
                            {t("No receipts pending reconciliation.")}
                          </p>
                        )}
                      </div>
                      {pendingReceipts.length > 0 && (
                        <Button
                          variant="ghost"
                          className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 mt-2 text-sm"
                          onClick={() =>
                            router.push("/accountant/inbound-requests")
                          }
                        >
                          {t("View all ")} {pendingReceipts.length}{" "}
                          {t("receipts")}
                        </Button>
                      )}
                    </Card>

                    {/* Pending Issue Slips */}
                    <Card className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-orange-500" />
                        {t("Issue Slips")}
                      </h3>
                      <div className="space-y-3">
                        {pendingIssueSlips.map((slip) => (
                          <div
                            key={slip.issueId}
                            className="p-3 border border-slate-100 rounded-xl bg-orange-50/50 hover:bg-orange-50 hover:border-orange-200 transition-colors cursor-pointer"
                            onClick={() =>
                              router.push(
                                `/outbound/common/IssueSlipDetail/${slip.issueId}`,
                              )
                            }
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-slate-800">
                                {slip.issueCode}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {t("Status: ")} {t(slip.status)}
                            </p>
                          </div>
                        ))}
                        {pendingIssueSlips.length === 0 && (
                          <p className="text-center text-sm text-slate-500 py-4">
                            {t("No issue slips waiting for approval.")}
                          </p>
                        )}
                      </div>
                      {pendingIssueSlips.length > 0 && (
                        <Button
                          variant="ghost"
                          className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50 mt-2 text-sm"
                          onClick={() =>
                            router.push("/outbound/common/IssueSlipList")
                          }
                        >
                          {t("View all ")} {pendingIssueSlips.length}{" "}
                          {t("issue slips")}
                        </Button>
                      )}
                    </Card>

                    {/* Audits for Reconcile */}
                    <Card className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-purple-500" />
                        {t("Audits to Reconcile")}
                      </h3>
                      <div className="space-y-3">
                        {auditsToReconcile.map((audit) => (
                          <div
                            key={audit.stockTakeId}
                            className="p-3 border border-slate-100 rounded-xl bg-purple-50/50 hover:bg-purple-50 hover:border-purple-200 transition-colors cursor-pointer"
                            onClick={() =>
                              router.push(
                                `/accountant/audit/detail/${audit.stockTakeId}`,
                              )
                            }
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-slate-800">
                                {audit.title}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                {audit.status === "PendingAccountantReview"
                                  ? t("Pending Review")
                                  : t("Pending Approval")}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 truncate">
                              {audit.warehouseName}
                            </p>
                          </div>
                        ))}
                        {auditsToReconcile.length === 0 && (
                          <p className="text-center text-sm text-slate-500 py-4">
                            {t("No audits pending reconciliation.")}
                          </p>
                        )}
                      </div>
                      {auditsToReconcile.length > 0 && (
                        <Button
                          variant="ghost"
                          className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50 mt-2 text-sm"
                          onClick={() => router.push("/accountant/audit")}
                        >
                          {t("View all ")} {auditsToReconcile.length}{" "}
                          {t("audits")}
                        </Button>
                      )}
                    </Card>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
