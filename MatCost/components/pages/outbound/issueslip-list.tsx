"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  Search, Calendar, Loader2, FileText, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, ArrowUpDown, FileOutput, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { issueSlipApi, IssueSlip } from "@/services/issueslip-service";

type UserRole = "admin" | "manager" | "accountant" | "staff" | "construction";

interface IssueSlipListProps {
  role: UserRole;
}

export default function SharedIssueSlipList({ role }: IssueSlipListProps) {
  const router = useRouter();

  const [issueSlips, setIssueSlips] = useState<IssueSlip[]>([]);
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
        const data = await issueSlipApi.getIssueSlips();
        setIssueSlips(data);
      } catch (error) {
        console.error("Failed to load issue slips:", error);
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

  const navigateToDetail = (issueId: number) => {
    if(role === "accountant"){
      router.push(`/accountant/outbound/checkInventory/${issueId}`);
    } else {
      router.push(`/${role}/outbound/IssueSlipDetail/${issueId}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "approved") {
      return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 gap-1 border-emerald-200"><CheckCircle2 className="w-3 h-3" /> {status}</Badge>;
    }
    if (s === "rejected") {
      return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-100 gap-1 border-rose-200"><XCircle className="w-3 h-3" /> {status}</Badge>;
    }
    if (s === "pending") {
      return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 gap-1 border-amber-200"><AlertCircle className="w-3 h-3" /> {status}</Badge>;
    }
    return <Badge variant="outline" className="text-slate-500 bg-slate-50">{status || "Unknown"}</Badge>;
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // 1. Logic Lọc Dữ liệu
  const filteredData = issueSlips.filter((item) => {
    const matchesStatus = filterStatus === "All" || item.status === filterStatus;
    
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.issueCode.toLowerCase().includes(term) ||
      (item.projectId && item.projectId.toString().toLowerCase().includes(term)) ||
      (item.description && item.description.toLowerCase().includes(term));

    let matchesDate = true;
    if (datePreset !== "all") {
      if (!item.issueDate) {
        matchesDate = false;
      } else {
        const itemDate = new Date(item.issueDate);
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

  // 2. Logic Sắp xếp
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    
    if (sortConfig.key === "code") {
      return sortConfig.direction === "asc" ? a.issueCode.localeCompare(b.issueCode) : b.issueCode.localeCompare(a.issueCode);
    }
    if (sortConfig.key === "project") {
      const pA = a.projectId?.toString() || "";
      const pB = b.projectId?.toString() || "";
      return sortConfig.direction === "asc" ? pA.localeCompare(pB) : pB.localeCompare(pA);
    }
    if (sortConfig.key === "date") {
      const dateA = a.issueDate ? new Date(a.issueDate).getTime() : 0;
      const dateB = b.issueDate ? new Date(b.issueDate).getTime() : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }
    if (sortConfig.key === "status") {
      const statusA = a.status || "";
      const statusB = b.status || "";
      return sortConfig.direction === "asc" ? statusA.localeCompare(statusB) : statusB.localeCompare(statusA);
    }
    return 0;
  });

  // 3. Logic Phân trang
  const isAll = itemsPerPage === -1;
  const totalPages = isAll ? 1 : Math.ceil(sortedData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * (isAll ? sortedData.length : itemsPerPage);
  const endIndex = isAll ? sortedData.length : startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

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
        <Header title={`Outbound Management (${role.toUpperCase()})`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Issue Slips</h1>
            <p className="text-sm text-slate-500">Manage all material release requests and outbound slips.</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                  <FileOutput className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Slips</p>
                  <h3 className="text-2xl font-bold text-slate-900">{issueSlips.length}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Pending</p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {issueSlips.filter((a) => a.status === "Pending").length}
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
                  <p className="text-sm font-medium text-slate-500">Approved</p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {issueSlips.filter((a) => a.status === "Approved").length}
                  </h3>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-lg">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Rejected</p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {issueSlips.filter((a) => a.status === "Rejected").length}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Table Card */}
          <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] flex flex-col">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                
                {/* Khu vực Filter */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500 hidden md:block">Status:</span>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[140px] bg-white border-slate-200 shadow-sm h-10">
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Status</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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

                  {datePreset === "custom" && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                      <Input 
                        type="date" className="h-10 w-[140px] text-sm bg-white shadow-sm" 
                        value={fromDate} onChange={(e) => setFromDate(e.target.value)} 
                      />
                      <span className="text-slate-400 text-sm">-</span>
                      <Input 
                        type="date" className="h-10 w-[140px] text-sm bg-white shadow-sm" 
                        value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} 
                      />
                    </div>
                  )}
                </div>

                <div className="relative w-full xl:w-72 flex-shrink-0">
                  <Search className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search Code, Project ID..."
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
                      <TableHead className="pl-6 cursor-pointer select-none group" onClick={() => handleSort("code")}>
                        <div className="flex items-center gap-1.5 hover:text-slate-800">Issue Code {getSortIcon("code")}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none group" onClick={() => handleSort("project")}>
                        <div className="flex items-center gap-1.5 hover:text-slate-800">Project ID {getSortIcon("project")}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none group" onClick={() => handleSort("date")}>
                        <div className="flex items-center gap-1.5 hover:text-slate-800">Issue Date {getSortIcon("date")}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none group" onClick={() => handleSort("status")}>
                        <div className="flex items-center gap-1.5 hover:text-slate-800">Status {getSortIcon("status")}</div>
                      </TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="h-32 text-center"><div className="flex justify-center items-center gap-2 text-indigo-600"><Loader2 className="w-6 h-6 animate-spin" /> Loading issue slips...</div></TableCell></TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-500"><div className="flex flex-col items-center justify-center gap-2"><FileText className="w-8 h-8 text-slate-300" /><p>No issue slips found.</p></div></TableCell></TableRow>
                    ) : (
                      paginatedData.map((slip) => (
                        <TableRow key={slip.issueId} className="group hover:bg-slate-50/50 transition-colors">
                          <TableCell className="pl-6 font-semibold text-slate-700">{slip.issueCode}</TableCell>
                          <TableCell className="text-slate-600">{slip.projectId || "N/A"}</TableCell>
                          <TableCell><span className="text-sm text-slate-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(slip.issueDate).toLocaleDateString("vi-VN")}</span></TableCell>
                          <TableCell>{getStatusBadge(slip.status)}</TableCell>
                          <TableCell className="text-sm text-slate-500 max-w-[200px] truncate" title={slip.description}>{slip.description || "—"}</TableCell>
                          <TableCell className="text-right pr-6">
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={() => navigateToDetail(slip.issueId)}>
                               Detail
                            </Button>
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
                    Showing <span className="font-medium text-slate-900">{startIndex + 1}</span> to <span className="font-medium text-slate-900">{Math.min(endIndex, filteredData.length)}</span> of <span className="font-medium text-slate-900">{filteredData.length}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Rows:</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
                        <SelectTrigger className="h-8 w-[70px] bg-white border-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="-1">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="h-8"><ChevronLeft className="w-4 h-4" /></Button>
                      <div className="text-sm font-medium text-slate-600 px-2">Page {currentPage} of {totalPages}</div>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="h-8"><ChevronRight className="w-4 h-4" /></Button>
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