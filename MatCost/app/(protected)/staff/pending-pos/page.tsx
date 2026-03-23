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
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Delete,
  Truck,
  AlertCircle,
  Clock,
  Building2,
  ListOrdered,
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
  staffReceiptsApi,
  PendingPurchaseOrderDto,
} from "@/services/import-service"; // Đảm bảo đúng đường dẫn file api
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { endOfDay, format, isWithinInterval, startOfDay, isBefore, isToday, isAfter } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function PendingDeliveriesPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [orders, setOrders] = useState<PendingPurchaseOrderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [filterTimeframe, setFilterTimeframe] = useState<
    "All" | "Overdue" | "Today" | "Upcoming"
  >("All");

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
    key: "date" | "items";
    direction: "asc" | "desc";
  } | null>(null);

  const handleSort = (key: "date" | "items") => {
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
        const res = await staffReceiptsApi.getPendingPurchaseOrders();
        setOrders(res.data);
      } catch (error) {
        console.error("Failed to fetch pending deliveries", error);
        toast.error(t("Failed to fetch pending deliveries"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [t]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTimeframe, sortConfig, itemsPerPage, dateRange]);

  const filteredData = orders.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      item.poCode?.toLowerCase().includes(searchLower) ||
      item.supplierName?.toLowerCase().includes(searchLower);

    let matchesTimeframe = true;
    const itemDate = new Date(item.expectedDeliveryDate);
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    if (filterTimeframe === "Overdue") {
      matchesTimeframe = isBefore(itemDate, todayStart);
    } else if (filterTimeframe === "Today") {
      matchesTimeframe = isToday(itemDate);
    } else if (filterTimeframe === "Upcoming") {
      matchesTimeframe = isAfter(itemDate, todayEnd);
    }

    let matchesDateRange = true;
    if (dateRange.from || dateRange.to) {
      const fromDate = dateRange.from ? startOfDay(dateRange.from) : new Date(2000, 0, 1);
      const toDate = dateRange.to ? endOfDay(dateRange.to) : new Date(2100, 0, 1);

      matchesDateRange = isWithinInterval(itemDate, {
        start: fromDate,
        end: toDate,
      });
    }

    return matchesSearch && matchesTimeframe && matchesDateRange;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;

    if (sortConfig.key === "date") {
      const dateA = new Date(a.expectedDeliveryDate).getTime();
      const dateB = new Date(b.expectedDeliveryDate).getTime();
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }

    if (sortConfig.key === "items") {
      const qtyA = a.items?.length || 0;
      const qtyB = b.items?.length || 0;
      return sortConfig.direction === "asc" ? qtyA - qtyB : qtyB - qtyA;
    }

    return 0;
  });

  const isAll = itemsPerPage === -1;
  const totalPages = isAll
    ? 1
    : Math.ceil(sortedData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * (isAll ? sortedData.length : itemsPerPage);
  const endIndex = isAll ? sortedData.length : startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const handleReceiveGoods = (id: number) => {
    setLoadingId(id);
    router.push(`/staff/pending-pos/create?poId=${id}`); 
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm");
  };

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  
  const totalPending = orders.length;
  const todayCount = orders.filter(o => isToday(new Date(o.expectedDeliveryDate))).length;
  const overdueCount = orders.filter(o => isBefore(new Date(o.expectedDeliveryDate), todayStart)).length;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Inbound Management")} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {t("Pending Deliveries")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("Track incoming supplier deliveries and initiate receiving processes.")}
              </p>
            </div>
          </div>

          {/* CARDS THỐNG KÊ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    {t("Total Inbound POs")}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {totalPending}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    {t("Expected Today")}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {todayCount}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-lg">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    {t("Overdue Deliveries")}
                  </p>
                  <h3 className="text-2xl font-bold">
                    {overdueCount}
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
                    value={filterTimeframe}
                    onValueChange={(
                      value: "All" | "Overdue" | "Today" | "Upcoming"
                    ) => setFilterTimeframe(value)}
                  >
                    <SelectTrigger className="w-[170px] bg-white border-slate-200 shadow-sm h-9 cursor-pointer">
                      <SelectValue placeholder={t("Filter by timeframe")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">{t("All Deliveries")}</SelectItem>
                      <SelectItem value="Overdue" className="text-rose-600 font-medium">{t("Overdue")}</SelectItem>
                      <SelectItem value="Today" className="text-emerald-600 font-medium">{t("Expected Today")}</SelectItem>
                      <SelectItem value="Upcoming">{t("Upcoming")}</SelectItem>
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
                    placeholder={t("Search PO Code, Supplier...")}
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
                        className="pl-6 cursor-pointer transition-colors w-[25%]"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1.5 select-none">
                          {t("Expected Delivery")}
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
                        {t("Purchase Order & Supplier")}
                      </TableHead>

                      <TableHead
                        className="cursor-pointer transition-colors w-[25%]"
                        onClick={() => handleSort("items")}
                      >
                        <div className="flex items-center gap-1.5 select-none">
                          {t("Materials to Receive")}
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

                      <TableHead className="text-right pr-6 w-[20%]">
                        {t("Action")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center">
                          <div className="flex justify-center items-center gap-2 text-indigo-600">
                            <Loader2 className="w-6 h-6 animate-spin" />{" "}
                            {t("Loading inbound deliveries...")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-32 text-center text-slate-500"
                        >
                          {t("No pending deliveries found.")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((item) => {
                        const expectedDate = new Date(item.expectedDeliveryDate);
                        const isLate = isBefore(expectedDate, todayStart);
                        const isTdy = isToday(expectedDate);

                        return (
                          <TableRow
                            key={item.purchaseOrderId}
                            className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                            onClick={() => {
                              const selection = window.getSelection();
                              if (selection && selection.toString().length > 0) return;
                              handleReceiveGoods(item.purchaseOrderId);
                            }}
                          >
                            <TableCell className="pl-6">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`font-semibold ${isLate ? "text-rose-600" : isTdy ? "text-emerald-600" : "text-slate-800"}`}>
                                    {formatDateTime(item.expectedDeliveryDate)}
                                  </span>
                                  {isLate && (
                                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 px-1 py-0 uppercase text-[9px]">
                                      {t("Overdue")}
                                    </Badge>
                                  )}
                                  {isTdy && (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-1 py-0 uppercase text-[9px]">
                                      {t("Today")}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  {t("Estimated Time of Arrival")}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-col text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-700">
                                    {item.poCode}
                                  </span>
                                </div>
                                <span className="text-sm text-slate-600 flex items-center gap-1.5 mt-1 font-medium">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                  {item.supplierName}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-col items-start">
                                <span className="font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 flex items-center gap-1.5">
                                  <ListOrdered className="w-3.5 h-3.5" />
                                  {item.items?.length || 0} {t("Items")}
                                </span>
                                <span className="text-xs text-slate-500 mt-1.5 italic">
                                  {item.items?.map(i => i.materialName).join(", ")}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="text-right pr-6">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // Tránh gọi click của TableRow 2 lần
                                  handleReceiveGoods(item.purchaseOrderId);
                                }}
                                disabled={loadingId === item.purchaseOrderId}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-32"
                              >
                                {loadingId === item.purchaseOrderId ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Package className="w-4 h-4 mr-2" />
                                    {t("Receive")}
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
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