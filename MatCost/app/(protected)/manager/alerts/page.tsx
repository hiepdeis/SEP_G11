"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  Search,
  ArrowRight,
  Loader2,
  CalendarDays,
  Package,
  BellRing,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
  Delete,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
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
  managerStockShortageAlertApi,
  StockShortageAlertDto,
} from "@/services/import-service"; // Cập nhật đường dẫn service
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

export default function StockShortageAlertListPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [alerts, setAlerts] = useState<StockShortageAlertDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [filterStatus, setFilterStatus] = useState<
    "All" | "Pending" | "ManagerConfirmed" | "PRCreated"
  >("Pending");

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
    key: "date" | "quantity";
    direction: "asc" | "desc";
  } | null>(null);

  const handleSort = (key: "date" | "quantity") => {
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
        const res = await managerStockShortageAlertApi.getAlerts();
        setAlerts(res.data);
      } catch (error) {
        console.error("Failed to fetch alerts", error);
        toast.error(t("Failed to fetch stock shortage alerts"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [t]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortConfig, itemsPerPage, dateRange]);

  // 1. Lọc dữ liệu
  const filteredData = alerts.filter((item) => {
    let matchesStatus = true;

    if (filterStatus !== "All") {
      matchesStatus = item.status === filterStatus;
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      item.materialName?.toLowerCase().includes(searchLower) ||
      item.materialCode?.toLowerCase().includes(searchLower);

    let matchesDate = true;
    if (dateRange.from || dateRange.to) {
      if (!item.createdAt) {
        matchesDate = false;
      } else {
        const itemDate = new Date(item.createdAt);
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
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }

    if (sortConfig.key === "quantity") {
      const qtyA = a.currentQuantity || 0;
      const qtyB = b.currentQuantity || 0;
      return sortConfig.direction === "asc" ? qtyA - qtyB : qtyB - qtyA;
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

  const handleReview = (id: number) => {
    setLoadingId(id);
    router.push(`/manager/alerts/${id}`);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const formatPlus = (num: number) => (num > 999 ? "999+" : num);

  // Thống kê
  const pendingCount = alerts.filter(
    (item) => item.status === "Pending",
  ).length;
  const highPriorityCount = alerts.filter(
    (item) => item.priority === "High" && item.status === "Pending",
  ).length;
  const confirmedCount = alerts.filter(
    (item) => item.status === "ManagerConfirmed" || item.status === "PRCreated",
  ).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "ManagerConfirmed":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "PRCreated":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

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
        <Header title={t("Warehouse Dashboard")}></Header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {t("Stock Shortage Alerts")}
              </h1>
              <p className="text-sm text-slate-500">
                {t(
                  "Review system-generated alerts and confirm requested restock quantities.",
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
                  <BellRing className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    {t("Pending Alerts")}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {formatPlus(pendingCount)}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    {t("High Priority")}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {formatPlus(highPriorityCount)}
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
                    {t("Confirmed")}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {formatPlus(confirmedCount)}
                  </h3>
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
                    onValueChange={(
                      value:
                        | "All"
                        | "Pending"
                        | "ManagerConfirmed"
                        | "PRCreated",
                    ) => setFilterStatus(value)}
                  >
                    <SelectTrigger className="bg-white border-slate-200 shadow-sm h-9 cursor-pointer">
                      <SelectValue placeholder={t("Filter by status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">
                        <Badge
                          variant="outline"
                          className="bg-slate-50 text-slate-700 border-slate-200"
                        >
                          {t("All")}
                        </Badge>
                      </SelectItem>
                      <SelectItem value="Pending">
                        <Badge
                          variant="outline"
                          className="bg-rose-50 text-rose-700 border-rose-200"
                        >
                          {t("Pending")}
                        </Badge>
                      </SelectItem>
                      <SelectItem value="ManagerConfirmed">
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-200"
                        >
                          {t("Confirmed")}
                        </Badge>
                      </SelectItem>
                      <SelectItem
                        className="text-emerald-600"
                        value="PRCreated"
                      >
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          {t("PR Created")}
                        </Badge>
                      </SelectItem>
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
                    placeholder={t("Search material...")}
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
                          {t("Current Stock")}
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
                        {t("Suggested Quantity")}
                      </TableHead>
                      <TableHead className="w-[15%] text-center">
                        {t("Status")}
                      </TableHead>
                      <TableHead className="text-right pr-6 w-[10%]">
                        {t("Action")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex justify-center items-center gap-2 text-indigo-600">
                            <Loader2 className="w-6 h-6 animate-spin" />{" "}
                            {t("Loading alerts...")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-32 text-center text-slate-500"
                        >
                          {t("No alerts found.")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((item) => (
                        <TableRow
                          key={item.alertId}
                          className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                          onClick={() => {
                            const selection = window.getSelection();
                            if (selection && selection.toString().length > 0) {
                              return;
                            }
                            handleReview(item.alertId);
                          }}
                        >
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-700">
                                  #{item.alertId}
                                </span>
                                {item.status === "Pending" && (
                                  <span className="flex h-2 w-2 rounded-full bg-rose-500" />
                                )}
                              </div>
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
                              <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Package className="w-3 h-3" />{" "}
                                {item.warehouseName || t("Main Warehouse")}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-rose-600">
                                {item.currentQuantity.toLocaleString("vi-VN")}
                              </span>
                              <span className="text-[11px] text-slate-500 mt-0.5">
                                Min: {item.minStockLevel}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <span className="font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                              +
                              {item.suggestedQuantity?.toLocaleString(
                                "vi-VN",
                              ) || 0}
                            </span>
                          </TableCell>

                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={getStatusBadge(item.status)}
                            >
                              {item.status == "PRCreated"
                                ? "PR Created"
                                : item.status == "ManagerConfirmed"
                                  ? "Confirmed"
                                  : t(item.status)}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              onClick={() => handleReview(item.alertId)}
                              disabled={loadingId === item.alertId}
                              variant={
                                item.status === "Pending"
                                  ? "default"
                                  : "outline"
                              }
                              className={
                                item.status === "Pending"
                                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-[200px]"
                                  : "text-indigo-600 border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 w-[200px]"
                              }
                            >
                              {loadingId === item.alertId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : item.status === "Pending" ? (
                                <>
                                  {t("Review")}{" "}
                                  <ArrowRight className="w-4 h-4 ml-1.5" />
                                </>
                              ) : (
                                <>
                                  {t("View")} <Eye className="w-4 h-4 ml-1.5" />
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
                        {t("Rows per page")}:
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
