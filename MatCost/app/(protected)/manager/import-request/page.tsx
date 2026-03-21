"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  Clock,
  Search,
  ArrowRight,
  FileCheck,
  Loader2,
  CalendarDays,
  MapPin,
  DollarSign,
  FileText,
  FileMinus,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
  Delete,
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
  managerReceiptApi,
  PendingReceiptDto,
} from "@/services/receipt-service";
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

export default function ManagerImportRequestPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [requests, setRequests] = useState<PendingReceiptDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [filterStatus, setFilterStatus] = useState<
    "All" | "Submitted" | "History"
  >("Submitted");

  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  const [sortConfig, setSortConfig] = useState<{
    key: "date" | "total";
    direction: "asc" | "desc";
  } | null>(null);

  const handleSort = (key: "date" | "total") => {
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
        const res = await managerReceiptApi.getPendingApprovals();
        setRequests(res.data);
      } catch (error) {
        console.error("Failed to fetch manager pending receipts", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortConfig, itemsPerPage, dateRange]);

  const filteredData = requests.filter((item) => {
    let matchesStatus = true;

    if (filterStatus === "Submitted") {
      matchesStatus = item.status === "Submitted";
    } else if (filterStatus === "History") {
      matchesStatus = item.status !== "Submitted";
    }

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.receiptCode.toString().includes(term) ||
      (item.warehouseName && item.warehouseName.toLowerCase().includes(term));

    let matchesDate = true;
    if (dateRange.from || dateRange.to) {
      if (!item.submittedDate) {
        matchesDate = false;
      } else {
        const itemDate = new Date(item.submittedDate);

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

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;

    if (sortConfig.key === "date") {
      const dateA = a.submittedDate ? new Date(a.submittedDate).getTime() : 0;
      const dateB = b.submittedDate ? new Date(b.submittedDate).getTime() : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }

    if (sortConfig.key === "total") {
      const itemsA = a.totalAmount || 0;
      const itemsB = b.totalAmount || 0;
      return sortConfig.direction === "asc" ? itemsA - itemsB : itemsB - itemsA;
    }

    return 0;
  });

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

    router.push(`import-request/${id}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return "0 ₫";
    return val.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
  };

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const waitingCount = requests.filter(
    (item) => item.status === "Submitted",
  ).length;

  const pendingValue = requests
    .filter((item) => item.status === "Submitted")
    .reduce((sum, item) => sum + (item.totalAmount || 0), 0);

  const approvedCount = requests.filter((item) => {
    if (!item.submittedDate) return false;
    return (
      item.status === "Approved" && new Date(item.submittedDate) >= sevenDaysAgo
    );
  }).length;

  const rejectedCount = requests.filter((item) => {
    if (!item.submittedDate) return false;
    return (
      item.status === "Rejected" && new Date(item.submittedDate) >= sevenDaysAgo
    );
  }).length;

  const formatPlus = (num: number) => (num > 999 ? "999+" : num);

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Manager Dashboard")} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {t("Approval Queue")}
            </h1>
            <p className="text-sm text-slate-500">
              {t(
                "Review receipts processed by Accountants and make final approval.",
              )}
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    {t("Waiting for Approval")}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {formatPlus(waitingCount)}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    {t("Total Pending Value")}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {formatCurrency(pendingValue)}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    {t("Approved last 7 days")}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {formatPlus(approvedCount)}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                  <FileMinus className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    {t("Rejected last 7 days")}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {formatPlus(rejectedCount)}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] gap-0 pb-0">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-slate-500 hidden md:block">
                    {t("Filters")}:
                  </span>

                  <Select
                    value={filterStatus}
                    onValueChange={(value: "Submitted" | "History" | "All") =>
                      setFilterStatus(value)
                    }
                  >
                    <SelectTrigger className="w-full md:w-[150px] bg-white border-slate-200 shadow-sm h-9">
                      <SelectValue placeholder={t("Filter by status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Submitted">
                        {t("Submitted")}
                      </SelectItem>
                      <SelectItem value="History">{t("History")}</SelectItem>
                      <SelectItem value="All">{t("All")}</SelectItem>
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
                        className="h-8 text-xs text-slate-500  px-2"
                        onClick={() =>
                          setDateRange({ from: undefined, to: undefined })
                        }
                      >
                        <Delete className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* NHÓM BÊN PHẢI: KHỐI SEARCH BAR */}
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder={t("Search Receipt Code...")}
                    className="pl-9 bg-white shadow-sm h-9"
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
                      {/* Cột Receipt Code & Date: Click để sort theo date */}
                      <TableHead
                        className="pl-6 cursor-pointer transition-colors"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1.5 select-none">
                          {t("Receipt Code")}
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

                      <TableHead>{t("Warehouse")}</TableHead>

                      {/* Cột Total Amount: Click để sort theo total */}
                      <TableHead
                        className="text-right cursor-pointer transition-colors"
                        onClick={() => handleSort("total")}
                      >
                        <div className="flex items-center justify-end gap-1.5 select-none">
                          {t("Total Amount")}
                          {sortConfig?.key === "total" ? (
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

                      <TableHead className="text-center">
                        {t("Status")}
                      </TableHead>
                      <TableHead className="text-right pr-6">
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
                            {t("Loading requests...")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-32 text-center text-slate-500 hover:slate-50"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <FileText className="w-8 h-8 text-slate-300" />
                            <p>{t("No pending approvals found.")}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((item) => (
                        <TableRow
                          key={item.receiptCode}
                          className="group hover:bg-slate-50/50 transition-colors"
                        >
                          {/* ID & Date */}
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700">
                                {item.receiptCode}
                              </span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />{" "}
                                {formatDate(item.submittedDate)}
                              </span>
                            </div>
                          </TableCell>

                          {/* Warehouse */}
                          <TableCell>
                            <div className="flex items-center gap-2 text-slate-600">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              {item.warehouseName || t("N/A")}
                            </div>
                          </TableCell>

                          {/* Total Amount */}
                          <TableCell className="text-right">
                            <span className="font-bold text-slate-800">
                              {formatCurrency(item.totalAmount)}
                            </span>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`
                                        ${
                                          item.status === "Submitted"
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : item.status === "Approved"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : item.status === "Rejected"
                                                ? "bg-red-50 text-red-700 border-red-200"
                                                : item.status === "GoodsArrived"
                                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                                  : item.status === "Completed"
                                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                    : "bg-gray-50 text-gray-700 border-gray-200"
                                        }
                                      `}
                            >
                              {item.status === "GoodsArrived"
                                ? t("Goods Arrived")
                                : t(item.status)}
                            </Badge>
                          </TableCell>

                          {/* Action */}
                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              onClick={() => handleReview(item.receiptId)}
                              disabled={loadingId === item.receiptId}
                              variant={
                                item.status === "Submitted"
                                  ? "default"
                                  : "outline"
                              }
                              className={`w-[100px] ${
                                item.status === "Submitted"
                                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                  : "text-indigo-600 border border-indigo-200 hover:bg-indigo-50 hover:text-primary"
                              }`}
                            >
                              {loadingId === item.receiptId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : item.status === "Submitted" ? (
                                <>
                                  {t("Process")}{" "}
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
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4">
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
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="-1">{t("All")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Các nút chuyển trang */}
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
                            Math.min(prev + 1, totalPages),
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
