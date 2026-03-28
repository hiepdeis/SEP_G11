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
  ClipboardList,
  Eye,
  TriangleAlert,
  ShieldCheck,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
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
import { staffReceiptsApi } from "@/services/import-service";
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

interface ReceiptListItem {
  id: number;
  code: string;
  referenceCode?: string | null;
  date: string;
  creatorName: string;
  warehouseName: string;
  totalQuantity: number;
  status: string;
}

export default function InboundReceiptsPage({
  role = "staff",
}: {
  role: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const rolePath = role === "manager" ? "manager" : "staff";

  const [listItems, setListItems] = useState<ReceiptListItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pendingPutaway: 0,
    pendingIncident: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
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
    key: "date" | "quantity";
    direction: "asc" | "desc";
  } | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PendingIncident":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "ReadyForStamp":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "ReadyForPutaway":
      case "PartiallyPutaway":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "QCPassed":
        return "bg-green-50 text-green-700 border-green-200";
      case "PendingManagerReview":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

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
        const [receiptsRes, putawaysRes] = await Promise.all([
          staffReceiptsApi.getAllReceiptsForWarehouse(),
          staffReceiptsApi.getPendingPutawayReceipts(),
        ]);

        const rawReceipts = receiptsRes.data || [];
        const rawPutaways = putawaysRes.data || [];

        const unifiedList: ReceiptListItem[] = [];
        const seenReceiptIds = new Set<number>();

        rawPutaways.forEach((p) => {
          if (!seenReceiptIds.has(p.receiptId)) {
            seenReceiptIds.add(p.receiptId);
            unifiedList.push({
              id: p.receiptId,
              code: p.receiptCode || `Receipt #${p.receiptId}`,
              referenceCode: p.purchaseOrderCode,
              date: p.createdAt,
              creatorName: p.supplierName || "N/A",
              warehouseName: "N/A",
              totalQuantity: p.items?.length || 0,
              status: p.status || "Unknown",
            });
          }
        });

        rawReceipts.forEach((r) => {
          if (!seenReceiptIds.has(r.receiptId)) {
            seenReceiptIds.add(r.receiptId);
            unifiedList.push({
              id: r.receiptId,
              code: r.receiptCode || `Receipt #${r.receiptId}`,
              referenceCode: r.purchaseOrderCode,
              date: r.createdDate || "",
              creatorName: r.createdByName || "N/A",
              warehouseName: r.warehouseName || "N/A",
              totalQuantity: r.items?.length || 0,
              status: r.status || "Unknown",
            });
          }
        });

        setStats({
          total: seenReceiptIds.size,
          pendingPutaway: unifiedList.filter(
            (i) =>
              i.status === "ReadyForPutaway" || i.status === "PartiallyPutaway",
          ).length,
          pendingIncident: unifiedList.filter(
            (i) => i.status === "PendingIncident",
          ).length,
        });

        setListItems(unifiedList);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error(t("Failed to fetch receipt data"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [t]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortConfig, itemsPerPage, dateRange]);

  const filteredData = listItems.filter((item) => {
    if (item.status === "PendingIncident") return false;
    let matchesStatus = filterStatus === "All" || item.status === filterStatus;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      item.code.toLowerCase().includes(searchLower) ||
      item.referenceCode?.toLowerCase().includes(searchLower) ||
      item.creatorName.toLowerCase().includes(searchLower);

    let matchesDate = true;
    if (dateRange.from || dateRange.to) {
      if (!item.date) matchesDate = false;
      else {
        const itemDate = new Date(item.date);
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
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }
    if (sortConfig.key === "quantity") {
      return sortConfig.direction === "asc"
        ? a.totalQuantity - b.totalQuantity
        : b.totalQuantity - a.totalQuantity;
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

  const handleAction = (
    item: ReceiptListItem,
    isSecondaryAction: boolean = false,
  ) => {
    setLoadingId(item.id.toString());

    const basePath =
      role === "manager" ? "/manager/inbound-requests/staff-portal" : "/staff/inbound-requests";

    if (isSecondaryAction) {
      router.push(`${basePath}/${item.id}`);
    } else {
      if (item.status === "PendingIncident") {
      } else if (
        item.status === "ReadyForPutaway" ||
        item.status === "QCPassed"
      ) {
        router.push(`${basePath}/${item.id}/putaway`);
      } else {
        router.push(`${basePath}/${item.id}`);
      }
    }
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    let safeDateString = dateString;
    if (!safeDateString.includes("Z") && !safeDateString.includes("+")) {
      safeDateString = safeDateString.replace(" ", "T") + "Z";
    }
    return new Date(safeDateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const innerContent = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">
                {t("Total Receipts")}
              </p>
              <h3 className="text-2xl font-bold text-slate-900">
                {stats.total}
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
                {t("Pending Putaway")}
              </p>
              <h3 className="text-2xl font-bold">{stats.pendingPutaway}</h3>
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
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px] bg-white border-slate-200 shadow-sm h-9 cursor-pointer">
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
                  <SelectItem value="QCPassed">
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      {t("QC Passed")}
                    </Badge>
                  </SelectItem>
                  <SelectItem value="ReadyForPutaway">
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      {t("Ready For Putaway")}
                    </Badge>
                  </SelectItem>
                  <SelectItem value="PartiallyPutaway">
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      {t("Partially Putaway")}
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
                placeholder={t("Search Code, Creator...")}
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
                      {t("Date & Code")}
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
                    {t("Supplier & PO Ref")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer transition-colors w-[15%] text-center"
                    onClick={() => handleSort("quantity")}
                  >
                    <div className="flex items-center justify-center gap-1.5 select-none">
                      {t("Qty / Items")}
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
                  <TableHead className="text-right pr-6 w-[25%]">
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
                        {t("Loading data...")}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-slate-500"
                    >
                      {t("No records found.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow
                      key={item.id}
                      className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => {
                        const selection = window.getSelection();
                        if (selection && selection.toString().length > 0) {
                          return;
                        }
                        handleAction(item);
                      }}
                    >
                      <TableCell className="pl-6">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <ClipboardList className="w-4 h-4 text-indigo-500" />
                            <span className="font-semibold text-slate-800">
                              {item.code}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {formatDateTime(item.date)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-left">
                          {item.referenceCode ? (
                            <span className="text-md text-slate-600 font-medium">
                              {item.referenceCode}
                            </span>
                          ) : (
                            <span className="text-md text-slate-400 italic">
                              {t("N/A")}
                            </span>
                          )}
                          <span className="text-xs text-slate-500 mt-0.5">
                            {item.creatorName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold px-3 py-1 rounded-md bg-slate-100 text-slate-700">
                          {item.totalQuantity.toLocaleString("vi-VN")}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={getStatusBadge(item.status)}
                        >
                          {item.status === "ReadyForStamp"
                            ? "Pending Stamp"
                            : t(formatPascalCase(item.status))}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {(item.status === "PendingIncident" ||
                            item.status === "ReadyForPutaway" ||
                            item.status === "QCPassed") && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAction(item, true);
                                  }}
                                  className="cursor-pointer text-slate-700"
                                >
                                  <Eye className="w-4 h-4 mr-2 text-slate-400" />
                                  {t("View Details")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(item);
                            }}
                            disabled={loadingId === item.id.toString()}
                            variant={
                              item.status === "PendingIncident"
                                ? "default"
                                : "outline"
                            }
                            className={
                              item.status === "PendingIncident"
                                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm min-w-[160px]"
                                : item.status === "ReadyForPutaway" ||
                                    item.status === "QCPassed"
                                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm min-w-[160px]"
                                  : "text-indigo-600 border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 min-w-[160px]"
                            }
                          >
                            {loadingId === item.id.toString() ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : item.status === "PendingIncident" ? (
                              <>
                                <TriangleAlert className="w-4 h-4 mr-1.5" />
                                {t("Review Incident")}
                              </>
                            ) : item.status === "ReadyForPutaway" ||
                              item.status === "QCPassed" ? (
                              <>
                                <ArrowRight className="w-4 h-4 mr-1.5" />
                                {t("Putaway")}
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1.5" />
                                {t("View")}
                              </>
                            )}
                          </Button>
                        </div>
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
                      setCurrentPage((prev) => Math.max(prev + 1, totalPages))
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
    </>
  );

  if (role === "manager") {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {innerContent}
      </div>
    );
  }

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Inbound Receipts")} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {t("Inbound Receipts")}
            </h1>
            <p className="text-sm text-slate-500">
              {t(
                "Manage received goods, perform QC checks, and putaway items.",
              )}
            </p>
          </div>
          {innerContent}
        </div>
      </main>
    </div>
  );
}
