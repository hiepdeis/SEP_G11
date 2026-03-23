"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  Clock,
  Search,
  ArrowRight,
  Loader2,
  CalendarDays,
  Package,
  FileText,
  BellRing,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
  Delete,
  Building2,
  AlertTriangle,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  adminPurchaseRequestApi,
  PurchaseRequestDto,
  adminStockShortageAlertApi,
  StockShortageAlertDto,
} from "@/services/import-service";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { endOfDay, format, isWithinInterval, startOfDay } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils"; // Dùng hàm helper ở bước trước
import { useTranslation } from "react-i18next";
import { formatPascalCase } from "@/lib/format-pascal-case";

export default function AdminPurchaseManagementPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<"PR" | "Alert">("PR");

  const [requests, setRequests] = useState<PurchaseRequestDto[]>([]);
  const [alerts, setAlerts] = useState<StockShortageAlertDto[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const [sortConfig, setSortConfig] = useState<{
    key: "date" | "items" | "quantity";
    direction: "asc" | "desc";
  } | null>(null);

  const handleSort = (key: "date" | "items" | "quantity") => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [prRes, alertRes] = await Promise.all([
          adminPurchaseRequestApi.getRequests(),
          adminStockShortageAlertApi.getConfirmedAlerts(),
        ]);
        setRequests(prRes.data);
        setAlerts(alertRes.data);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error(t("Failed to load management data"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [t]);

  const handleTabChange = (tab: "PR" | "Alert") => {
    setActiveTab(tab);
    setSearchTerm("");
    setFilterStatus("All");
    setCurrentPage(1);
    setSortConfig(null);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    filterStatus,
    sortConfig,
    itemsPerPage,
    dateRange,
    activeTab,
  ]);

  const filteredPRs = requests.filter((item) => {
    let matchesStatus = true;
    if (filterStatus === "Submitted")
      matchesStatus = item.status === "Submitted";
    else if (filterStatus === "DraftPO")
      matchesStatus = item.status === "DraftPO";

    const matchesSearch = item.requestCode
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    let matchesDate = true;
    if (dateRange.from || dateRange.to) {
      if (!item.createdAt) matchesDate = false;
      else {
        const itemDate = new Date(item.createdAt);
        matchesDate = isWithinInterval(itemDate, {
          start: dateRange.from
            ? startOfDay(dateRange.from)
            : new Date(2000, 0, 1),
          end: dateRange.to ? endOfDay(dateRange.to) : new Date(2100, 0, 1),
        });
      }
    }
    return matchesStatus && matchesSearch && matchesDate;
  });

  const sortedPRs = [...filteredPRs].sort((a, b) => {
    if (!sortConfig) return 0;
    if (sortConfig.key === "date") {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }
    if (sortConfig.key === "items") {
      const itemsA = a.items?.length || 0;
      const itemsB = b.items?.length || 0;
      return sortConfig.direction === "asc" ? itemsA - itemsB : itemsB - itemsA;
    }
    return 0;
  });

  const filteredAlerts = alerts.filter((item) => {
    let matchesStatus = true;
    if (filterStatus !== "All") matchesStatus = item.status === filterStatus;

    const matchesSearch =
      item.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.materialCode.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesDate = true;
    if (dateRange.from || dateRange.to) {
      if (!item.createdAt) matchesDate = false;
      else {
        const itemDate = new Date(item.createdAt);
        matchesDate = isWithinInterval(itemDate, {
          start: dateRange.from
            ? startOfDay(dateRange.from)
            : new Date(2000, 0, 1),
          end: dateRange.to ? endOfDay(dateRange.to) : new Date(2100, 0, 1),
        });
      }
    }
    return matchesStatus && matchesSearch && matchesDate;
  });

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (!sortConfig) return 0;
    if (sortConfig.key === "date") {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }
    if (sortConfig.key === "quantity") {
      return sortConfig.direction === "asc"
        ? a.suggestedQuantity - b.suggestedQuantity
        : b.suggestedQuantity - a.suggestedQuantity;
    }
    return 0;
  });

  const currentSortedData = activeTab === "PR" ? sortedPRs : sortedAlerts;

  const isAll = itemsPerPage === -1;
  const totalPages = isAll
    ? 1
    : Math.ceil(currentSortedData.length / itemsPerPage) || 1;
  const startIndex =
    (currentPage - 1) * (isAll ? currentSortedData.length : itemsPerPage);
  const endIndex = isAll ? currentSortedData.length : startIndex + itemsPerPage;
  const paginatedData = currentSortedData.slice(startIndex, endIndex);

  // Handlers
  const handleReviewPR = (id: number) => {
    setLoadingId(id);
    router.push(`/admin/purchase-requests/${id}`);
  };

  const handleCreatePRFromAlert = (alertId: number) => {
    router.push(`/admin/purchase-requests/create?alertId=${alertId}`);
  };

  const handleViewAlertDetail = (alertId: number) => {
    router.push(`/admin/alerts/${alertId}`);
  };

  // Formatters
  const formatDate = (dateString?: string | null) =>
    dateString ? new Date(dateString).toLocaleDateString("vi-VN") : "N/A";
  const formatPlus = (num: number) => (num > 999 ? "999+" : num);

  // Thống kê KPI PR
  const pendingCount = requests.filter(
    (item) => item.status === "Submitted",
  ).length;
  const totalCount = requests.length;
  const alertDrivenCount = requests.filter(
    (item) => item.alertId != null,
  ).length;

  // Thống kê KPI Alerts
  const confirmedAlertsCount = alerts.filter(
    (i) => i.status === "ManagerConfirmed",
  ).length;
  const highPriorityAlertsCount = alerts.filter(
    (i) => i.priority === "High" && i.status === "ManagerConfirmed",
  ).length;

  const getPriorityBadge = (priority?: string | null) => {
    if (!priority) return null;
    switch (priority.toLowerCase()) {
      case "high":
        return (
          <Badge
            variant="secondary"
            className="bg-red-100 text-red-700 px-1.5 text-[10px]"
          >
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-700 px-1.5 text-[10px]"
          >
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-700 px-1.5 text-[10px]"
          >
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Purchase Management")}></Header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {t("Purchase Management")}
              </h1>
              <p className="text-sm text-slate-500">
                {t(
                  "Manage internal purchase requests and resolve stock shortage alerts.",
                )}
              </p>
            </div>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              onClick={() => router.push("/admin/purchase-requests/create")} // Vẫn cho tạo tự do, nhưng sẽ báo lỗi bên trang kia nếu không có alertId
            >
              {t("Create Request")} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {activeTab === "PR" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 duration-300">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">
                      {t("Pending Requests")}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {formatPlus(pendingCount)}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">
                      {t("Total Requests")}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {formatPlus(totalCount)}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-rose-100 text-rose-600 rounded-lg">
                    <BellRing className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">
                      {t("From Alerts")}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {formatPlus(alertDrivenCount)}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 duration-300">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">
                      {t("Awaiting PR Creation")}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {formatPlus(confirmedAlertsCount)}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">
                      {t("High Priority Alerts")}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {formatPlus(highPriorityAlertsCount)}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* CUSTOM TABS */}
          <div className="flex items-center gap-1 border-b border-slate-200 mt-2">
            <button
              onClick={() => handleTabChange("PR")}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
                activeTab === "PR"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t("Purchase Requests")}
              </div>
            </button>
            <button
              onClick={() => handleTabChange("Alert")}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
                activeTab === "Alert"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 relative">
                <BellRing className="w-4 h-4" />
                 {t("Stock Shortage Alerts")}
                {confirmedAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-3 flex h-2 w-2 rounded-full bg-rose-500"></span>
                )}
              </div>
            </button>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] gap-0 pb-0 flex flex-col">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-slate-500 hidden md:block">
                    {t("Filters")}:
                  </span>

                  {/* DYNAMIC FILTER SELECT */}
                  <Select
                    value={filterStatus}
                    onValueChange={(value) => setFilterStatus(value)}
                  >
                    <SelectTrigger className="bg-white border-slate-200 shadow-sm h-9 cursor-pointer">
                      <SelectValue placeholder={t("Filter by status")} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTab === "PR" ? (
                        <>
                          <SelectItem value="All">{t("All PRs")}</SelectItem>
                          <SelectItem value="Submitted">
                            {t("Submitted")}
                          </SelectItem>
                          <SelectItem value="DraftPO">
                            {t("PO Draft")}
                          </SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="All">{t("All Alerts")}</SelectItem>
                          <SelectItem value="ManagerConfirmed">
                            {t("Confirmed")}
                          </SelectItem>
                          <SelectItem value="PRCreated">
                            {t("Resolved")}
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal h-9 bg-white shadow-sm",
                            !dateRange.from && "text-slate-500",
                          )}
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {dateRange.from ? (
                            format(dateRange.from, "dd/MM/yyyy")
                          ) : (
                            <span>{t("From Date")}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) =>
                            setDateRange((prev) => ({ ...prev, from: date }))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <span className="text-slate-400">-</span>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal h-9 bg-white shadow-sm",
                            !dateRange.to && "text-slate-500",
                          )}
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {dateRange.to ? (
                            format(dateRange.to, "dd/MM/yyyy")
                          ) : (
                            <span>{t("To Date")}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) =>
                            setDateRange((prev) => ({ ...prev, to: date }))
                          }
                          initialFocus
                          disabled={(date) =>
                            dateRange.from ? date < dateRange.from : false
                          }
                        />
                      </PopoverContent>
                    </Popover>

                    {(dateRange.from || dateRange.to) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-slate-500 px-2"
                        onClick={() =>
                          setDateRange({ from: undefined, to: undefined })
                        }
                      >
                        <Delete className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder={
                      activeTab === "PR"
                        ? t("Search PR Code...")
                        : t("Search Material...")
                    }
                    className="pl-9 h-9"
                    maxLength={50}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex flex-col justify-between flex-1">
              <div className="[&>div]:max-h-[350px] [&>div]:min-h-[350px] [&>div]:overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                    <TableRow className="bg-slate-50">
                      {activeTab === "PR" ? (
                        <>
                          <TableHead
                            className="pl-6 cursor-pointer transition-colors w-[25%]"
                            onClick={() => handleSort("date")}
                          >
                            <div className="flex items-center gap-1.5 select-none">
                              {t("Request & Date")}
                              {sortConfig?.key === "date" ? (
                                sortConfig.direction === "asc" ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-50 hover:text-indigo-600" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead className="w-[25%]">
                            {t("Project")}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer transition-colors w-[15%]"
                            onClick={() => handleSort("items")}
                          >
                            <div className="flex items-center gap-1.5 select-none">
                              {t("Items")}
                              {sortConfig?.key === "items" ? (
                                sortConfig.direction === "asc" ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-50 hover:text-indigo-600" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead className="w-[15%]">
                            {t("Status")}
                          </TableHead>
                          <TableHead className="text-right pr-6 w-[20%]">
                            {t("Action")}
                          </TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead
                            className="pl-6 cursor-pointer transition-colors w-[20%]"
                            onClick={() => handleSort("date")}
                          >
                            <div className="flex items-center gap-1.5 select-none">
                              {t("Date & Alert ID")}
                              {sortConfig?.key === "date" ? (
                                sortConfig.direction === "asc" ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-50 hover:text-indigo-600" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead className="w-[30%]">
                            {t("Material Info")}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer transition-colors w-[15%] text-right"
                            onClick={() => handleSort("quantity")}
                          >
                            <div className="flex items-center justify-end gap-1.5 select-none">
                              {t("Req. Quantity")}
                              {sortConfig?.key === "quantity" ? (
                                sortConfig.direction === "asc" ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-50 hover:text-indigo-600" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead className="w-[15%] text-center">
                            {t("Status")}
                          </TableHead>
                          <TableHead className="text-right pr-6 w-[20%]">
                            {t("Action")}
                          </TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex justify-center items-center gap-2 text-indigo-600">
                            <Loader2 className="w-6 h-6 animate-spin" />{" "}
                            {t("Loading data...")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-32 text-center text-slate-500"
                        >
                          {t("No records found.")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((item: any) => {
                        if (activeTab === "PR") {
                          // BẢNG PR
                          return (
                            <TableRow
                              key={item.requestId}
                              className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                              onClick={() => {
                                const selection = window.getSelection();
                                if (
                                  selection &&
                                  selection.toString().length > 0
                                ) {
                                  return;
                                }
                                handleReviewPR(item.requestId);
                              }}
                            >
                              <TableCell className="pl-6">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-700">
                                      {item.requestCode}
                                    </span>
                                    {item.alertId && (
                                      <Badge
                                        variant="secondary"
                                        className="bg-rose-100 text-rose-700 hover:bg-rose-100 px-1 py-0 h-4 text-[10px]"
                                      >
                                        <AlertTriangle className="w-3 h-3" />
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                    <CalendarDays className="w-3 h-3" />{" "}
                                    {formatDate(item.createdAt)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Building2 className="w-4 h-4 text-indigo-500" />
                                  <span className="font-medium text-slate-800">
                                    {item.projectName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Package className="w-4 h-4 text-slate-400" />
                                  {item.items?.length || 0} {t("items")}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    item.status === "Submitted"
                                      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }
                                >
                                  {t(formatPascalCase(item.status))}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <Button
                                  size="sm"
                                  onClick={() => handleReviewPR(item.requestId)}
                                  disabled={loadingId === item.requestId}
                                  variant="default"
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-[100px]"
                                >
                                  {loadingId === item.requestId ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      {t("View")}{" "}
                                      <Eye className="w-4 h-4 ml-1.5" />
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        } else {
                          return (
                            <TableRow
                              key={item.alertId}
                              className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                              onClick={() => {
                                const selection = window.getSelection();
                                if (
                                  selection &&
                                  selection.toString().length > 0
                                ) {
                                  return;
                                }
                                handleCreatePRFromAlert(item.alertId)
                              }}
                            >
                              <TableCell className="pl-6">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-700">
                                    #{item.alertId}
                                  </span>
                                  <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                    <CalendarDays className="w-3 h-3" />{" "}
                                    {formatDate(item.createdAt)}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex flex-col text-left">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-800">
                                      {item.materialName}
                                    </span>
                                    {getPriorityBadge(item.priority)}
                                  </div>
                                  <span className="text-xs text-slate-500 font-mono mt-0.5">
                                    {item.materialCode}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell className="text-right">
                                <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                                  +
                                  {item.suggestedQuantity?.toLocaleString(
                                    "vi-VN",
                                  ) || 0}
                                </span>
                              </TableCell>

                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    item.status === "ManagerConfirmed"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }
                                >
                                  {t(formatPascalCase(item.status))}
                                </Badge>
                              </TableCell>

                              <TableCell className="text-right pr-6">
                                <div className="flex justify-end items-center gap-2">
                                  {item.status === "ManagerConfirmed" ? (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleCreatePRFromAlert(item.alertId)
                                        }
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                      >
                                        <FileText className="w-4 h-4 mr-1.5" />
                                        {t("Create PR")}
                                      </Button>

                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-indigo-800"
                                          >
                                            <MoreHorizontal className="w-4 h-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem
                                            onClick={(e) =>{
                                              e.stopPropagation();
                                              handleViewAlertDetail(
                                                item.alertId,
                                              )
                                            }}
                                          >
                                            <Eye className="w-4 h-4 mr-2 focus:text-primary" />{" "}
                                            {t("View Alert Details")}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleViewAlertDetail(item.alertId)
                                      }
                                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 w-[100px]"
                                    >
                                      {t("View")}{" "}
                                      <Eye className="w-4 h-4 ml-1.5" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {!isLoading && currentSortedData.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4 mt-auto">
                  <div className="text-sm text-slate-500">
                    {t("Showing")}{" "}
                    <span className="font-medium text-slate-900">
                      {startIndex + 1}
                    </span>{" "}
                    {t("to")}{" "}
                    <span className="font-medium text-slate-900">
                      {Math.min(endIndex, currentSortedData.length)}
                    </span>{" "}
                    {t("of")}{" "}
                    <span className="font-medium text-slate-900">
                      {currentSortedData.length}
                    </span>{" "}
                    {t("results")}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 whitespace-nowrap">
                        {t("Rows per page:")}
                      </span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(val) => setItemsPerPage(Number(val))}
                      >
                        <SelectTrigger className="h-8 w-[75px] bg-white border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="-1">{t("All")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className="h-8"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> {t("Previous")}
                      </Button>
                      <div className="text-sm font-medium text-slate-600 px-2 min-w-[80px] text-center">
                        {t("Page")} {currentPage} {t("of")} {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.max(prev + 1, totalPages),
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="h-8"
                      >
                        {t("Next")} <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
