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

export default function ManagerImportRequestPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<PendingReceiptDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [filterStatus, setFilterStatus] = useState<
    "All" | "Submitted" | "History"
  >("Submitted");

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
  }, [searchTerm, filterStatus, sortConfig, itemsPerPage]);

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

    return matchesStatus && matchesSearch;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;

    if (sortConfig.key === "date") {
      const dateA = a.receiptDate ? new Date(a.receiptDate).getTime() : 0;
      const dateB = b.receiptDate ? new Date(b.receiptDate).getTime() : 0;
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
    // Chuyển hướng sang trang chi tiết duyệt của Manager
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

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title="Manager Dashboard" />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Approval Queue
            </h1>
            <p className="text-sm text-slate-500">
              Review receipts processed by Accountants and make final approval.
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
                    Waiting for Approval
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {
                      requests.filter((item) => item.status === "Submitted")
                        .length
                    }
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
                    Total Pending Value
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {formatCurrency(
                      requests
                        .filter((item) => item.status === "Submitted")
                        .reduce(
                          (sum, item) => sum + (item.totalAmount || 0),
                          0,
                        ),
                    )}
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
                    Approved last 7 days
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {
                      requests.filter((item) => {
                        if (!item.receiptDate) return false;

                        const itemDate = new Date(item.receiptDate);
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        return (
                          item.status === "Approved" && itemDate >= sevenDaysAgo
                        );
                      }).length
                    }
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
                    Rejected last 7 days
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {
                      requests.filter((item) => {
                        if (!item.receiptDate) return false;

                        const itemDate = new Date(item.receiptDate);
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        return (
                          item.status === "Rejected" && itemDate >= sevenDaysAgo
                        );
                      }).length
                    }
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main List Table */}
          <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] gap-0 pb-0">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Khối Dropdown Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500 hidden md:block">
                    Filter:
                  </span>
                  <Select
                    value={filterStatus}
                    onValueChange={(value: "Submitted" | "History" | "All") =>
                      setFilterStatus(value)
                    }
                  >
                    <SelectTrigger className="w-full md:w-[180px] bg-white border-slate-200 shadow-sm">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Submitted">Submitted</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                      <SelectItem value="All">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Khối Search Bar */}
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Search Receipt Code..."
                    className="pl-9 bg-white shadow-sm"
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
                          Receipt Code
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

                      <TableHead>Warehouse</TableHead>

                      {/* Cột Total Amount: Click để sort theo total */}
                      <TableHead
                        className="text-right cursor-pointer transition-colors"
                        onClick={() => handleSort("total")}
                      >
                        <div className="flex items-center justify-end gap-1.5 select-none">
                          Total Amount
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
                            requests...
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
                            <p>No pending approvals found.</p>
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
                                {formatDate(item.receiptDate)}
                              </span>
                            </div>
                          </TableCell>

                          {/* Warehouse */}
                          <TableCell>
                            <div className="flex items-center gap-2 text-slate-600">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              {item.warehouseName || "N/A"}
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
                                                : "bg-gray-50 text-gray-700 border-gray-200"
                                        }
                                     `}
                            >
                              {item.status}
                            </Badge>
                          </TableCell>

                          {/* Action */}
                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              onClick={() => handleReview(item.receiptId)}
                              disabled={loadingId === item.receiptId}
                              variant={
                                item.status === "Approved" ||
                                item.status === "Rejected"
                                  ? "outline"
                                  : "default"
                              }
                              className={`w-[100px] ${
                                item.status === "Approved" ||
                                item.status === "Rejected"
                                  ? "text-indigo-600 border border-indigo-200 hover:bg-indigo-50 hover:text-primary"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                              }`}
                            >
                              {loadingId === item.receiptId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : item.status === "Approved" ||
                                item.status === "Rejected" ? (
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
