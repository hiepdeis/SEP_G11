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
  AlertTriangle,
  ClipboardCheck,
  ClipboardList,
  PackageMinus,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { UserDropdown } from "@/components/user-dropdown";
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/custom/card-wrapper";
import { useAuth } from "@/components/providers/auth-provider";

import {
  managerStockShortageAlertApi,
  managerIncidentApi,
  managerReceiptsApi,
} from "@/services/import-service";
import { issueSlipApi } from "@/services/issueslip-service";
import { AuditListItemDto, auditService } from "@/services/audit-service";

import {
  StockShortageAlertDto,
  ManagerIncidentSummaryDto,
  ManagerReceiptSummaryDto,
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

export default function ManagerDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  const [alerts, setAlerts] = useState<StockShortageAlertDto[]>([]);
  const [pendingIncidents, setPendingIncidents] = useState<
    ManagerIncidentSummaryDto[]
  >([]);
  const [pendingReceipts, setPendingReceipts] = useState<
    ManagerReceiptSummaryDto[]
  >([]);
  const [issueSlips, setIssueSlips] = useState<any[]>([]);
  const [audits, setAudits] = useState<AuditListItemDto[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [alertsRes, incidentsRes, receiptsRes, slipsRes, auditsRes] =
          await Promise.all([
            managerStockShortageAlertApi.getAlerts(),
            managerIncidentApi.getPendingIncidents(),
            managerReceiptsApi.getReceipts(),
            issueSlipApi.getIssueSlips(),
            auditService.getAll(),
          ]);

        setAlerts(alertsRes.data || []);
        setPendingIncidents(incidentsRes.data || []);
        setPendingReceipts(receiptsRes.data || []);
        setIssueSlips(slipsRes || []);
        setAudits(auditsRes || []);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu Manager Dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const pendingIssueSlips = useMemo(() => {
    return issueSlips.slice(0, 5);
  }, [issueSlips]);

  const activeAudits = useMemo(() => {
    return audits
      .filter(
        (a) =>
          a.status === "InProgress" ||
          a.status === "PendingManagerReview" ||
          a.status === "Planned" ||
          a.status === "Assigned" ||
          a.status === "PLAN",
      )
      .slice(0, 5);
  }, [audits]);

  const statsData: StatData[] = useMemo(() => {
    const alertsCount = alerts.filter((a) => a.status === "Pending").length;
    const slipsCount = issueSlips.length;
    const receiptsCount = pendingReceipts.length;

    return [
      {
        label: t("Pending Issue Slips"),
        value: slipsCount.toLocaleString(),
        trend: t("Require warehouse approval"),
        trendDirection: slipsCount > 0 ? "up" : "neutral",
        icon: Upload,
        theme: "orange",
      },
      {
        label: t("Receipts to Approve"),
        value: receiptsCount.toLocaleString(),
        trend: t("Imported, waiting review"),
        trendDirection: receiptsCount > 0 ? "up" : "neutral",
        icon: Download,
        theme: "blue",
      },
      {
        label: t("Stock Alerts"),
        value: alertsCount.toLocaleString(),
        trend: t("Items below min level"),
        trendDirection: alertsCount > 0 ? "down" : "neutral",
        icon: PackageMinus,
        theme: "red",
      },
      {
        label: t("Pending Incidents"),
        value: pendingIncidents.length.toLocaleString(),
        trend: t("QC failed/Missing items"),
        trendDirection: pendingIncidents.length > 0 ? "down" : "neutral",
        icon: AlertTriangle,
        theme: "purple",
      },
    ];
  }, [alerts, issueSlips, pendingReceipts, pendingIncidents, t]);

  const quickLinks = [
    {
      label: t("Issue Slips"),
      href: "/outbound/common/IssueSlipList",
      icon: ClipboardList,
      desc: t("Approve exports"),
    },
    {
      label: t("Inbound Receipts"),
      href: "/manager/inbound-requests",
      icon: Download,
      desc: t("Approve imported goods"),
    },
    {
      label: t("Inventory Audit"),
      href: "/manager/audit",
      icon: ClipboardCheck,
      desc: t("Manage stocktakes"),
    },
    {
      label: t("Incident Reports"),
      href: "/manager/incident-reports",
      icon: AlertTriangle,
      desc: t("Resolve warehouse issues"),
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
                {t("Warehouse Manager Dashboard")}
              </h2>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
                <Bell className="w-5 h-5" />
                {(alerts.length > 0 || pendingIncidents.length > 0) && (
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
                  {t(user?.fullName || "Manager")}
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
                        ? "text-orange-600 bg-orange-50"
                        : stat.trendDirection === "down"
                          ? "text-red-600 bg-red-50"
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
                  {/* Left Column: Quick Access & Tables */}
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

                    <Card className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {t("Issue Slips")}
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push("/outbound/common/IssueSlipList")
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
                                {t("Slip Code")}
                              </th>
                              <th className="px-4 py-3 font-medium">
                                {t("Date")}
                              </th>
                              <th className="px-4 py-3 font-medium rounded-tr-lg"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingIssueSlips.map((slip, i) => (
                              <tr
                                key={i}
                                className="border-b last:border-0 hover:bg-slate-50 cursor-pointer"
                                onClick={() =>
                                  router.push(
                                    `/outbound/common/IssueSlipDetail/${slip.issueId}`,
                                  )
                                }
                              >
                                <td className="px-4 py-3 font-medium text-slate-900">
                                  {slip.issueCode}
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {formatDateTime(
                                    slip.createdDate || slip.issueDate,
                                  )}
                                </td>
                                <td className="flex justify-end py-3 pr-4">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      router.push(
                                        `/outbound/common/IssueSlipDetail/${slip.issueId}`,
                                      )
                                    }
                                  >
                                    {t("Review")}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                            {pendingIssueSlips.length === 0 && (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="text-center py-6 text-slate-500"
                                >
                                  {t("No issue slips pending your approval.")}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>

                  <div className="flex flex-col gap-6">
                    <Card className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <PackageMinus className="w-5 h-5 text-red-500" />
                        {t("Alerts need Review")}
                      </h3>
                      <div className="space-y-3">
                        {alerts
                          .filter((alert) => alert.status == "Pending")
                          .slice(0, 2)
                          .map((alert) => (
                            <div
                              key={alert.alertId}
                              className="p-3 border border-slate-100 rounded-xl bg-red-50/50 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
                              onClick={() =>
                                router.push(`/manager/alerts/${alert.alertId}`)
                              }
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-slate-800">
                                  {alert.materialCode}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                  {t("Below Min Level")}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                {t("Current:")}{" "}
                                <strong className="text-red-600">
                                  {alert.currentQuantity}
                                </strong>{" "}
                                | {t("Min:")} {alert.minStockLevel}
                              </p>
                            </div>
                          ))}
                        {alerts.length === 0 && (
                          <p className="text-center text-sm text-slate-500 py-4">
                            {t("No stock shortage alerts.")}
                          </p>
                        )}
                      </div>
                      {alerts.length > 0 && (
                        <Button
                          variant="ghost"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 mt-2 text-sm"
                          onClick={() => router.push("/manager/alerts")}
                        >
                          {t("View all alerts")}
                        </Button>
                      )}
                    </Card>

                    {/* Receipts to Approve */}
                    <Card className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Download className="w-5 h-5 text-blue-500" />
                        {t("Receipts to Approve")}
                      </h3>
                      <div className="space-y-3">
                        {pendingReceipts
                          .filter(
                            (receipt) => receipt.status == "ReadyForStamp",
                          )
                          .slice(0, 2)
                          .map((receipt) => (
                            <div
                              key={receipt.receiptId || receipt.receiptCode}
                              className="p-3 border border-slate-100 rounded-xl bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer"
                              onClick={() =>
                                router.push(
                                  `/manager/inbound-requests/${receipt.receiptId}`,
                                )
                              }
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-slate-800">
                                  {receipt.receiptCode}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {t("Status: ")} {t("Ready For Stamp")}
                              </p>
                            </div>
                          ))}
                        {pendingReceipts.length === 0 && (
                          <p className="text-center text-sm text-slate-500 py-4">
                            {t("No receipts pending approval.")}
                          </p>
                        )}
                      </div>
                      {pendingReceipts.length > 0 && (
                        <Button
                          variant="ghost"
                          className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 mt-2 text-sm"
                          onClick={() =>
                            router.push("/manager/inbound-requests")
                          }
                        >
                          {t("View all receipts")}
                        </Button>
                      )}
                    </Card>

                    {/* Incidents to Resolve */}
                    <Card className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-purple-500" />
                        {t("Incidents Action Needed")}
                      </h3>
                      <div className="space-y-3">
                        {pendingIncidents.slice(0, 2).map((incident) => (
                          <div
                            key={incident.incidentId}
                            className="p-3 border border-slate-100 rounded-xl bg-purple-50/50 hover:bg-purple-50 hover:border-purple-200 transition-colors cursor-pointer"
                            onClick={() =>
                              router.push(
                                `/manager/incident-reports/${incident.incidentId}`,
                              )
                            }
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-slate-800">
                                {incident.incidentCode}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                {t("Pending")}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {t("Reported:")}{" "}
                              {formatDateTime(incident.submittedAt)}
                            </p>
                          </div>
                        ))}
                        {pendingIncidents.length === 0 && (
                          <p className="text-center text-sm text-slate-500 py-4">
                            {t("No pending incidents.")}
                          </p>
                        )}
                      </div>
                      {pendingIncidents.length > 0 && (
                        <Button
                          variant="ghost"
                          className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50 mt-2 text-sm"
                          onClick={() =>
                            router.push("/manager/incident-reports")
                          }
                        >
                          {t("View all incidents")}
                        </Button>
                      )}
                    </Card>

                    {/* Active Audits */}
                    <Card className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-green-500" />
                        {t("Active Audits")}
                      </h3>
                      <div className="space-y-3">
                        {activeAudits.map((audit) => (
                          <div
                            key={audit.stockTakeId}
                            className="p-3 border border-slate-100 rounded-xl bg-green-50/50 hover:bg-green-50 hover:border-green-200 transition-colors cursor-pointer"
                            onClick={() =>
                              router.push(
                                `/manager/audit/detail/${audit.stockTakeId}`,
                              )
                            }
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-slate-800">
                                {audit.title}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 truncate">
                              {audit.warehouseName} | {t(audit.status)}
                            </p>
                          </div>
                        ))}
                        {activeAudits.length === 0 && (
                          <p className="text-center text-sm text-slate-500 py-4">
                            {t("No active audits currently.")}
                          </p>
                        )}
                      </div>
                      {activeAudits.length > 0 && (
                        <Button
                          variant="ghost"
                          className="w-full text-green-600 hover:text-green-700 hover:bg-green-50 mt-2 text-sm"
                          onClick={() => router.push("/manager/audit")}
                        >
                          {t("View all audits")}
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
