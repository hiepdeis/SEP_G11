"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  Search,
  Loader2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Delete,
  FileText,
  Receipt,
  Building2,
  CheckCircle2,
  Lock,
  Eye,
  ArrowRight,
  UserSquare2,
  Info,
  Stamp, // Icon cho Supplier
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
  accountantReceiptsApi,
  managerReceiptsApi,
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
import { formatDateTime } from "@/lib/format-date-time";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StaffInboundRequest from "@/components/pages/inbound-requests-staff/page";

export default function SharedReceiptsListPage({
  role = "accountant",
}: {
  role?: "manager" | "accountant" | "admin";
}) {
  const router = useRouter();
  const { t } = useTranslation();

  const [receipts, setReceipts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [filterStatus, setFilterStatus] = useState<string>(
    role === "manager"
      ? "ReadyForStamp"
      : role === "admin"
        ? "Closed"
        : "Stamped",
  );

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
    key: "date" | "receiptCode";
    direction: "asc" | "desc";
  } | null>(null);

  const handleSort = (key: "date" | "receiptCode") => {
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

  const getItemDate = (item: any) =>
    role === "manager" ? item.putawayCompletedAt : item.stampedAt;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let res;
        if (role === "manager") {
          res = await managerReceiptsApi.getReceipts();
        } else {
          // Both accountant and admin use the accountant API
          res = await accountantReceiptsApi.getReceipts();
        }
        setReceipts(res.data);
      } catch (error) {
        console.error(`Failed to fetch ${role} receipts`, error);
        toast.error(t("Failed to fetch receipts list"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [role, t]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortConfig, itemsPerPage, dateRange]);

  // 1. Lọc dữ liệu
  const filteredData = receipts.filter((item) => {
    let matchesStatus = true;
    if (filterStatus === "History") {
      matchesStatus = item.status === "Closed";
    } else if (filterStatus !== "All") {
      matchesStatus = item.status === filterStatus;
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      item.receiptCode?.toLowerCase().includes(searchLower) ||
      item.purchaseOrderCode?.toLowerCase().includes(searchLower);

    let matchesDate = true;
    const itemDateRaw = getItemDate(item);

    if (dateRange.from || dateRange.to) {
      if (!itemDateRaw) {
        matchesDate = false;
      } else {
        const itemDate = new Date(itemDateRaw);
        const fromDate = dateRange.from
          ? startOfDay(dateRange.from)
          : new Date(2000, 0, 1);
        const toDate = dateRange.to
          ? endOfDay(dateRange.to)
          : new Date(2100, 0, 1);

        matchesDate = isWithinInterval(itemDate, {
          start: fromDate,
          end: toDate,
        });
      }
    }

    return matchesStatus && matchesSearch && matchesDate;
  });

  // 2. Sắp xếp dữ liệu
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;

    if (sortConfig.key === "date") {
      const dateA = getItemDate(a) ? new Date(getItemDate(a)).getTime() : 0;
      const dateB = getItemDate(b) ? new Date(getItemDate(b)).getTime() : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }

    if (sortConfig.key === "receiptCode") {
      const codeA = a.receiptCode || "";
      const codeB = b.receiptCode || "";
      return sortConfig.direction === "asc"
        ? codeA.localeCompare(codeB)
        : codeB.localeCompare(codeA);
    }

    return 0;
  });

  // 3. Phân trang
  const isAll = itemsPerPage === -1;
  const totalPages = isAll
    ? 1
    : Math.ceil(sortedData.length / itemsPerPage) || 1;
  const startIndex =
    (currentPage - 1) * (isAll ? sortedData.length : itemsPerPage);
  const endIndex = isAll ? sortedData.length : startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Xử lý nút xem chi tiết dựa vào Role
  const handleReview = (id: number) => {
    setLoadingId(id);
    const basePath =
      role === "manager"
        ? "/manager/inbound-requests"
        : role === "admin"
          ? "/admin/inbound-requests"
          : "/accountant/inbound-requests";
    router.push(`${basePath}/${id}`);
  };

  const pendingCloseCount = receipts.filter(
    (item) => item.status === "Stamped",
  ).length;
  const closedCount = receipts.filter(
    (item) => item.status === "Closed",
  ).length;
  const pendingStampCount = receipts.filter(
    (item) => item.status === "ReadyForStamp",
  ).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Closed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Stamped":
        if (role === "manager")
          return "bg-emerald-50 text-emerald-700 border-emerald-200";
        else return "bg-amber-50 text-amber-700 border-amber-200";
      case "ReadyForStamp":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header
          title={
            role === "manager"
              ? t("Manager Dashboard")
              : role === "admin"
                ? t("Admin Dashboard")
                : t("Accounting Dashboard")
          }
        />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <Tabs defaultValue="manager" className="w-full flex flex-col h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {t("Inbound Receipts")}
                </h1>
                <p className="text-sm text-slate-500">
                  {role === "manager"
                    ? t(
                        "Review completed putaway receipts and monitor warehouse inbound operations.",
                      )
                    : t(
                        "Review completed warehouse receipts and finalize accounting records to close them.",
                      )}
                </p>
              </div>
              {role === "manager" && (
                <div className="flex flex-col md:items-end gap-1.5 w-full md:w-auto">
                  <TabsList className="grid w-full md:w-[350px] grid-cols-2">
                    <TabsTrigger
                      value="manager"
                      className="transition-all duration-300 ease-in-out"
                    >
                      {t("Manager Portal")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="warehouse"
                      className="transition-all duration-300 ease-in-out"
                    >
                      {t("Staff Portal")}
                    </TabsTrigger>
                  </TabsList>
                  <div className="text-[11px] text-slate-400 flex items-center justify-center md:justify-end gap-1.5 pr-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>{t("Switch tabs to view specific role tasks")}</span>
                  </div>
                </div>
              )}
            </div>
            <TabsContent value="warehouse" className="mt-6 flex-1 outline-none">
              <StaffInboundRequest role="manager" />
            </TabsContent>
            <TabsContent
              value="manager"
              className="flex flex-col space-y-6 mt-6 flex-1 outline-none"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">
                        {t("Total Receipts")}
                      </p>
                      <h3 className="text-2xl font-bold text-slate-900">
                        {receipts.length}
                      </h3>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">
                        {role === "manager"
                          ? t("Stamped")
                          : t("Pending Accounting Review")}
                      </p>
                      <h3 className="text-2xl font-bold">
                        {pendingCloseCount}
                      </h3>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
                      {role === "accountant" ? (
                        <Lock className="w-6 h-6" />
                      ) : (
                        <Stamp className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">
                        {role === "accountant"
                          ? t("Closed Receipts")
                          : t("Pending Stamp")}
                      </p>
                      {role === "accountant" ? (
                        <h3 className="text-2xl font-bold text-slate-900">
                          {closedCount}
                        </h3>
                      ) : (
                        <h3 className="text-2xl font-bold text-slate-900">
                          {pendingStampCount}
                        </h3>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] gap-0 pb-0 flex flex-col">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-slate-500 hidden md:block">
                        {t("Filters")}:
                      </span>

                      <Select
                        value={filterStatus}
                        onValueChange={(value) => setFilterStatus(value)}
                      >
                        <SelectTrigger className="w-[200px] bg-white border-slate-200 shadow-sm h-9 cursor-pointer">
                          <SelectValue placeholder={t("Filter by status")} />
                        </SelectTrigger>

                        {role === "manager" ? (
                          <SelectContent>
                            <SelectItem value="ReadyForStamp">
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200"
                              >
                                {t("Ready For Stamp")}
                              </Badge>
                            </SelectItem>
                            <SelectItem value="Stamped">
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-200"
                              >
                                {t("Stamped")}
                              </Badge>
                            </SelectItem>
                            <SelectItem value="History">
                              <Badge
                                variant="outline"
                                className="bg-slate-100 text-slate-700 border-slate-200"
                              >
                                {t("History")}
                              </Badge>
                            </SelectItem>
                            <SelectItem value="All">
                              <Badge
                                variant="outline"
                                className="bg-slate-50 text-slate-700 border-slate-200"
                              >
                                {t("All")}
                              </Badge>
                            </SelectItem>
                          </SelectContent>
                        ) : role === "admin" ? (
                          <SelectContent>
                            <SelectItem value="Closed">
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-200"
                              >
                                {t("Closed")}
                              </Badge>
                            </SelectItem>
                          </SelectContent>
                        ) : (
                          <SelectContent>
                            <SelectItem value="Stamped">
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200"
                              >
                                {t("Pending Closure")}
                              </Badge>
                            </SelectItem>
                            <SelectItem value="Closed">
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                              >
                                {t("Closed")}
                              </Badge>
                            </SelectItem>
                            <SelectItem value="All">
                              <Badge
                                variant="outline"
                                className="bg-slate-50 text-slate-700 border-slate-200"
                              >
                                {t("All")}
                              </Badge>
                            </SelectItem>
                          </SelectContent>
                        )}
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
                              <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
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
                                setDateRange((prev) => ({
                                  ...prev,
                                  from: date,
                                }))
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
                              <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
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
                        placeholder={t("Search Receipt, PO...")}
                        className="pl-9 h-9"
                        maxLength={50}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0 flex flex-col justify-between flex-1">
                  <div className="[&>div]:max-h-[450px] [&>div]:min-h-[450px] [&>div]:overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                        <TableRow className="bg-slate-50">
                          <TableHead
                            className="cursor-pointer transition-colors w-[25%] pl-6"
                            onClick={() => handleSort("receiptCode")}
                          >
                            <div className="flex items-center gap-1.5 select-none">
                              {t("Receipt & PO Code")}
                              {sortConfig?.key === "receiptCode" ? (
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

                          <TableHead
                            className="cursor-pointer transition-colors w-[25%]"
                            onClick={() => handleSort("date")}
                          >
                            <div className="flex items-center gap-1.5 select-none">
                              {role === "manager"
                                ? t("Putaway Date")
                                : t("Stamped Date")}
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
                            {role === "manager" ? t("Supplier") : t("Supplier")}
                          </TableHead>

                          <TableHead className="w-[15%] text-center">
                            {t("Status")}
                          </TableHead>
                          <TableHead className="text-right pr-6 w-[15%]">
                            {t("Action")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center">
                              <div className="flex justify-center items-center gap-2 text-indigo-600">
                                <Loader2 className="w-6 h-6 animate-spin" />{" "}
                                {t("Loading receipts...")}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : paginatedData.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="h-32 text-center text-slate-500"
                            >
                              {t("No receipts found.")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedData.map((item) => (
                            <TableRow
                              key={item.receiptId}
                              className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                              onClick={() => {
                                const selection = window.getSelection();
                                if (
                                  selection &&
                                  selection.toString().length > 0
                                )
                                  return;
                                handleReview(item.receiptId);
                              }}
                            >
                              <TableCell>
                                <div className="flex flex-col pl-4">
                                  <div className="flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-slate-400" />
                                    <span className="font-bold text-slate-800">
                                      {item.receiptCode}
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                    PO:{" "}
                                    <span className="font-mono bg-slate-100 px-1 rounded">
                                      {item.purchaseOrderCode || "N/A"}
                                    </span>
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell className="">
                                <span className="flex gap-2 text-slate-800 items-center">
                                  <CalendarDays className="w-3.5 h-3.5" />
                                  {formatDateTime(getItemDate(item))}
                                </span>
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {role === "manager" ? (
                                    <UserSquare2 className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <Building2 className="w-4 h-4 text-slate-400" />
                                  )}
                                  <span className="text-sm font-medium text-slate-700">
                                    {role === "manager"
                                      ? item.supplierName ||
                                        t("Unknown Supplier")
                                      : item.supplierName ||
                                        t("Unknown Supplier")}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={getStatusBadge(item.status)}
                                >
                                  {item.status === "Stamped" &&
                                  role === "accountant"
                                    ? t("Pending Closure")
                                    : t(formatPascalCase(item.status))}
                                </Badge>
                              </TableCell>

                              <TableCell className="text-right pr-6">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReview(item.receiptId);
                                  }}
                                  disabled={loadingId === item.receiptId}
                                  variant={
                                    (item.status === "Stamped" &&
                                      role === "accountant") ||
                                    (item.status === "ReadyForStamp" &&
                                      role === "manager")
                                      ? "default"
                                      : "outline"
                                  }
                                  className={
                                    (item.status === "Stamped" &&
                                      role === "accountant") ||
                                    (item.status === "ReadyForStamp" &&
                                      role === "manager")
                                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm min-w-[200px]"
                                      : "text-slate-600 border-slate-200 hover:text-indigo-600 hover:bg-indigo-50 min-w-[200px]"
                                  }
                                >
                                  {loadingId === item.receiptId ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (item.status === "Stamped" &&
                                      role === "accountant") ||
                                    (item.status === "ReadyForStamp" &&
                                      role === "manager") ? (
                                    <>
                                      {t("Review")}{" "}
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
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* PAGINATION */}
                  {!isLoading && filteredData.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4 mt-auto">
                      <div className="text-sm text-slate-500">
                        {t("Showing")}{" "}
                        <span className="font-medium text-slate-900">
                          {startIndex + 1}
                        </span>{" "}
                        {t("to")}{" "}
                        <span className="font-medium text-slate-900">
                          {Math.min(endIndex, filteredData.length)}
                        </span>{" "}
                        {t("of")}{" "}
                        <span className="font-medium text-slate-900">
                          {filteredData.length}
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
                            onValueChange={(val) =>
                              setItemsPerPage(Number(val))
                            }
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
                            <ChevronLeft className="w-4 h-4 mr-1" />{" "}
                            {t("Previous")}
                          </Button>
                          <div className="text-sm font-medium text-slate-600 px-2 min-w-[80px] text-center">
                            {t("Page")} {currentPage} {t("of")} {totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(prev + 1, totalPages),
                              )
                            }
                            disabled={currentPage === totalPages}
                            className="h-8"
                          >
                            {t("Next")}{" "}
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
