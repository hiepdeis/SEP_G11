"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  Plus,
  Search,
  Calendar,
  Lock,
  Unlock,
  ArrowRight,
  ClipboardList,
  Users,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auditService, AuditListItemDto } from "@/services/audit-service";
import { toast } from "sonner"; // Thêm toast để báo lỗi ngày

type UserRole = "admin" | "manager" | "accountant" | "staff";

interface AuditListProps {
  role: UserRole;
}

export default function SharedAuditList({ role }: AuditListProps) {
  const router = useRouter();

  const [audits, setAudits] = useState<AuditListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States cho Filter & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  
  // States cho Lọc theo thời gian
  const [datePreset, setDatePreset] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // States cho Sắp xếp (Sort)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await auditService.getAll();
        setAudits(data);
      } catch (error) {
        console.error("Failed to load audits:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Reset trang về 1 khi bất kỳ điều kiện lọc nào thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, datePreset, fromDate, toDate, itemsPerPage, sortConfig]);

  const navigateTo = (action: string, auditId?: string) => {
    if (action === "create") {
      router.push(`/${role}/audit/create`);
      return;
    }
    if (!auditId) return;

    if (action === "assign-team") router.push(`/${role}/audit/assign-team/${auditId}`);
    else if (action === "manual-count") router.push(`/${role}/audit/manual-count/${auditId}`);
    else if (action === "detail") router.push(`/${role}/audit/detail/${auditId}`);
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "locked" || s === "inprogress") {
      return (
        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 gap-1 border-blue-200">
          <Lock className="w-3 h-3" /> {status}
        </Badge>
      );
    }
    if (s === "completed") {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 gap-1 border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> {status}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-slate-500 gap-1 bg-slate-50">
        <Unlock className="w-3 h-3" /> {status || "Open"}
      </Badge>
    );
  };

  // Hàm xử lý khi click vào Header cột để Sắp xếp
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // 1. Logic Lọc Dữ liệu (Filter)
  const filteredData = audits.filter((item) => {
    const matchesStatus = filterStatus === "All" || item.status === filterStatus;
    
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(term) ||
      item.stockTakeId.toString().includes(term) ||
      (item.warehouseName && item.warehouseName.toLowerCase().includes(term));

    let matchesDate = true;
    if (datePreset !== "all") {
      if (!item.plannedStartDate) {
        matchesDate = false;
      } else {
        const itemDate = new Date(item.plannedStartDate);
        const today = new Date();

        if (datePreset === "month") {
          matchesDate = itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
        } else if (datePreset === "year") {
          matchesDate = itemDate.getFullYear() === today.getFullYear();
        } else if (datePreset === "custom") {
          itemDate.setHours(0, 0, 0, 0);
          
          if (fromDate) {
            const fDate = new Date(fromDate);
            fDate.setHours(0, 0, 0, 0);
            if (itemDate < fDate) matchesDate = false;
          }
          if (toDate && matchesDate) {
            const tDate = new Date(toDate);
            tDate.setHours(23, 59, 59, 999);
            if (itemDate > tDate) matchesDate = false;
          }
        }
      }
    }

    return matchesStatus && matchesSearch && matchesDate;
  });

  // 2. Logic Sắp xếp Dữ liệu (Sort)
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    
    if (sortConfig.key === "title") {
      return sortConfig.direction === "asc" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
    }
    if (sortConfig.key === "warehouse") {
      const whA = a.warehouseName || "";
      const whB = b.warehouseName || "";
      return sortConfig.direction === "asc" ? whA.localeCompare(whB) : whB.localeCompare(whA);
    }
    if (sortConfig.key === "date") {
      const dateA = a.plannedStartDate ? new Date(a.plannedStartDate).getTime() : 0;
      const dateB = b.plannedStartDate ? new Date(b.plannedStartDate).getTime() : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }
    if (sortConfig.key === "status") {
      const statusA = a.status || "";
      const statusB = b.status || "";
      return sortConfig.direction === "asc" ? statusA.localeCompare(statusB) : statusB.localeCompare(statusA);
    }
    if (sortConfig.key === "progress") {
      return sortConfig.direction === "asc" ? a.countingProgress - b.countingProgress : b.countingProgress - a.countingProgress;
    }
    return 0;
  });

  // 3. Logic Phân trang áp dụng lên sortedData
  const isAll = itemsPerPage === -1;
  const totalPages = isAll ? 1 : Math.ceil(sortedData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * (isAll ? sortedData.length : itemsPerPage);
  const endIndex = isAll ? sortedData.length : startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Render Icon Mũi tên Sort
  const getSortIcon = (columnKey: string) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === "asc" 
        ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> 
        : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />;
    }
    return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />;
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`Inventory Audit (${role.toUpperCase()})`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Sessions</h1>
              <p className="text-sm text-slate-500">Manage stocktaking plans and reconciliation.</p>
            </div>
            {role === "accountant" && (
              <Button onClick={() => navigateTo("create")} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                <Plus className="w-4 h-4 mr-2" /> New Audit Plan
              </Button>
            )}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Audits</p>
                  <h3 className="text-2xl font-bold text-slate-900">{audits.length}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">In Progress (Locked)</p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {audits.filter((a) => a.status === "InProgress").length}
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
                  <p className="text-sm font-medium text-slate-500">Completed</p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {audits.filter((a) => a.status === "Completed").length}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Table Card */}
          <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] flex flex-col">
            <CardHeader>
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                
                {/* Khu vực Filter Trạng thái và Thời gian */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500 hidden md:block">Status:</span>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[140px] bg-white border-slate-200 shadow-sm h-10">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Status</SelectItem>
                        <SelectItem value="Planned">Planned</SelectItem>
                        <SelectItem value="Assigned">Assigned</SelectItem>
                        <SelectItem value="InProgress">In Progress</SelectItem>
                        <SelectItem value="ReadyForReview">Ready For Review</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Time / Date */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500 hidden md:block ml-2">Time:</span>
                    <Select value={datePreset} onValueChange={setDatePreset}>
                      <SelectTrigger className="w-[140px] bg-white border-slate-200 shadow-sm h-10">
                        <SelectValue placeholder="All Time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Range Date Pickers (Kèm Validation) */}
                  {datePreset === "custom" && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                      <Input 
                        type="date" 
                        className="h-10 w-[140px] text-sm bg-white shadow-sm" 
                        value={fromDate} 
                        onChange={(e) => {
                          setFromDate(e.target.value);
                          // Nếu đổi ngày bắt đầu lớn hơn ngày kết thúc hiện tại, tự động reset ngày kết thúc
                          if (toDate && e.target.value > toDate) {
                            setToDate("");
                            toast.info("Vui lòng chọn lại ngày kết thúc hợp lệ.");
                          }
                        }} 
                      />
                      <span className="text-slate-400 text-sm">-</span>
                      <Input 
                        type="date" 
                        className="h-10 w-[140px] text-sm bg-white shadow-sm" 
                        value={toDate} 
                        min={fromDate} // HTML validation: Không cho chọn ngày trước fromDate
                        onChange={(e) => {
                          if (fromDate && e.target.value < fromDate) {
                            toast.error("Ngày kết thúc không thể trước ngày bắt đầu!");
                          } else {
                            setToDate(e.target.value);
                          }
                        }} 
                      />
                    </div>
                  )}
                </div>

                {/* Khu vực Search */}
                <div className="relative w-full xl:w-72 flex-shrink-0">
                  <Search className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search title, ID or warehouse..."
                    className="pl-9 bg-white shadow-sm h-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 flex flex-col justify-between flex-1">
              <div className="overflow-x-auto relative">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead 
                        className="pl-6 cursor-pointer select-none group" 
                        onClick={() => handleSort("title")}
                      >
                        <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                          Audit Info {getSortIcon("title")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none group" 
                        onClick={() => handleSort("warehouse")}
                      >
                        <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                          Warehouse {getSortIcon("warehouse")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none group" 
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                          Date {getSortIcon("date")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none group" 
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                          Status {getSortIcon("status")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none group" 
                        onClick={() => handleSort("progress")}
                      >
                        <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                          Progress {getSortIcon("progress")}
                        </div>
                      </TableHead>
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex justify-center items-center gap-2 text-indigo-600">
                            <Loader2 className="w-6 h-6 animate-spin" /> Loading audits...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <FileText className="w-8 h-8 text-slate-300" />
                            <p>No audit sessions found matching your filters.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((audit) => (
                        <TableRow key={audit.stockTakeId} className="group hover:bg-slate-50/50 transition-colors">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700">{audit.title}</span>
                              <span className="text-xs text-slate-400">ID: AUD-{audit.stockTakeId}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-600">
                              {audit.warehouseName || `Warehouse #${audit.warehouseId}`}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-500 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {audit.plannedStartDate ? new Date(audit.plannedStartDate).toLocaleDateString("vi-VN") : "N/A"}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(audit.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full ${audit.countingProgress === 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
                                  style={{ width: `${Math.min(audit.countingProgress, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-medium text-slate-600">{audit.countingProgress}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {role === "manager" && (
                              <div className="flex justify-end gap-2">
                                {(audit.status === "Planned" || audit.status === "Assigned") && (
                                  <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                    onClick={() => navigateTo("assign-team", audit.stockTakeId.toString())}>
                                    <Users className="w-3.5 h-3.5 mr-1.5" /> Assign
                                  </Button>
                                )}
                                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                  onClick={() => navigateTo("detail", audit.stockTakeId.toString())}>
                                  Detail
                                </Button>
                              </div>
                            )}
                            {role === "staff" && (
                              <Button size="sm" variant="outline" className="shadow-sm"
                                onClick={() => navigateTo("manual-count", audit.stockTakeId.toString())}>
                                Manual Count <ArrowRight className="w-3.5 h-3.5 ml-1" />
                              </Button>
                            )}
                            {role === "accountant" && (
                              <Button size="sm" variant="ghost" onClick={() => navigateTo("detail", audit.stockTakeId.toString())}>
                                View Report
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Footer Phân trang */}
              {!loading && filteredData.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4 mt-auto">
                  <div className="text-sm text-slate-500">
                    Showing <span className="font-medium text-slate-900">{startIndex + 1}</span> to{" "}
                    <span className="font-medium text-slate-900">{Math.min(endIndex, filteredData.length)}</span> of{" "}
                    <span className="font-medium text-slate-900">{filteredData.length}</span> results
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 whitespace-nowrap">Rows per page:</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
                        <SelectTrigger className="h-8 w-[75px] bg-white border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="-1">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="h-8">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                      </Button>
                      <div className="text-sm font-medium text-slate-600 px-2 min-w-[80px] text-center">
                        Page {currentPage} of {totalPages}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="h-8">
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