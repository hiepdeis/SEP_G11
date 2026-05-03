"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  Search,
  Loader2,
  CalendarDays,
  FileText,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Delete,
  Building2,
  CircleDollarSign,
  CheckCircle2, // Thêm icon cho admin
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
  accountantPurchaseOrderApi,
  adminPurchaseOrderApi, // Thêm API Admin
  PurchaseOrderDto,
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
import { formatCurrency } from "@/lib/format-currency";
import { formatDateTime } from "@/lib/format-date-time";
import { CurrencyLimitDisplay } from "@/components/ui/custom/currency-limit-display";

export default function AccountantPurchaseOrderListPage({
  role = "accountant",
}: {
  role?: "accountant" | "admin";
}) {
  const router = useRouter();
  const { t } = useTranslation();

  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [filterStatus, setFilterStatus] = useState<"All" | "Pending">(
    "Pending",
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
    key: "date" | "amount";
    direction: "asc" | "desc";
  } | null>(null);

  const handleSort = (key: "date" | "amount") => {
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

  // Trạng thái mục tiêu cần duyệt của từng Role
  const targetStatus = role === "admin" ? "AccountantApproved" : "Draft";

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let res;
        if (role === "admin") {
          res = await adminPurchaseOrderApi.getPendingOrders();
        } else {
          res = await accountantPurchaseOrderApi.getPendingOrders();
        }
        setOrders(res.data);
      } catch (error) {
        console.error(
          `Failed to fetch pending purchase orders for ${role}`,
          error,
        );
        toast.error(t("Failed to fetch pending purchase orders"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [t, role]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortConfig, itemsPerPage, dateRange]);

  // 1. Lọc dữ liệu
  const filteredData = orders.filter((item) => {
    let matchesStatus = true;

    if (filterStatus === "Pending") {
      matchesStatus = item.status === targetStatus;
    }

    const matchesSearch = item.purchaseOrderCode
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

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

    if (sortConfig.key === "amount") {
      const amtA = a.totalAmount || 0;
      const amtB = b.totalAmount || 0;
      return sortConfig.direction === "asc" ? amtA - amtB : amtB - amtA;
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

  // Điều hướng theo Role
  const handleReview = (id: number) => {
    setLoadingId(id);
    if (role === "admin") {
      router.push(`/admin/purchase-orders/${id}`);
    } else {
      router.push(`/accountant/purchase-orders/${id}`);
    }
  };

  const formatPlus = (num: number) => (num > 999 ? "999+" : num);

  const pendingCount = orders.filter(
    (item) => item.status === targetStatus,
  ).length;

  const totalAmountPending = orders
    .filter((item) => item.status === targetStatus)
    .reduce((sum, item) => sum + (item.totalAmount || 0), 0);

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header
          title={
            role === "admin" ? t("Admin Dashboard") : t("Accountant Dashboard")
          }
        />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {t("Purchase Orders")}
              </h1>
              <p className="text-sm text-slate-500">
                {role === "admin"
                  ? t("Review and formally approve final purchase orders.")
                  : t(
                      "Review and approve pricing for requested purchase orders.",
                    )}
              </p>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 gap-4 ${role === "accountant" ? "md:grid-cols-2" : ""}`}
          >
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className={`p-3 rounded-lg ${role === "admin" ? "bg-indigo-100 text-indigo-600" : "bg-yellow-100 text-yellow-600"}`}
                >
                  {role === "admin" ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <FileText className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    {t("Pending Reviews")}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {formatPlus(pendingCount)}
                  </h3>
                </div>
              </CardContent>
            </Card>

            {role === "accountant" && (
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                    <CircleDollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">
                      {t("Pending Value (Est.)")}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      <CurrencyLimitDisplay amount={totalAmountPending} />
                    </h3>
                  </div>
                </CardContent>
              </Card>
            )}
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
                    onValueChange={(value: "All" | "Pending") =>
                      setFilterStatus(value)
                    }
                  >
                    <SelectTrigger className="bg-white border-slate-200 shadow-sm h-9 cursor-pointer">
                      <SelectValue placeholder={t("Filter by status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-200"
                        >
                          {t("Pending Review")}
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
                    placeholder={t("Search PO Code...")}
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
                      <TableHead className="w-[20%]">{t("Supplier")}</TableHead>
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
                      <TableHead className="w-[15%]">{t("Status")}</TableHead>
                      <TableHead className="text-right pr-6 w-[15%]">
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
                          {t("No pending purchase orders found.")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((item) => (
                        <TableRow
                          key={item.purchaseOrderId}
                          className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                          onClick={() => {
                            const selection = window.getSelection();
                            if (selection && selection.toString().length > 0) {
                              return;
                            }
                            handleReview(item.purchaseOrderId);
                          }}
                        >
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700">
                                {item.purchaseOrderCode}
                              </span>
                              <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                <CalendarDays className="w-3 h-3" />{" "}
                                {formatDateTime(item.createdAt)}
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
                            <div className="font-bold text-slate-800">
                              {formatCurrency(item.totalAmount)}
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                item.status === targetStatus
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : "bg-slate-50 text-slate-700 border-slate-200"
                              }
                            >
                              {item.status === targetStatus
                                ? t("Pending Review")
                                : t(item.status)}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReview(item.purchaseOrderId);
                              }}
                              disabled={loadingId === item.purchaseOrderId}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-[200px]"
                            >
                              {loadingId === item.purchaseOrderId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  {role === "admin" ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                      {t("Review")}
                                    </>
                                  ) : (
                                    <>
                                      <Calculator className="w-4 h-4 mr-1.5" />
                                      {t("Review Price")}
                                    </>
                                  )}
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
