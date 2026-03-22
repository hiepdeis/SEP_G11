"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { Plus, Search, Lock, Unlock, ArrowRight, ClipboardList, Users, Loader2, FileText, ChevronLeft, ChevronRight, CheckCircle2, ArrowUp, ArrowDown, ArrowUpDown, CalendarDays, Delete, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditService, AuditListItemDto } from "@/services/audit-service";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { endOfDay, format, isWithinInterval, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type UserRole = "admin" | "manager" | "accountant" | "staff";

interface AuditListProps { role: UserRole; }

export default function SharedAuditList({ role }: AuditListProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const [audits, setAudits] = useState<AuditListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined; }>({ from: undefined, to: undefined });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await auditService.getAll();
        setAudits(data);
      } catch (error) { console.error("Failed to load audits:", error); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus, dateRange, itemsPerPage, sortConfig]);

  const navigateTo = (action: string, auditId?: string) => {
    if (action === "create") return router.push(`/${role}/audit/create`);
    if (!auditId) return;
    if (action === "assign-team") router.push(`/${role}/audit/assign-team/${auditId}`);
    else if (action === "manual-count") router.push(`/${role}/audit/manual-count/${auditId}`);
    else if (action === "detail") router.push(`/${role}/audit/detail/${auditId}`);
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "locked" || s === "inprogress") return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 gap-1 border-blue-200"><Lock className="w-3 h-3" /> {t("In Progress (Locked)")}</Badge>;
    if (s === "completed") return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 gap-1 border-emerald-200"><CheckCircle2 className="w-3 h-3" /> {t("Completed")}</Badge>;
    if (s === "readyforreview") return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 gap-1 border-amber-200"><AlertCircle className="w-3 h-3" /> {t("Ready For Review")}</Badge>;
    if (s === "assigned") return <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 gap-1 border-indigo-200"><Users className="w-3 h-3" /> {t("Assigned")}</Badge>;
    return <Badge variant="outline" className="text-slate-500 gap-1 bg-slate-50"><Unlock className="w-3 h-3" /> {t("Planned")}</Badge>;
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const filteredData = audits.filter((item) => {
    const itemStatus = item.status === "PLAN" ? "Planned" : item.status;
    const matchesStatus = filterStatus === "All" || itemStatus === filterStatus;
    const term = searchTerm.toLowerCase();
    const matchesSearch = item.title.toLowerCase().includes(term) || item.stockTakeId.toString().includes(term) || (item.warehouseName && item.warehouseName.toLowerCase().includes(term));
    let matchesDate = true;
    if (dateRange.from || dateRange.to) {
      if (!item.plannedStartDate) matchesDate = false;
      else {
        const itemDate = new Date(item.plannedStartDate);
        const fromDate = dateRange.from ? startOfDay(dateRange.from) : new Date(2000, 0, 1);
        const toDate = dateRange.to ? endOfDay(dateRange.to) : new Date(2100, 0, 1);
        matchesDate = isWithinInterval(itemDate, { start: fromDate, end: toDate });
      }
    }
    return matchesStatus && matchesSearch && matchesDate;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    if (sortConfig.key === "title") return sortConfig.direction === "asc" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
    if (sortConfig.key === "warehouse") return sortConfig.direction === "asc" ? (a.warehouseName || "").localeCompare(b.warehouseName || "") : (b.warehouseName || "").localeCompare(a.warehouseName || "");
    if (sortConfig.key === "date") {
      const dateA = a.plannedStartDate ? new Date(a.plannedStartDate).getTime() : 0;
      const dateB = b.plannedStartDate ? new Date(b.plannedStartDate).getTime() : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }
    if (sortConfig.key === "status") return sortConfig.direction === "asc" ? (a.status || "").localeCompare(b.status || "") : (b.status || "").localeCompare(a.status || "");
    if (sortConfig.key === "progress") return sortConfig.direction === "asc" ? a.countingProgress - b.countingProgress : b.countingProgress - a.countingProgress;
    return 0;
  });

  const isAll = itemsPerPage === -1;
  const totalPages = isAll ? 1 : Math.ceil(sortedData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * (isAll ? sortedData.length : itemsPerPage);
  const endIndex = isAll ? sortedData.length : startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const getSortIcon = (columnKey: string) => {
    if (sortConfig?.key === columnKey) return sortConfig.direction === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />;
    return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />;
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Inventory Audit")} (${role.toUpperCase()})`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("Audit Sessions")}</h1>
              <p className="text-sm text-slate-500">{t("Manage stocktaking plans and reconciliation.")}</p>
            </div>
            {role === "accountant" && (
              <Button onClick={() => navigateTo("create")} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                <Plus className="w-4 h-4 mr-2" /> {t("New Audit Plan")}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><ClipboardList className="w-6 h-6" /></div><div><p className="text-sm font-medium text-slate-500">{t("Total Audits")}</p><h3 className="text-2xl font-bold text-slate-900">{audits.length}</h3></div></CardContent></Card>
            <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Lock className="w-6 h-6" /></div><div><p className="text-sm font-medium text-slate-500">{t("In Progress (Locked)")}</p><h3 className="text-2xl font-bold text-slate-900">{audits.filter((a) => a.status === "InProgress").length}</h3></div></CardContent></Card>
            <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle2 className="w-6 h-6" /></div><div><p className="text-sm font-medium text-slate-500">{t("Completed")}</p><h3 className="text-2xl font-bold text-slate-900">{audits.filter((a) => a.status === "Completed").length}</h3></div></CardContent></Card>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white flex flex-col gap-0 pb-0">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-slate-500 hidden md:block">{t("Filters:")}</span>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[160px] bg-white border-slate-200 shadow-sm h-9 cursor-pointer"><SelectValue placeholder={t("Filter by status")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">{t("All Status")}</SelectItem>
                      <SelectItem value="Planned">{t("Planned")}</SelectItem>
                      <SelectItem value="Assigned">{t("Assigned")}</SelectItem>
                      <SelectItem value="InProgress">{t("In Progress")}</SelectItem>
                      <SelectItem value="ReadyForReview">{t("Ready For Review")}</SelectItem>
                      <SelectItem value="Completed">{t("Completed")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start text-left font-normal h-9 bg-white shadow-sm", !dateRange.from && "text-slate-500")}>
                          <CalendarDays className="mr-2 h-4 w-4" />{dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : <span>{t("From Date")}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateRange.from} onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))} initialFocus /></PopoverContent>
                    </Popover>
                    <span className="text-slate-400">-</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start text-left font-normal h-9 bg-white shadow-sm", !dateRange.to && "text-slate-500")}>
                          <CalendarDays className="mr-2 h-4 w-4" />{dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : <span>{t("To Date")}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateRange.to} onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))} initialFocus disabled={(date) => dateRange.from ? date < dateRange.from : false} /></PopoverContent>
                    </Popover>
                    {(dateRange.from || dateRange.to) && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 px-2" onClick={() => setDateRange({ from: undefined, to: undefined })}><Delete className="h-4 w-4" /></Button>
                    )}
                  </div>
                </div>

                <div className="relative w-full xl:w-72 flex-shrink-0">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input placeholder={t("Search title, ID or warehouse...")} className="pl-9 bg-white shadow-sm h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 flex flex-col">
              <div className="w-full [&>div]:max-h-[305px] [&>div]:overflow-y-auto">
                <Table className="w-full min-w-[800px] table-fixed">
                  <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="pl-6 w-[28%] cursor-pointer select-none group" onClick={() => handleSort("title")}><div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">{t("Audit Info")} {getSortIcon("title")}</div></TableHead>
                      <TableHead className="w-[18%] cursor-pointer select-none group" onClick={() => handleSort("warehouse")}><div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">{t("Warehouse")} {getSortIcon("warehouse")}</div></TableHead>
                      <TableHead className="w-[14%] cursor-pointer select-none group" onClick={() => handleSort("date")}><div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">{t("Date")} {getSortIcon("date")}</div></TableHead>
                      <TableHead className="w-[16%] cursor-pointer select-none group" onClick={() => handleSort("status")}><div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">{t("Status")} {getSortIcon("status")}</div></TableHead>
                      <TableHead className="w-[12%] cursor-pointer select-none group" onClick={() => handleSort("progress")}><div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">{t("Progress")} {getSortIcon("progress")}</div></TableHead>
                      <TableHead className="w-[12%] text-right pr-6">{t("Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="h-32 text-center"><div className="flex justify-center items-center gap-2 text-indigo-600"><Loader2 className="w-6 h-6 animate-spin" /> {t("Loading audits...")}</div></TableCell></TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-500 border-b-0"><div className="flex flex-col items-center justify-center gap-2"><FileText className="w-8 h-8 text-slate-300" /><p>{t("No audit sessions found matching your filters.")}</p></div></TableCell></TableRow>
                    ) : (
                      paginatedData.map((audit) => (
                        <TableRow key={audit.stockTakeId} className="group hover:bg-slate-50/50 transition-colors">
                          <TableCell className="pl-6"><div className="flex flex-col"><span className="font-semibold text-slate-700 truncate" title={audit.title}>{audit.title}</span><span className="text-xs text-slate-400">ID: AUD-{audit.stockTakeId}</span></div></TableCell>
                          <TableCell><span className="text-sm text-slate-600 block truncate" title={audit.warehouseName}>{audit.warehouseName || `${t("Warehouse")} #${audit.warehouseId}`}</span></TableCell>
                          <TableCell><span className="text-sm text-slate-500 flex items-center gap-1.5 whitespace-nowrap"><CalendarIcon className="w-3.5 h-3.5 flex-shrink-0" />{audit.plannedStartDate ? new Date(audit.plannedStartDate).toLocaleDateString("vi-VN") : t("N/A")}</span></TableCell>
                          <TableCell>{getStatusBadge(audit.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 sm:w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden flex-shrink-0"><div className={`h-1.5 rounded-full ${audit.countingProgress === 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${Math.min(audit.countingProgress, 100)}%` }}></div></div>
                              <span className="text-xs font-medium text-slate-600">{audit.countingProgress}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {role === "manager" && (
                              <div className="flex justify-end gap-2">
                                {(audit.status === "Planned" || audit.status === "PLAN") && (<Button size="sm" variant="outline" className="shadow-sm border-indigo-200 text-indigo-600" onClick={() => navigateTo("assign-team", audit.stockTakeId.toString())}><Users className="w-3.5 h-3.5 mr-1.5" /> {t("Assign")}</Button>)}
                                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={() => navigateTo("detail", audit.stockTakeId.toString())}>{t("Detail")}</Button>
                              </div>
                            )}
                            {role === "staff" && (audit.status === "InProgress") && (<Button size="sm" variant="outline" className="shadow-sm border-indigo-200 text-indigo-600" onClick={() => navigateTo("manual-count", audit.stockTakeId.toString())}>{t("Count")} <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>)}
                            {role === "accountant" && (<Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={() => navigateTo("detail", audit.stockTakeId.toString())}>{t("View Report")}</Button>)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {!loading && filteredData.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50 gap-4">
                  <div className="text-sm text-slate-500">
                    {t("Showing")} <span className="font-medium text-slate-900">{startIndex + 1}</span> {t("to")} <span className="font-medium text-slate-900">{Math.min(endIndex, filteredData.length)}</span> {t("of")} <span className="font-medium text-slate-900">{filteredData.length}</span> {t("results")}
                  </div>
                  <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 whitespace-nowrap">{t("Rows:")}</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
                        <SelectTrigger className="h-8 w-[70px] bg-white border-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="-1">{t("All")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
                      <div className="text-sm font-medium text-slate-600 px-1 min-w-[70px] text-center">{currentPage} / {totalPages}</div>
                      <Button variant="outline" size="icon" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
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