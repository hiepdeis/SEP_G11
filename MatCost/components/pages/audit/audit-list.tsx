"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { Plus, Search, Lock, Unlock, ArrowRight, ClipboardList, Users, Loader2, FileText, ChevronLeft, ChevronRight, CheckCircle2, ArrowUp, ArrowDown, ArrowUpDown, CalendarDays, Delete, Calendar as CalendarIcon, AlertCircle, Calculator, FileSignature, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditService, AuditListItemDto, UpdateAuditPlanRequest } from "@/services/audit-service";
import { warehouseApi, WarehouseListItemDto } from "@/services/warehouse-service";
import axiosClient from "@/lib/axios-client";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { endOfDay, format, isWithinInterval, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { DateTimePicker } from "@/components/ui/custom/date-time-picker";
import { Pencil, Trash2, Save, LayoutGrid, Warehouse as WarehouseIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<AuditListItemDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editFormData, setEditFormData] = useState<UpdateAuditPlanRequest>({
    title: "", warehouseId: 0, binLocationIds: [], plannedStartDate: "", plannedEndDate: ""
  });
  const [warehouses, setWarehouses] = useState<WarehouseListItemDto[]>([]);
  const [bins, setBins] = useState<{ binId: number; code: string }[]>([]);
  const [isLoadingBins, setIsLoadingBins] = useState(false);
  const [selectAllBins, setSelectAllBins] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await auditService.getAll();
      setAudits(data);
    } catch (error) { console.error("Failed to load audits:", error); } finally { setLoading(false); }
  };

  useEffect(() => {
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

  const handleEditClick = async (audit: AuditListItemDto) => {
    setSelectedAudit(audit);
    try {
      const fullDetails = await auditService.getPlanById(audit.stockTakeId);
      setEditFormData({
        title: fullDetails.title,
        warehouseId: fullDetails.warehouseId,
        binLocationIds: fullDetails.binLocationIds || [],
        plannedStartDate: fullDetails.plannedStartDate || "",
        plannedEndDate: fullDetails.plannedEndDate || ""
      });
      
      if (warehouses.length === 0) {
        const whRes = await warehouseApi.getAll();
        setWarehouses(whRes.data);
      }
      
      setIsEditModalOpen(true);
    } catch (error) {
      toast.error(t("Failed to load audit details."));
    }
  };

  const handleDeleteClick = (audit: AuditListItemDto) => {
    setSelectedAudit(audit);
    setIsDeleteModalOpen(true);
  };

  useEffect(() => {
    const fetchBins = async () => {
      if (editFormData.warehouseId <= 0 || !isEditModalOpen) return;
      try {
        setIsLoadingBins(true);
        const response = await axiosClient.get(`/admin/master-data/bin-locations`);
        const allBins = response.data.items || response.data || [];
        const filteredBins = allBins.filter((b: any) => b.warehouseId === editFormData.warehouseId);
        setBins(filteredBins);
        setSelectAllBins(filteredBins.length > 0 && 
          filteredBins.every((b: any) => editFormData.binLocationIds?.includes(b.binId)));
      } catch (error) {
        console.error("Failed to load bins", error);
      } finally { setIsLoadingBins(false); }
    };
    fetchBins();
  }, [editFormData.warehouseId, isEditModalOpen]);

  const handleUpdate = async () => {
    if (!selectedAudit) return;
    if (!editFormData.title || !editFormData.warehouseId || !editFormData.plannedStartDate || !editFormData.plannedEndDate) {
      return toast.error(t("Please fill in all required fields."));
    }
    if (!editFormData.binLocationIds || editFormData.binLocationIds.length === 0) {
      return toast.error(t("Please select at least 1 Bin to audit."));
    }

    try {
      setIsSubmitting(true);
      const now = new Date();
      if (selectedAudit.status === "Planned" && new Date(editFormData.plannedStartDate) < now) {
        return toast.error(t("Planned start date must be in the future."));
      }
      if (new Date(editFormData.plannedEndDate) <= new Date(editFormData.plannedStartDate)) {
        return toast.error(t("End date must be after start date."));
      }
      await auditService.updatePlan(selectedAudit.stockTakeId, editFormData);
      toast.success(t("Audit plan updated successfully!"));
      setIsEditModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("Error updating Audit Plan."));
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedAudit) return;
    try {
      setIsSubmitting(true);
      await auditService.deletePlan(selectedAudit.stockTakeId);
      toast.success(t("Audit plan deleted successfully!"));
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("Error deleting Audit Plan."));
    } finally { setIsSubmitting(false); }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "locked" || s === "inprogress") return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 gap-1 border-blue-200"><Lock className="w-3 h-3" /> {t("In Progress")}</Badge>;
    if (s === "completed") return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 gap-1 border-emerald-200"><CheckCircle2 className="w-3 h-3" /> {t("Completed")}</Badge>;
    if (s === "pendingaccountantreview") return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 gap-1 border-amber-200"><Calculator className="w-3 h-3" /> {t("Pending Accountant")}</Badge>;
    if (s === "pendingmanagerreview") return <Badge className="bg-orange-50 text-orange-700 hover:bg-orange-100 gap-1 border-orange-200"><AlertCircle className="w-3 h-3" /> {t("Pending Manager")}</Badge>;
    if (s === "pendingaccountantapproval") return <Badge className="bg-violet-50 text-violet-700 hover:bg-violet-100 gap-1 border-violet-200"><FileSignature className="w-3 h-3" /> {t("Pending Approval")}</Badge>;
    if (s === "pendingadminreview") return <Badge className="bg-red-50 text-red-700 hover:bg-red-100 gap-1 border-red-200"><ShieldAlert className="w-3 h-3" /> {t("Pending Admin")}</Badge>;
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
        const fromDate = dateRange.from ? dateRange.from : new Date(2000, 0, 1);
        const toDate = dateRange.to ? dateRange.to : new Date(2100, 0, 1);
        matchesDate = itemDate >= fromDate && itemDate <= toDate;
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
            {(role === "accountant" || role === "admin") && (
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
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[160px] bg-white border-slate-200 shadow-sm h-10 px-4 cursor-pointer transition-colors">
                      <SelectValue placeholder={t("Filter by status")} />
                    </SelectTrigger>
                    <SelectContent className="[&_[data-slot=select-viewport]]:p-0">
                      <SelectItem value="All" className="rounded-none py-3 px-4 cursor-pointer">{t("All Status")}</SelectItem>
                      <SelectItem value="Planned" className="rounded-none py-3 px-4 cursor-pointer">{t("Planned")}</SelectItem>
                      <SelectItem value="Assigned" className="rounded-none py-3 px-4 cursor-pointer">{t("Assigned")}</SelectItem>
                      <SelectItem value="InProgress" className="rounded-none py-3 px-4 cursor-pointer">{t("In Progress")}</SelectItem>
                      <SelectItem value="PendingAccountantReview" className="rounded-none py-3 px-4 cursor-pointer">{t("Pending Accountant")}</SelectItem>
                      <SelectItem value="PendingManagerReview" className="rounded-none py-3 px-4 cursor-pointer">{t("Pending Manager")}</SelectItem>
                      <SelectItem value="PendingAccountantApproval" className="rounded-none py-3 px-4 cursor-pointer">{t("Pending Approval")}</SelectItem>
                      <SelectItem value="PendingAdminReview" className="rounded-none py-3 px-4 cursor-pointer">{t("Pending Admin")}</SelectItem>
                      <SelectItem value="Completed" className="rounded-none py-3 px-4 cursor-pointer">{t("Completed")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <DateTimePicker 
                      value={dateRange.from} 
                      onChange={(date) => setDateRange((prev) => ({ ...prev, from: date }))} 
                      placeholder={t("From Date")}
                    />
                    <span className="text-slate-400">-</span>
                    <DateTimePicker 
                      value={dateRange.to} 
                      onChange={(date) => setDateRange((prev) => ({ ...prev, to: date }))} 
                      minDate={dateRange.from}
                      placeholder={t("To Date")}
                    />
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
                      <TableHead className="pl-6 w-[25%] cursor-pointer select-none group" onClick={() => handleSort("title")}>
                        <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                          {t("Audit Info")} {getSortIcon("title")}
                        </div>
                      </TableHead>
                      <TableHead className="w-[18%] cursor-pointer select-none group" onClick={() => handleSort("warehouse")}>
                        <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                          {t("Warehouse")} {getSortIcon("warehouse")}
                        </div>
                      </TableHead>
                      <TableHead className="w-[15%] cursor-pointer select-none group" onClick={() => handleSort("date")}>
                        <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                          {t("Date")} {getSortIcon("date")}
                        </div>
                      </TableHead>
                      <TableHead className="w-[16%] cursor-pointer select-none group" onClick={() => handleSort("status")}>
                        <div className="flex items-center justify-center gap-1.5 hover:text-slate-800 transition-colors">
                          {t("Status")} {getSortIcon("status")}
                        </div>
                      </TableHead>
                      <TableHead className="w-[12%] cursor-pointer select-none group" onClick={() => handleSort("progress")}>
                        <div className="flex items-center justify-center gap-1.5 hover:text-slate-800 transition-colors">
                          {t("Progress")} {getSortIcon("progress")}
                        </div>
                      </TableHead>
                      <TableHead className="w-[14%] pr-6">
                        <div className="flex items-center justify-end gap-1.5">{t("Action")}</div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="h-32 text-center"><div className="flex justify-center items-center gap-2 text-indigo-600"><Loader2 className="w-6 h-6 animate-spin" /> {t("Loading audits...")}</div></TableCell></TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-500 border-b-0"><div className="flex flex-col items-center justify-center gap-2"><FileText className="w-8 h-8 text-slate-300" /><p>{t("No audit sessions found matching your filters.")}</p></div></TableCell></TableRow>
                    ) : (
                      paginatedData.map((audit) => (
                        <TableRow 
                          key={audit.stockTakeId} 
                          className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                          onClick={() => navigateTo("detail", audit.stockTakeId.toString())}
                        >
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-1">
                                <ClipboardList className="w-4 h-4 text-indigo-500" />
                                <span className="font-bold text-slate-800 truncate" title={audit.title}>{audit.title}</span>
                              </div>
                              <span className="text-xs text-slate-400">ID: AUD-{audit.stockTakeId}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <WarehouseIcon className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-600 block truncate" title={audit.warehouseName}>{audit.warehouseName || `${t("Warehouse")} #${audit.warehouseId}`}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                              <CalendarDays className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                              {audit.plannedStartDate ? format(new Date(audit.plannedStartDate), "HH:mm dd/MM/yyyy") : t("N/A")}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{getStatusBadge(audit.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 sm:w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden flex-shrink-0">
                                <div className={`h-1.5 rounded-full ${audit.countingProgress === 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${Math.min(audit.countingProgress, 100)}%` }}></div>
                              </div>
                              <span className="text-xs font-medium text-slate-600">{audit.countingProgress}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2">
                              {(role === "accountant" || role === "admin") && (audit.status === "Planned" || audit.status === "PLAN" || audit.status === "Assigned") && (
                                <>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={(e) => { e.stopPropagation(); handleEditClick(audit); }}><Pencil className="w-4 h-4" /></Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDeleteClick(audit); }}><Trash2 className="w-4 h-4" /></Button>
                                </>
                              )}
                              
                              {role === "manager" && (
                                <div className="flex justify-end gap-2">
                                  {(audit.status === "Planned" || audit.status === "PLAN") && (<Button size="sm" variant="outline" className="shadow-sm border-indigo-200 text-indigo-600 min-w-[100px]" onClick={(e) => { e.stopPropagation(); navigateTo("assign-team", audit.stockTakeId.toString()); }}><Users className="w-3.5 h-3.5 mr-1.5" /> {t("Assign")}</Button>)}
                                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm min-w-[100px]" onClick={(e) => { e.stopPropagation(); navigateTo("detail", audit.stockTakeId.toString()); }}>{t("Detail")}</Button>
                                </div>
                              )}
                              {role === "staff" && (audit.status === "InProgress") && (<Button size="sm" variant="outline" className="shadow-sm border-indigo-200 text-indigo-600 min-w-[100px]" onClick={(e) => { e.stopPropagation(); navigateTo("manual-count", audit.stockTakeId.toString()); }}>{t("Count")} <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>)}
                              {(role === "accountant" || role === "admin") && (<Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm min-w-[100px]" onClick={(e) => { e.stopPropagation(); navigateTo("detail", audit.stockTakeId.toString()); }}>{t("Detail")}</Button>)}
                            </div>
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

        {/* Update Audit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-xl flex items-center gap-2"><Pencil className="w-5 h-5 text-indigo-600" /> {t("Edit Audit Plan")}</DialogTitle>
              <DialogDescription>{t("Update the configuration for this audit session.")}</DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-grow px-6 py-0">
              <div className="space-y-6 pb-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-slate-200 shadow-sm transition-all focus-within:ring-1 focus-within:ring-indigo-100">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">{t("Audit Title *")}</Label>
                      <Input 
                        value={editFormData.title} 
                        onChange={(e) => setEditFormData({...editFormData, title: e.target.value})} 
                        className="bg-white h-[44px] min-h-[44px] max-h-[44px] px-4 border-slate-200 shadow-sm transition-all focus:border-indigo-500" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">{t("Target Warehouse *")}</Label>
                      <div className="h-[44px] min-h-[44px] max-h-[44px]">
                        <Select 
                          value={editFormData.warehouseId.toString()} 
                          onValueChange={(val) => setEditFormData({...editFormData, warehouseId: parseInt(val)})}
                        >
                          <SelectTrigger className="w-full bg-white hover:bg-slate-50 border-slate-200 h-[44px] min-h-[44px] max-h-[44px] px-4 shadow-sm transition-colors justify-start gap-2 [&>span]:line-clamp-1 [&>span]:flex [&>span]:items-center [&>span]:gap-2">
                            <WarehouseIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                            <div className={cn(
                              "flex-1 text-left font-bold text-indigo-700"
                            )}>
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="w-full [&_[data-slot=select-viewport]]:p-0">
                            {warehouses.map(wh => (
                              <SelectItem key={wh.warehouseId} value={wh.warehouseId.toString()} className="rounded-none py-3 px-4 cursor-pointer focus:bg-indigo-600 focus:text-white transition-colors font-bold">
                                {wh.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-slate-400" /> {t("Bin Locations")}</Label>
                      <Button variant="ghost" size="sm" onClick={() => {
                        const allIds = selectAllBins ? [] : bins.map(b => b.binId);
                        setEditFormData({...editFormData, binLocationIds: allIds});
                        setSelectAllBins(!selectAllBins);
                      }} className="h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 font-bold">
                        {selectAllBins ? t("Deselect All") : t("Select All")}
                      </Button>
                    </div>
                    <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                      {isLoadingBins ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" /></div>
                      ) : bins.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {bins.map((bin) => (
                            <div key={bin.binId} className="flex items-center space-x-2 bg-white border border-slate-300 p-2 rounded-lg hover:border-indigo-200 transition-colors">
                              <Checkbox id={`bin-${bin.binId}`} checked={editFormData.binLocationIds?.includes(bin.binId)} onCheckedChange={(checked) => {
                                const current = editFormData.binLocationIds || [];
                                const next = checked ? [...current, bin.binId] : current.filter(id => id !== bin.binId);
                                setEditFormData({...editFormData, binLocationIds: next});
                                setSelectAllBins(next.length === bins.length);
                              }} />
                              <Label htmlFor={`bin-${bin.binId}`} className="text-xs font-medium cursor-pointer truncate">{bin.code}</Label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-xs text-slate-400">{t("No bins available.")}</div>
                      )}
                    </div>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-400" /> {t("Start Date *")}</Label>
                      <DateTimePicker 
                        value={editFormData.plannedStartDate ? new Date(editFormData.plannedStartDate) : undefined} 
                        onChange={(date) => setEditFormData({...editFormData, plannedStartDate: date ? date.toISOString() : ""})} 
                        disablePastDates 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-400" /> {t("End Date *")}</Label>
                      <DateTimePicker 
                        value={editFormData.plannedEndDate ? new Date(editFormData.plannedEndDate) : undefined} 
                        onChange={(date) => setEditFormData({...editFormData, plannedEndDate: date ? date.toISOString() : ""})} 
                        minDate={editFormData.plannedStartDate ? new Date(editFormData.plannedStartDate) : undefined} 
                      />
                    </div>
                  </div>
              </div>
            </ScrollArea>

            <DialogFooter className="pb-6 px-6 pt-0 bg-white-5 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)} 
                disabled={isSubmitting}
                className="h-11 px-6 bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-indigo-600 font-bold transition-all shadow-sm active:scale-[0.98]"
              >
                {t("Cancel")}
              </Button>
              <Button 
                onClick={handleUpdate} 
                disabled={isSubmitting} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px] h-11 font-bold shadow-md transition-all active:scale-[0.98]"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} {t("Save Changes")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2"><Trash2 className="w-5 h-5" /> {t("Delete Audit Plan")}</DialogTitle>
              <DialogDescription className="py-2">{t("Are you sure you want to delete")} <span className="font-bold">"{selectedAudit?.title}"</span>? {t("This action cannot be undone.")}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-between items-center gap-4 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteModalOpen(false)} 
                disabled={isSubmitting}
                className="h-11 px-6 bg-white hover:bg-red-50 border-slate-200 text-slate-600 hover:text-red-600 font-bold transition-all shadow-sm active:scale-[0.98]"
              >
                {t("Cancel")}
              </Button>
              <Button 
                onClick={handleDelete} 
                disabled={isSubmitting} 
                className="h-11 min-w-[150px] bg-red-600 hover:bg-red-700 text-white font-bold shadow-md transition-all active:scale-[0.98]"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} {t("Delete Plan")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}