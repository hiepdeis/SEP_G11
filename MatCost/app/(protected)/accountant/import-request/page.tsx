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
  File,
  BadgeX,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
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
import { receiptApi, ReceiptSummaryDto } from "@/services/receipt-service";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ImportApprovalListPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<ReceiptSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [filterStatus, setFilterStatus] = useState<
    "All" | "Requested" | "Rejected" | "History" | "Draft"
  >("Requested");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

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
        const res = await receiptApi.getPendingAccountant();
        setRequests(res.data);
      } catch (error) {
        console.error("Failed to fetch pending receipts", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Khi người dùng gõ search hoặc đổi tab filter, tự động quay về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortConfig, itemsPerPage]);

  // 1. Lọc dữ liệu ban đầu
  const filteredData = requests.filter((item) => {
    let matchesStatus = true;

    if (filterStatus === "Requested") {
      matchesStatus = item.status === "Requested";
    } else if (filterStatus === "Draft") {
      matchesStatus = item.status === "Draft";
    } else if (filterStatus === "Rejected") {
      matchesStatus = item.status === "Rejected";
    } else if (filterStatus === "History") {
      matchesStatus =
        item.status !== "Requested" &&
        item.status !== "Draft" &&
        item.status !== "Rejected";
    }

    const matchesSearch = item.receiptCode
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;

    if (sortConfig.key === "date") {
      const dateA = a.receiptDate ? new Date(a.receiptDate).getTime() : 0;
      const dateB = b.receiptDate ? new Date(b.receiptDate).getTime() : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }

    if (sortConfig.key === "items") {
      const itemsA = a.itemCount || 0;
      const itemsB = b.itemCount || 0;
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

  const handleReview = async (id: number, status: string) => {
    setLoadingId(id);

    if (status === "Rejected") {
      try {
        await receiptApi.revertToDraft(id);
        toast.success(
          "Receipt reverted to Draft. You can now edit and resubmit.",
        );
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to revert receipt to draft",
        );
        setLoadingId(null);
        return;
      }
    }

    // Chuyển sang trang detail
    router.push(`import-request/${id}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title="Accountant Dashboard"></Header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Inbound Approvals
              </h1>
              <p className="text-sm text-slate-500">
                Select a supplier and pricing for requested materials.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Các thẻ tổng quan (Giữ nguyên) */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Pending Requests
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {
                      requests.filter((item) => item.status === "Requested")
                        .length
                    }
                  </h3>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
                  <File className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Drafts</p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {" "}
                    {requests.filter((item) => item.status === "Draft").length}
                  </h3>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                  <BadgeX className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Rejects</p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {" "}
                    {
                      requests.filter((item) => item.status === "Rejected")
                        .length
                    }
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main List */}
          <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] gap-0 pb-0">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Các nút Lọc (Giữ nguyên) */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500 hidden md:block">
                    Filter:
                  </span>
                  <Select
                    value={filterStatus}
                    onValueChange={(
                      value:
                        | "All"
                        | "Requested"
                        | "Rejected"
                        | "History"
                        | "Draft",
                    ) => setFilterStatus(value)}
                  >
                    <SelectTrigger className="w-[180px] bg-white border-slate-200 shadow-sm">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Requested">Requested</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                      <SelectItem value="All">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Search Receipt Code..."
                    className="pl-9"
                    maxLength={50}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col justify-between flex-1">
              <div className="max-h-[350px] min-h-[350px] overflow-y-auto relative scrollbar-thin no-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead
                        className="pl-6 cursor-pointer transition-colors"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1.5 select-none">
                          Receipt & Date
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

                      <TableHead>Requester</TableHead>

                      {/* Cột Items: Cho phép click để sort theo số lượng */}
                      <TableHead
                        className="cursor-pointer transition-colors"
                        onClick={() => handleSort("items")}
                      >
                        <div className="flex items-center gap-1.5 select-none">
                          Items
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

                      <TableHead>Status</TableHead>
                      {filterStatus == "Rejected" && (
                        <TableHead>Reject Reasons</TableHead>
                      )}
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex justify-center items-center gap-2 text-indigo-600">
                            <Loader2 className="w-6 h-6 animate-spin" /> Loading
                            data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-32 text-center text-slate-500"
                        >
                          No pending requests found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((item) => (
                        <TableRow
                          key={item.receiptId}
                          className="group hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700">
                                {item.receiptCode}
                              </span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />{" "}
                                {formatDate(item.receiptDate)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-slate-700 font-medium">
                                {item.createdByName}
                              </span>
                              <span className="text-xs text-slate-400">
                                Construction Team
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Package className="w-4 h-4 text-slate-400" />
                              {item.itemCount} items
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                item.status === "Requested"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : item.status === "Submitted"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : item.status === "Rejected"
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : "bg-gray-50 text-gray-700 border-gray-200"
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          {filterStatus == "Rejected" && (
                            <TableCell>
                              <div className="flex items-center gap-2 text-slate-600 max-w-xs truncate">
                                {/* Thêm truncate nếu lý do quá dài */}
                                {item.rejectionReason || "No reason provided"}
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleReview(item.receiptId, item.status!)
                              }
                              disabled={loadingId === item.receiptId}
                              variant={
                                item.status === "Rejected"
                                  ? "outline"
                                  : "default"
                              }
                              className={
                                item.status === "Rejected"
                                  ? "text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-primary"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                              }
                            >
                              {loadingId === item.receiptId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : item.status === "Rejected" ? (
                                <>
                                  Revert to Draft{" "}
                                  <RotateCcw className="w-4 h-4 ml-1.5" />
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

              {/* THÊM KHỐI CONTROLS PHÂN TRANG (PAGINATION) Ở ĐÂY */}
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
