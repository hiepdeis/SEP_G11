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
  BadgeCheck,
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
  purchasingPurchaseOrderApi,
  PurchaseOrderDto,
  purchasingPurchaseRequestApi, // Bổ sung API PR
  PurchaseRequestDto, // Bổ sung DTO PR
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
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { formatPascalCase } from "@/lib/format-pascal-case";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PurchasingDashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<"PO" | "PR">("PO");

  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [requests, setRequests] = useState<PurchaseRequestDto[]>([]);

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
    key: "date" | "amount" | "items";
    direction: "asc" | "desc";
  } | null>(null);

  const handleSort = (key: "date" | "amount" | "items") => {
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
        // Fetch cả 2 data cùng lúc để việc chuyển tab diễn ra tức thì (instant)
        const [poRes, prRes] = await Promise.all([
          purchasingPurchaseOrderApi.getOrders(),
          purchasingPurchaseRequestApi.getRequests(),
        ]);
        setOrders(poRes.data);
        setRequests(prRes.data);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error(t("Failed to fetch purchasing data"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [t]);

  // Reset filters khi chuyển tab
  const handleTabChange = (tab: "PO" | "PR") => {
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

  // ==============================================================
  // LOGIC XỬ LÝ CHO PO (PURCHASE ORDERS)
  // ==============================================================
  const filteredPOs = orders.filter((item) => {
    let matchesStatus = true;
    if (filterStatus === "Draft") matchesStatus = item.status === "Draft";
    else if (filterStatus === "Pending")
      matchesStatus =
        item.status === "AccountantPending" || item.status === "AdminPending";
    else if (filterStatus === "History")
      matchesStatus =
        item.status !== "Draft" &&
        item.status !== "AccountantPending" &&
        item.status !== "AdminPending";

    const matchesSearch = item.purchaseOrderCode
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

  const sortedPOs = [...filteredPOs].sort((a, b) => {
    if (!sortConfig) return 0;
    if (sortConfig.key === "date") {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }
    if (sortConfig.key === "amount") {
      return sortConfig.direction === "asc"
        ? (a.totalAmount || 0) - (b.totalAmount || 0)
        : (b.totalAmount || 0) - (a.totalAmount || 0);
    }
    return 0;
  });

  // ==============================================================
  // LOGIC XỬ LÝ CHO PR (PURCHASE REQUESTS)
  // ==============================================================
  const filteredPRs = requests.filter((item) => {
    let matchesStatus = true;
    if (filterStatus === "Submitted")
      matchesStatus = item.status === "Submitted";
    else if (filterStatus === "History")
      matchesStatus = item.status !== "Submitted";

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

  // Data cuối cùng để render dựa trên Active Tab
  const currentSortedData = activeTab === "PO" ? sortedPOs : sortedPRs;

  // Phân trang
  const isAll = itemsPerPage === -1;
  const totalPages = isAll
    ? 1
    : Math.ceil(currentSortedData.length / itemsPerPage) || 1;
  const startIndex =
    (currentPage - 1) * (isAll ? currentSortedData.length : itemsPerPage);
  const endIndex = isAll ? currentSortedData.length : startIndex + itemsPerPage;
  const paginatedData = currentSortedData.slice(startIndex, endIndex);

  // Handlers
  const handleReviewPO = (id: number) => {
    setLoadingId(id);
    router.push(`/purchasing/purchase-orders/${id}`);
  };

  const handleReviewPR = (id: number) => {
    setLoadingId(id);
    // Chuyển sang trang tạo PO và truyền requestId lên URL để xử lý PR này
    router.push(`/purchasing/purchase-orders/create?requestId=${id}`);
  };

  const handleViewPRDetail = (PRId: number) => {
    router.push(`/purchasing/purchase-request/${PRId}`);
  };

  // Formatters
  const formatDate = (dateString?: string | null) =>
    dateString ? new Date(dateString).toLocaleDateString("vi-VN") : "N/A";
  const formatCurrency = (val?: number | null) =>
    val != null
      ? val.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
      : "0 ₫";
  const formatPlus = (num: number) => (num > 999 ? "999+" : num);

  // Thống kê KPI PO
  const poDraftCount = orders.filter((i) => i.status === "Draft").length;
  const poPendingCount = orders.filter(
    (i) => i.status === "AccountantPending" || i.status === "AdminPending",
  ).length;
  const poApprovedCount = orders.filter(
    (i) => i.status === "AdminApproved" || i.status === "SentToSupplier",
  ).length;

  // Thống kê KPI PR
  const prPendingCount = requests.filter(
    (i) => i.status === "Submitted",
  ).length;
  const prTotalCount = requests.length;
  const prAlertDrivenCount = requests.filter((i) => i.alertId != null).length;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Purchasing Dashboard")}></Header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {t("Purchasing Workspace")}
              </h1>
              <p className="text-sm text-slate-500">
                {t(
                  "Manage your Purchase Requests (PR) and Purchase Orders (PO).",
                )}
              </p>
            </div>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              onClick={() => router.push("/purchasing/purchase-orders/create")}
            >
              {t("Create PO Draft")} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {activeTab === "PO" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 duration-300">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">
                      {t("PO Drafts")}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {formatPlus(poDraftCount)}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">
                      {t("PO Awaiting Approval")}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {formatPlus(poPendingCount)}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                    <BadgeCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">
                      {t("PO Approved / Sent")}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {formatPlus(poApprovedCount)}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 duration-300">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">
                      {t("Pending PRs")}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {formatPlus(prPendingCount)}
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
                      {t("Total PRs")}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {formatPlus(prTotalCount)}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-rose-100 text-rose-600 rounded-lg">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">
                      {t("From Alerts")}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {formatPlus(prAlertDrivenCount)}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* CUSTOM TABS */}
          <div className="flex items-center gap-1 border-b border-slate-200 mt-2">
            <button
              onClick={() => handleTabChange("PO")}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
                activeTab === "PO"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Purchase Orders (PO)
              </div>
            </button>
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
                Purchase Requests (PR)
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
                    <SelectTrigger className="w-[150px] bg-white border-slate-200 shadow-sm h-9 cursor-pointer">
                      <SelectValue placeholder={t("Filter by status")} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTab === "PO" ? (
                        <>
                          <SelectItem value="All">{t("All POs")}</SelectItem>
                          <SelectItem value="Draft">{t("Drafts")}</SelectItem>
                          <SelectItem value="Pending">
                            {t("Pending Approval")}
                          </SelectItem>
                          <SelectItem value="History">
                            {t("History")}
                          </SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="All">{t("All PRs")}</SelectItem>
                          <SelectItem value="Submitted">
                            {t("Pending PRs")}
                          </SelectItem>
                          <SelectItem value="History">
                            {t("History")}
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
                      activeTab === "PO"
                        ? t("Search PO Code...")
                        : t("Search PR Code...")
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
              <div className="[&>div]:max-h-[400px] [&>div]:min-h-[400px] [&>div]:overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                    <TableRow className="bg-slate-50">
                      {activeTab === "PO" ? (
                        /* CỘT CHO BẢNG PO */
                        <>
                          <TableHead
                            className="pl-6 cursor-pointer transition-colors w-[20%]"
                            onClick={() => handleSort("date")}
                          >
                            <div className="flex items-center gap-1.5 select-none">
                              {t("PO Code & Date")}
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
                          <TableHead className="w-[20%]">
                            {t("Supplier")}
                          </TableHead>
                          <TableHead className="w-[15%]">
                            {t("Project")}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer transition-colors w-[15%]"
                            onClick={() => handleSort("amount")}
                          >
                            <div className="flex items-center gap-1.5 select-none">
                              {t("Total Amount")}
                              {sortConfig?.key === "amount" ? (
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
                          <TableHead className="text-right pr-6 w-[15%]">
                            {t("Action")}
                          </TableHead>
                        </>
                      ) : (
                        /* CỘT CHO BẢNG PR */
                        <>
                          <TableHead
                            className="pl-6 cursor-pointer transition-colors w-[25%]"
                            onClick={() => handleSort("date")}
                          >
                            <div className="flex items-center gap-1.5 select-none">
                              {t("Request Code & Date")}
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
                        // Render Table Row tuỳ thuộc vào PO hay PR
                        if (activeTab === "PO") {
                          return (
                            <TableRow
                              key={item.purchaseOrderId}
                              className="group hover:bg-slate-50/50 transition-colors"
                              onClick={() => {
                                const selection = window.getSelection();
                                if (
                                  selection &&
                                  selection.toString().length > 0
                                ) {
                                  return; 
                                }
                                handleReviewPO(item.purchaseOrderId);
                              }}
                            >
                              <TableCell className="pl-6">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-700">
                                    {item.purchaseOrderCode}
                                  </span>
                                  <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                    <CalendarDays className="w-3 h-3" />{" "}
                                    {formatDate(item.createdAt)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col text-left">
                                  <span className="font-medium text-slate-800">
                                    {item.supplierName}
                                  </span>
                                  <span className="text-xs text-slate-500 mt-0.5">
                                    {item.items?.length || 0} {t("items")}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                  <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                                  <span className="truncate">
                                    {item.projectName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-bold text-slate-800">
                                  {formatCurrency(item.totalAmount)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    item.status === "Draft"
                                      ? "bg-slate-100 text-slate-600 border-slate-200"
                                      : item.status.includes("Pending")
                                        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                        : item.status.includes("Reject")
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : item.status === "AdminApproved"
                                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }
                                >
                                  {t(formatPascalCase(item.status))}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleReviewPO(item.purchaseOrderId)
                                  }
                                  disabled={loadingId === item.purchaseOrderId}
                                  variant={
                                    item.status === "AdminApproved"
                                      ? "default"
                                      : "outline"
                                  }
                                  className={
                                    item.status === "AdminApproved"
                                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-[160px]"
                                      : "text-indigo-600 border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 w-[100px]"
                                  }
                                >
                                  {loadingId === item.purchaseOrderId ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : item.status === "AdminApproved" ? (
                                    <>
                                      {t("Sent to Supplier")}{" "}
                                      <ArrowRight className="w-4 h-4 ml-1.5" />
                                    </>
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
                          // PR ROW RENDER
                          return (
                            <TableRow
                              key={item.requestId}
                              className="group hover:bg-slate-50/50 transition-colors"
                              onClick={() => {
                                const selection = window.getSelection();
                                if (
                                  selection &&
                                  selection.toString().length > 0
                                ) {
                                  return; 
                                }
                                handleReviewPR(item.requestId)
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
                                  {item.status ? t(item.status) : t("Unknown")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex justify-end items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleReviewPR(item.requestId)
                                    }
                                    disabled={loadingId === item.requestId}
                                    variant="default"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-[150px]"
                                  >
                                    {loadingId === item.requestId ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        {t("Create PO Draft")}{" "}
                                        <ArrowRight className="w-4 h-4 ml-1.5" />
                                      </>
                                    )}
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
                                        onClick={() =>
                                          handleViewPRDetail(item.requestId)
                                        }
                                      >
                                        <Eye className="w-4 h-4 mr-2 focus:text-primary" />{" "}
                                        {t("View Alert Details")}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
