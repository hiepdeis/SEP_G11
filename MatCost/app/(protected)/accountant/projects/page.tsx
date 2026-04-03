"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  Plus, Edit, Trash2, Loader2, Briefcase, Search, CalendarDays, Delete, 
  ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, FileText, CheckCircle2, AlertCircle, Save
} from "lucide-react";
import { toast } from "sonner";
import { projectService, ProjectDto } from "@/services/project-service";

export default function ProjectsPage() {
  const router = useRouter();
  
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined; }>({ from: undefined, to: undefined });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  const [editingProject, setEditingProject] = useState<ProjectDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const data = await projectService.getAll();
      setProjects(data);
    } catch (error) {
      toast.error("Lỗi tải danh sách dự án.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, dateRange, itemsPerPage, sortConfig]);

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa dự án này? Thao tác không thể hoàn tác.")) return;
    try {
      await projectService.delete(id);
      toast.success("Đã xóa dự án thành công!");
      fetchProjects();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa dự án.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;
    
    if (!editingProject.name.trim() || !editingProject.startDate || !editingProject.endDate) {
       return toast.error("Vui lòng điền đủ Tên dự án và Thời gian.");
    }

    const startDate = new Date(editingProject.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(editingProject.endDate);
    endDate.setHours(0, 0, 0, 0);

    if (endDate <= startDate) {
      return toast.error("Ngày kết thúc phải diễn ra sau ngày bắt đầu.");
    }
    
    try {
      setIsSaving(true);
      await projectService.update(editingProject.projectId, {
        name: editingProject.name,
        startDate: editingProject.startDate,
        endDate: editingProject.endDate,
        budget: editingProject.budget,
        status: editingProject.status
      });
      toast.success("Cập nhật dự án thành công!");
      setEditingProject(null);
      fetchProjects();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const filteredData = projects.filter((item) => {
    const matchesStatus = filterStatus === "All" || item.status === filterStatus;
    const term = searchTerm.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(term) || item.code.toLowerCase().includes(term);

    let matchesDate = true;
    if (dateRange.from || dateRange.to) {
      if (!item.startDate) matchesDate = false;
      else {
        const itemDate = new Date(item.startDate);
        const fromDate = dateRange.from ? startOfDay(dateRange.from) : new Date(2000, 0, 1);
        const toDate = dateRange.to ? endOfDay(dateRange.to) : new Date(2100, 0, 1);
        matchesDate = isWithinInterval(itemDate, { start: fromDate, end: toDate });
      }
    }
    return matchesStatus && matchesSearch && matchesDate;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    if (sortConfig.key === "code") return sortConfig.direction === "asc" ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code);
    if (sortConfig.key === "name") return sortConfig.direction === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    if (sortConfig.key === "budget") return sortConfig.direction === "asc" ? (a.budget || 0) - (b.budget || 0) : (b.budget || 0) - (a.budget || 0);
    if (sortConfig.key === "date") {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }
    if (sortConfig.key === "status") return sortConfig.direction === "asc" ? (a.status || "").localeCompare(b.status || "") : (b.status || "").localeCompare(a.status || "");
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
        <Header title="Quản lý dự án" />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Danh sách Dự án</h1>
              <p className="text-sm text-slate-500">Quản lý ngân sách, tiến độ và hồ sơ các dự án xây dựng.</p>
            </div>
            <Button onClick={() => router.push("/accountant/projects/create")} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
              <Plus className="w-4 h-4 mr-2" /> Thêm Dự án mới
            </Button>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><Briefcase className="w-6 h-6" /></div><div><p className="text-sm font-medium text-slate-500">Tổng số Dự án</p><h3 className="text-2xl font-bold text-slate-900">{projects.length}</h3></div></CardContent></Card>
            <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle2 className="w-6 h-6" /></div><div><p className="text-sm font-medium text-slate-500">Đang hoạt động</p><h3 className="text-2xl font-bold text-slate-900">{projects.filter((a) => a.status === "Active").length}</h3></div></CardContent></Card>
            <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-slate-100 text-slate-600 rounded-lg"><AlertCircle className="w-6 h-6" /></div><div><p className="text-sm font-medium text-slate-500">Đã đóng / Chờ duyệt</p><h3 className="text-2xl font-bold text-slate-900">{projects.filter((a) => a.status !== "Active").length}</h3></div></CardContent></Card>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white flex flex-col gap-0 pb-0">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-slate-500 hidden md:block">Bộ lọc:</span>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[160px] bg-white border-slate-200 shadow-sm h-9 cursor-pointer"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">Tất cả trạng thái</SelectItem>
                      <SelectItem value="Active">Đang hoạt động</SelectItem>
                      <SelectItem value="Pending">Chờ duyệt</SelectItem>
                      <SelectItem value="Closed">Đã đóng</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start text-left font-normal h-9 bg-white shadow-sm", !dateRange.from && "text-slate-500")}>
                          <CalendarDays className="mr-2 h-4 w-4" />{dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : <span>Từ ngày (Bắt đầu)</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateRange.from} onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))} initialFocus /></PopoverContent>
                    </Popover>
                    <span className="text-slate-400">-</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start text-left font-normal h-9 bg-white shadow-sm", !dateRange.to && "text-slate-500")}>
                          <CalendarDays className="mr-2 h-4 w-4" />{dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : <span>Đến ngày (Bắt đầu)</span>}
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
                  <Input placeholder="Tìm kiếm tên, mã dự án..." className="pl-9 bg-white shadow-sm h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 flex flex-col">
              <div className="w-full [&>div]:max-h-[500px] [&>div]:overflow-y-auto">
                <Table className="w-full min-w-[800px] table-fixed">
                  <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="pl-6 w-[15%] cursor-pointer select-none group" onClick={() => handleSort("code")}><div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">Mã Dự Án {getSortIcon("code")}</div></TableHead>
                      <TableHead className="w-[30%] cursor-pointer select-none group" onClick={() => handleSort("name")}><div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">Tên Dự Án {getSortIcon("name")}</div></TableHead>
                      <TableHead className="w-[15%] cursor-pointer select-none group" onClick={() => handleSort("budget")}><div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">Ngân sách {getSortIcon("budget")}</div></TableHead>
                      <TableHead className="w-[20%] cursor-pointer select-none group" onClick={() => handleSort("date")}><div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">Thời gian {getSortIcon("date")}</div></TableHead>
                      <TableHead className="w-[10%] cursor-pointer select-none group text-center" onClick={() => handleSort("status")}><div className="flex items-center justify-center gap-1.5 hover:text-slate-800 transition-colors">Trạng thái {getSortIcon("status")}</div></TableHead>
                      <TableHead className="w-[10%] text-right pr-6">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="h-32 text-center"><div className="flex justify-center items-center gap-2 text-indigo-600"><Loader2 className="w-6 h-6 animate-spin" /> Đang tải danh sách...</div></TableCell></TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-500 border-b-0"><div className="flex flex-col items-center justify-center gap-2"><FileText className="w-8 h-8 text-slate-300" /><p>Không tìm thấy dự án nào phù hợp.</p></div></TableCell></TableRow>
                    ) : (
                      paginatedData.map((p) => (
                        <TableRow key={p.projectId} className="group hover:bg-slate-50/50 transition-colors">
                          <TableCell className="pl-6 font-bold text-slate-700">{p.code}</TableCell>
                          <TableCell className="font-medium text-slate-900 truncate max-w-[200px]" title={p.name}>{p.name}</TableCell>
                          <TableCell className="text-indigo-600 font-semibold">{p.budget ? p.budget.toLocaleString("vi-VN") + " ₫" : "—"}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-slate-500 font-medium">
                            {p.startDate ? new Date(p.startDate).toLocaleDateString("vi-VN") : "?"} 
                            <span className="mx-1.5 text-slate-300">-</span> 
                            {p.endDate ? new Date(p.endDate).toLocaleDateString("vi-VN") : "?"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${p.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : p.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                              {p.status || "N/A"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                             <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setEditingProject(p)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 rounded-full"><Edit className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(p.projectId)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 rounded-full"><Trash2 className="w-4 h-4" /></Button>
                             </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {!isLoading && filteredData.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50 gap-4">
                  <div className="text-sm text-slate-500">
                    Đang hiển thị <span className="font-medium text-slate-900">{startIndex + 1}</span> đến <span className="font-medium text-slate-900">{Math.min(endIndex, filteredData.length)}</span> trên <span className="font-medium text-slate-900">{filteredData.length}</span> kết quả
                  </div>
                  <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 whitespace-nowrap">Số dòng:</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
                        <SelectTrigger className="h-8 w-[70px] bg-white border-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="-1">Tất cả</SelectItem>
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

        {/* Edit Modal */}
        <Dialog open={editingProject !== null} onOpenChange={(o) => !o && setEditingProject(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-indigo-700"><Briefcase className="w-5 h-5"/> Chỉnh sửa Dự án</DialogTitle></DialogHeader>
            {editingProject && (
              <div className="space-y-5 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Mã Dự án</label>
                  <Input value={editingProject.code} disabled className="bg-slate-100 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Tên Dự án <span className="text-red-500">*</span></label>
                  <Input value={editingProject.name} onChange={e => setEditingProject({...editingProject, name: e.target.value})} className="focus:bg-white bg-slate-50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 flex flex-col">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Ngày bắt đầu</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-slate-50", !editingProject.startDate && "text-slate-500")}>
                          <CalendarDays className="mr-2 h-4 w-4" />{editingProject.startDate ? format(new Date(editingProject.startDate), "dd/MM/yyyy") : <span>Chọn ngày...</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={editingProject.startDate ? new Date(editingProject.startDate) : undefined} onSelect={(date) => {
                           setEditingProject({...editingProject, startDate: date ? format(date, "yyyy-MM-dd") : undefined});
                           if (date && editingProject.endDate && date >= new Date(editingProject.endDate)) {
                              setEditingProject(prev => ({...prev!, endDate: undefined}));
                           }
                        }} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Ngày kết thúc</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-slate-50", !editingProject.endDate && "text-slate-500")}>
                          <CalendarDays className="mr-2 h-4 w-4" />{editingProject.endDate ? format(new Date(editingProject.endDate), "dd/MM/yyyy") : <span>Chọn ngày...</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={editingProject.endDate ? new Date(editingProject.endDate) : undefined} onSelect={(date) => setEditingProject({...editingProject, endDate: date ? format(date, "yyyy-MM-dd") : undefined})} initialFocus disabled={(date) => editingProject.startDate ? date <= new Date(editingProject.startDate) : false}/>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Ngân sách (VNĐ)</label>
                    <Input type="number" value={editingProject.budget || ''} onChange={e => setEditingProject({...editingProject, budget: parseFloat(e.target.value) || undefined})} className="focus:bg-white bg-slate-50" />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="gap-4 sm:space-x-4 border-t pt-4">
              <Button variant="outline" onClick={() => setEditingProject(null)}>Hủy bỏ</Button>
              <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-indigo-600 text-white hover:bg-indigo-700">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2"/>} Lưu thay đổi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}