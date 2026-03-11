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
  MapPin,
  Package,
  Truck,
  ClipboardList,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
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
  staffReceiptApi,
  GetInboundRequestListDto,
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

export default function StaffInboundPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<GetInboundRequestListDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [filterStatus, setFilterStatus] = useState<
    "All" | "Approved" | "Completed"
  >("Approved");

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
        const res = await staffReceiptApi.getAllInboundRequests();
        setRequests(res.data);
      } catch (error) {
        console.error("Failed to fetch inbound requests", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredData = requests.filter((item) => {
    let matchesStatus = true;
    if (filterStatus !== "All") {
      matchesStatus = item.status === filterStatus;
    }

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.receiptCode.toLowerCase().includes(term) ||
      (item.warehouseName && item.warehouseName.toLowerCase().includes(term));

    let matchesDate = true;
    if (dateRange.from || dateRange.to) {
      if (!item.receiptApprovalDate) {
        matchesDate = false;
      } else {
        const itemDate = new Date(item.receiptApprovalDate);

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
      const dateA = a.receiptApprovalDate
        ? new Date(a.receiptApprovalDate).getTime()
        : 0;
      const dateB = b.receiptApprovalDate
        ? new Date(b.receiptApprovalDate).getTime()
        : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }

    if (sortConfig.key === "total") {
      const itemsA = a.totalQuantity || 0;
      const itemsB = b.totalQuantity || 0;
      return sortConfig.direction === "asc" ? itemsA - itemsB : itemsB - itemsA;
    }

    return 0;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortConfig, itemsPerPage, dateRange]);

  const isAll = itemsPerPage === -1;
  const totalPages = isAll
    ? 1
    : Math.ceil(sortedData.length / itemsPerPage) || 1;
  const startIndex =
    (currentPage - 1) * (isAll ? sortedData.length : itemsPerPage);
  const endIndex = isAll ? sortedData.length : startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const handleProcess = (id: number) => {
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

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title="Warehouse Dashboard" />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Inbound Requests
            </h1>
            <p className="text-sm text-slate-500">
              Approved receipts waiting for physical inventory check and
              confirmation.
            </p>
          </div>

          {/* KPI Cards (Giữ nguyên) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Pending Shipments
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {requests.filter((r) => r.status === "Approved").length}{" "}
                    {/* Cập nhật đếm số lượng pending */}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Total Items Quantity
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {requests
                      .reduce((sum, item) => sum + (item.totalQuantity || 0), 0)
                      .toLocaleString("vi-VN")}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Approved Today
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {
                      requests.filter((item) => {
                        if (!item.receiptApprovalDate) return false;
                        const date = new Date(item.receiptApprovalDate);
                        const today = new Date();
                        return date.toDateString() === today.toDateString();
                      }).length
                    }
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] gap-0 pb-0 flex flex-col">
            <CardHeader className="border-b border-slate-100 pb-4 shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-slate-500 hidden md:block">
                    Filters:
                  </span>

                  <Select
                    value={filterStatus}
                    onValueChange={(value: "Approved" | "Completed" | "All") =>
                      setFilterStatus(value)
                    }
                  >
                    <SelectTrigger className="w-[140px] bg-white border-slate-200 shadow-sm h-9 cursor-pointer">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="All">All</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Lọc Ngày (Từ ngày - Đến ngày) */}
                  <div className="flex items-center gap-2">
                    {/* Từ ngày */}
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
                            <span>From Date</span>
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

                    {/* Đến ngày */}
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
                            <span>To Date</span>
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

                    {/* Nút Xóa bộ lọc ngày */}
                    {(dateRange.from || dateRange.to) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-slate-500"
                        onClick={() =>
                          setDateRange({ from: undefined, to: undefined })
                        }
                      >
                        <Delete className="h-4 w-4"/>
                      </Button>
                    )}
                  </div>
                </div>

                {/* NHÓM BÊN PHẢI: TÌM KIẾM */}
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Search Code or Warehouse..."
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
                      <TableHead className="pl-6">Receipt Code</TableHead>
                      <TableHead>Warehouse</TableHead>

                      {/* Cột Approval Date: Click để sort theo date */}
                      <TableHead
                        className="text-center cursor-pointer transition-colors"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center justify-center gap-1.5 select-none">
                          Approval Date
                          {sortConfig?.key === "date" ? (
                            sortConfig.direction === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-50" />
                          )}
                        </div>
                      </TableHead>

                      {/* Cột Total Quantity: Click để sort theo total */}
                      <TableHead
                        className="text-center cursor-pointer transition-colors"
                        onClick={() => handleSort("total")}
                      >
                        <div className="flex items-center justify-center gap-1.5 select-none">
                          Total Quantity
                          {sortConfig?.key === "total" ? (
                            sortConfig.direction === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-50" />
                          )}
                        </div>
                      </TableHead>

                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex justify-center items-center gap-2 text-indigo-600">
                            <Loader2 className="w-6 h-6 animate-spin" /> Loading
                            inbound requests...
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
                            <AlertCircle className="w-8 h-8 text-slate-300" />
                            <p>No requests found for this filter.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((item) => (
                        <TableRow
                          key={item.receiptCode}
                          className="group hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell className="pl-6">
                            <span className="font-semibold text-slate-700">
                              {item.receiptCode}
                            </span>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2 text-slate-600">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              {item.warehouseName || "N/A"}
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <span className="text-sm text-slate-600 flex items-center justify-center gap-1">
                              <CalendarDays className="w-3 h-3 text-slate-400" />{" "}
                              {formatDate(item.receiptApprovalDate)}
                            </span>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md">
                              <Package className="w-3.5 h-3.5 text-slate-500" />
                              <span className="font-bold text-slate-800 text-sm">
                                {item.totalQuantity.toLocaleString("vi-VN")}
                              </span>
                            </div>
                          </TableCell>

                          {/* 5. CẬP NHẬT MÀU STATUS ĐỘNG THEO API */}
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                item.status === "Completed"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : item.status === "Approved"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-50 text-slate-700 border-slate-200"
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>

                          {/* 6. ACTION BUTTON ĐỔI TÊN THEO STATUS */}
                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              onClick={() => handleProcess(item.receiptId)}
                              disabled={loadingId === item.receiptId}
                              variant={
                                item.status === "Completed"
                                  ? "outline"
                                  : "default"
                              }
                              className={`w-[100px] ${
                                item.status === "Completed"
                                  ? "text-indigo-600 border border-indigo-200 hover:bg-indigo-50 hover:text-primary"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                              }`}
                            >
                              {loadingId === item.receiptId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : item.status === "Completed" ? (
                                <>
                                  View <Eye className="w-4 h-4 ml-1.5" />
                                </>
                              ) : (
                                <>
                                  Process{" "}
                                  <ArrowRight className="w-4 h-4 ml-1.5" />
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

              {/* Phân trang */}
              {!isLoading && filteredData.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4">
                  <div className="text-sm text-slate-500">
                    Showing{" "}
                    <span className="font-medium text-slate-900">
                      {startIndex + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-slate-900">
                      {Math.min(endIndex, filteredData.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-slate-900">
                      {filteredData.length}
                    </span>{" "}
                    results
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 whitespace-nowrap">
                        Rows per page:
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
                          <SelectItem value="-1">All</SelectItem>
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
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <div className="text-sm font-medium text-slate-600 px-2 min-w-[80px] text-center">
                        Page {currentPage} of {totalPages}
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
                        Next <ChevronRight className="w-4 h-4 ml-1" />
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
