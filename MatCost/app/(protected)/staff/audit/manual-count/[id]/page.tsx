"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { ArrowLeft, Send, CheckCircle2, Save, Loader2, Filter, Search, Download, Upload, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditService } from "@/services/audit-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import ReactSignatureCanvas from "react-signature-canvas";
import { OtpVerificationModal } from "@/components/ui/custom/otp-modal";
import { Eraser, FileSignature } from "lucide-react";
import * as XLSX from "xlsx";

interface NormalizedTask {
  id: string;
  materialId: number;
  materialName: string;
  batchId: number;
  batchCode: string;
  mfgDate?: string | null;
  expiryDate?: string | null;
  binId: number;
  binCode: string;
  countQty: string;
  originalQty: string;
  isRecount: boolean;
  status: "uncounted" | "counted"; // local tracking
}

export default function StaffCountingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const stockTakeId = Number(params?.id);

  const [tasks, setTasks] = useState<NormalizedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [binFilter, setBinFilter] = useState<string>("All");
  
  // Status filter options: All, Uncounted, Counted
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Signature
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const sigCanvas = useRef<ReactSignatureCanvas>(null);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const loadTasks = async () => {
    try {
        setLoading(true);
        setAccessDenied(false); 
        const [uncountedData, countedData, recountData] = await Promise.all([
           auditService.getUncountedItems(stockTakeId),
           auditService.getCountedItems(stockTakeId),
           auditService.getRecountItems(stockTakeId, "")
        ]);
        
        let merged: NormalizedTask[] = [];

        const addTasks = (data: any[], isRec: boolean, defaultStatus: "uncounted" | "counted") => {
            data.forEach((item) => {
               const qty = item.countQty !== undefined && item.countQty !== null ? String(item.countQty) : "";
               const nTask: NormalizedTask = {
                  id: `${item.materialId}-${item.batchId}-${item.binId || item.binCode}`,
                  materialId: item.materialId,
                  materialName: item.materialName,
                  batchId: item.batchId || 0,
                  batchCode: item.batchCode || "",
                  mfgDate: item.mfgDate,
                  expiryDate: item.expiryDate,
                  binId: item.binId || 0,
                  binCode: item.binCode || "",
                  countQty: qty,
                  originalQty: qty,
                  isRecount: isRec,
                  status: (qty !== "" || defaultStatus === "counted") ? "counted" : "uncounted"
               };
               if (!merged.find(x => x.id === nTask.id)) {
                   merged.push(nTask);
               }
            });
        };

        if (recountData && recountData.length > 0) {
            recountData.forEach((item: any) => {
                const isPending = item.discrepancyStatus === "RecountRequested";
                const qty = isPending ? "" : (item.countQty !== undefined && item.countQty !== null ? String(item.countQty) : "");
                const nTask: NormalizedTask = {
                    id: `${item.materialId}-${item.batchId}-${item.binId || item.binCode}`,
                    materialId: item.materialId,
                    materialName: item.materialName,
                    batchId: item.batchId || 0,
                    batchCode: item.batchCode || "",
                    mfgDate: item.mfgDate,
                    expiryDate: item.expiryDate,
                    binId: item.binId || 0,
                    binCode: item.binCode || "",
                    countQty: qty,
                    originalQty: qty,
                    isRecount: isPending,
                    status: isPending ? "uncounted" : "counted"
                };
                if (!merged.find(x => x.id === nTask.id)) {
                    merged.push(nTask);
                }
            });
        } else {
            if (uncountedData) addTasks(uncountedData, false, "uncounted");
            if (countedData) addTasks(countedData, false, "counted");
        }

        setTasks(merged);
    } catch (error: any) {
        const status = error.response?.status;
        if (status === 401 || status === 403) setAccessDenied(true); 
        else toast.error(t("Error loading tasks. Please try again."));
    } finally { setLoading(false); }
  };

  useEffect(() => { if (stockTakeId) loadTasks(); }, [stockTakeId]);

  const uniqueBins = Array.from(new Set(tasks.map(t => t.binCode).filter(Boolean))).sort();

  const handleQtyChange = (id: string, val: string) => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, countQty: val } : t));
  };

  const saveRow = async (task: NormalizedTask) => {
    if (!task.binCode) return toast.error(t("Missing Bin Code!"));
    const qty = parseFloat(task.countQty);
    if (isNaN(qty) || qty < 0) return toast.error(t("Invalid quantity!"));

    try {
        setSavingIds(prev => new Set(prev).add(task.id));
        const payload = { materialId: task.materialId, binCode: task.binCode, batchCode: task.batchCode, batchId: task.batchId, countQty: qty };
        
        if (task.isRecount) await auditService.submitRecount(stockTakeId, payload);
        else await auditService.submitCount(stockTakeId, payload);
        
        toast.success(`${t("Saved")} ${task.materialName}`);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, originalQty: task.countQty, status: "counted" } : t));
    } catch (error: any) { 
        toast.error(t(error.response?.data?.message || "Error saving quantity.")); 
    } finally { 
        setSavingIds(prev => {
            const next = new Set(prev);
            next.delete(task.id);
            return next;
        });
    }
  };

  const handleExport = () => {
    const dataToExport = filteredData.map((t, index) => ({
      "STT": index + 1,
      "Tên vật tư": t.materialName,
      "Mã": t.materialId,
      "Số lô": t.batchCode,
      "Kho": t.binCode,
      "Số lượng": null 
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [{wch: 5}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kiem_ke");
    XLSX.writeFile(wb, `Mau_Kiem_Ke_Phieu_${stockTakeId}_Kho_${binFilter}.xlsx`);
    toast.success(t("Exported successfully! Fill 'Số lượng' and import back."));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            setIsImporting(true);
            const bstr = evt.target?.result as string;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsName = wb.SheetNames[0];
            const ws = wb.Sheets[wsName];
            const data = XLSX.utils.sheet_to_json<any>(ws);

            let successCount = 0;
            let promises = [];

            for (const row of data) {
                const mCode = row["Mã"];
                const bCode = row["Số lô"] ? String(row["Số lô"]) : "";
                const binCode = row["Kho"] ? String(row["Kho"]) : "";
                const qtyVal = row["Số lượng"];

                if (qtyVal !== undefined && qtyVal !== null && qtyVal !== "") {
                    // Check if string is just empty spaces
                    if (typeof qtyVal === 'string' && qtyVal.trim() === "") continue;
                    
                    // Replace commas in case of string formatted numbers "1,000"
                    const stringVal = String(qtyVal).replace(/,/g, '').trim();
                    const parsedQty = parseFloat(stringVal);
                    
                    if (!isNaN(parsedQty) && parsedQty >= 0) {
                        const matched = tasks.find(t => t.materialId == mCode && t.batchCode == bCode && t.binCode == binCode);
                        if (matched && matched.originalQty !== String(parsedQty)) {
                            const payload = { materialId: matched.materialId, binCode: matched.binCode, batchCode: matched.batchCode, batchId: matched.batchId, countQty: parsedQty };
                            const p = matched.isRecount ? auditService.submitRecount(stockTakeId, payload) : auditService.submitCount(stockTakeId, payload);
                            promises.push(p);
                            successCount++;
                        }
                    }
                }
            }

            if (promises.length > 0) {
                await Promise.all(promises);
                toast.success(t(`Import successful! Updated ${successCount} items.`));
                await loadTasks();
            } else {
                toast.info(t("No valid quantity changes found in the file."));
            }

        } catch (err) {
            console.error(err);
            toast.error(t("Failed to import Excel file. Please ensure format is correct."));
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    reader.readAsBinaryString(file);
  };

  const handleCompleteAudit = () => {
    const hasUncounted = tasks.some(t => t.status === "uncounted");
    if (hasUncounted) return toast.error(t("You must complete all counting tasks before submitting!"));
    setIsSignatureModalOpen(true);
  };

  const handleSignatureEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) setIsSigned(true);
  };

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsSigned(false);
    }
  };

  const handleConfirmFullSubmit = async () => {
    if (!isSigned || !sigCanvas.current || sigCanvas.current.isEmpty()) {
       return toast.error(t("Please provide your signature before submitting"));
    }
    const signature = sigCanvas.current.toDataURL();
    setSignatureData(signature);
    
    setIsSignatureModalOpen(false);
    setIsOtpModalOpen(true);
  };

  const handleOtpSuccess = async () => {
    if (!signatureData) return;
    try {
      setIsSubmittingFinal(true);
      await auditService.signOff(stockTakeId, signatureData);
      toast.success(t("Audit results submitted and signed successfully!"));
      router.push('/staff/audit');
    } catch (error: any) {
      toast.error(t(error.response?.data?.message || "Error submitting results."));
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  const filteredData = tasks.filter(task => {
    if (binFilter !== "All" && task.binCode !== binFilter) return false;
    
    if (statusFilter === "Uncounted" && task.status !== "uncounted") return false;
    if (statusFilter === "Counted" && task.status !== "counted") return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return task.materialName.toLowerCase().includes(term) || task.batchCode.toLowerCase().includes(term) || task.materialId.toString().includes(term);
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [binFilter, statusFilter, searchTerm]);

  const totalPages = itemsPerPage > 0 ? Math.ceil(filteredData.length / itemsPerPage) : 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = itemsPerPage > 0 ? filteredData.slice(startIndex, endIndex) : filteredData;

  const totalTasks = tasks.length;
  const countedItems = tasks.filter(t => t.status === "counted").length;
  const progress = totalTasks > 0 ? Math.round((countedItems / totalTasks) * 100) : 0;
  const isRecountMode = tasks.some(t => t.isRecount);

  return (
    <div className="flex flex-row h-screen w-screen bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Manual Count Task")} />
        
        <div className="flex-1 w-full overflow-y-auto">
          {loading ? (
             <div className="flex flex-col items-center justify-center pt-32"><Loader2 className="animate-spin w-8 h-8 text-indigo-600 mb-4" /><p className="text-slate-500 font-medium">{t("Loading audit data...")}</p></div>
          ) : accessDenied ? (
             <div className="flex flex-col items-center justify-center pt-32 pb-20 space-y-5 px-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm"><CheckCircle2 className="w-12 h-12 text-emerald-600" /></div>
                  <h2 className="text-3xl font-extrabold text-slate-800 text-center">{t("Task Completed!")}</h2>
                  <p className="text-slate-600 text-center max-w-md text-base leading-relaxed">
                      {t("You have submitted the count results for this audit.")}<br/><br/>
                      {t("Please wait for Manager's review. If there are discrepancies, a recount may be requested.")}
                  </p>
                  <Button size="lg" className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md h-12 px-8" onClick={() => router.push('/staff/audit')}><ArrowLeft className="w-5 h-5 mr-2" /> {t("Back to List")}</Button>
             </div>
          ) : (
            <div className="p-4 lg:p-6 space-y-6 w-full max-w-[98%] mx-auto pb-6">
              
              <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-indigo-600"><ArrowLeft className="w-4 h-4 mr-2" /> {t("Back")}</Button>
                  <div className="text-sm font-medium text-slate-500">Audit ID: <span className="text-slate-900 font-bold">#{stockTakeId}</span></div>
              </div>
              
              <div className={`${isRecountMode ? "bg-amber-600" : "bg-indigo-600"} rounded-xl p-6 text-white shadow-md relative overflow-hidden`}>
                  <div className="flex justify-between items-end mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">{t("Your Progress")}</h2>
                        <p className={`${isRecountMode ? "text-amber-100" : "text-indigo-100"} text-sm mt-1`}>{isRecountMode ? t("Recount - Round 2") : t("Round 1")}</p>
                    </div>
                    <div className="text-4xl font-black">{progress}%</div>
                  </div>
                  <div className={`w-full ${isRecountMode ? "bg-amber-900/40" : "bg-indigo-900/40"} h-2.5 rounded-full overflow-hidden`}>
                      <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
              </div>
              
              <Card className="border-slate-200 shadow-sm overflow-hidden bg-white py-0 gap-0">
                <CardContent className="p-0">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-4">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full">
                            
                            <div className="flex flex-wrap items-center gap-3">
                                <Select value={binFilter} onValueChange={setBinFilter}>
                                    <SelectTrigger className="w-[180px] bg-white border-slate-200 shadow-sm h-10 px-4 cursor-pointer">
                                        <SelectValue placeholder={t("Filter by Bin")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All" className="font-bold">{t("All Bins")}</SelectItem>
                                        {uniqueBins.map(bin => <SelectItem key={bin} value={bin}>{bin}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px] bg-white border-slate-200 shadow-sm h-10 px-4 cursor-pointer">
                                        <SelectValue placeholder={t("Status")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">{t("All Status")}</SelectItem>
                                        <SelectItem value="Uncounted">{t("Uncounted")}</SelectItem>
                                        <SelectItem value="Counted">{t("Counted")}</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                                <Button variant="outline" className="h-10 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700" onClick={handleExport}>
                                    <Download className="w-4 h-4 mr-2" /> {t("Export")}
                                </Button>
                                
                                <input type="file" accept=".xlsx, .xls" ref={fileInputRef} className="hidden" onChange={handleImport} />
                                <Button className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                                    {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} 
                                    {t("Import Excel")}
                                </Button>
                            </div>

                            <div className="relative w-full xl:w-72 flex-shrink-0">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input placeholder={t("Search name or batch...")} className="pl-10 h-10 bg-white shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>

                        </div>
                    </div>

                    <div className="w-full max-h-[500px] overflow-y-auto">
                        <Table className="w-full min-w-[800px] table-fixed">
                            <TableHeader className="sticky top-0 z-20 bg-slate-100 shadow-sm outline outline-1 outline-slate-200">
                                <TableRow>
                                    <TableHead className="w-[6%] text-center pl-4 font-bold text-slate-800 text-[11px] tracking-wider uppercase">{t("No.")}</TableHead>
                                    <TableHead className="w-[28%] font-bold text-slate-800 text-[11px] tracking-wider uppercase">{t("Material")}</TableHead>
                                    <TableHead className="w-[12%] text-center font-bold text-slate-800 text-[11px] tracking-wider uppercase">{t("Batch")}</TableHead>
                                    <TableHead className="w-[12%] text-center font-bold text-slate-800 text-[11px] tracking-wider uppercase">{t("Bin")}</TableHead>
                                    <TableHead className="w-[14%] text-center font-bold text-slate-800 text-[11px] tracking-wider uppercase">{t("Status")}</TableHead>
                                    <TableHead className="w-[14%] text-center font-bold text-slate-800 text-[11px] tracking-wider uppercase">{t("Quantity")}</TableHead>
                                    <TableHead className="w-[14%] text-right pr-6 font-bold text-slate-800 text-[11px] tracking-wider uppercase">{t("Action")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-slate-500 border-b-0">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Package className="w-8 h-8 text-slate-300" />
                                                <p>{t("No items found matching criteria.")}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((task, idx) => (
                                        <TableRow key={task.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="text-center pl-4 text-slate-500 text-sm font-medium">{startIndex + idx + 1}</TableCell>
                                            <TableCell>
                                                <div className="font-bold text-slate-800 truncate" title={task.materialName}>{task.materialName}</div>
                                                <div className="text-xs text-slate-500 uppercase mt-0.5">{t("Code")}: {task.materialId}</div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    <span className="text-sm font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">{task.batchCode || '-'}</span>
                                                    {(task.mfgDate || task.expiryDate) && (
                                                        <div className="text-[10px] text-slate-500 whitespace-nowrap">
                                                            {task.mfgDate ? new Date(task.mfgDate).toLocaleDateString() : '-'} 
                                                            <span className="mx-1">→</span> 
                                                            {task.expiryDate ? new Date(task.expiryDate).toLocaleDateString() : '-'}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-md">{task.binCode}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {task.status === "counted" ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> {t("Counted")}</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">{t("Uncounted")}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input 
                                                    type="number" 
                                                    min="0"
                                                    value={task.countQty}
                                                    onChange={(e) => handleQtyChange(task.id, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            if (!savingIds.has(task.id) && task.countQty !== "" && task.originalQty !== task.countQty) {
                                                                saveRow(task);
                                                            }
                                                        }
                                                    }}
                                                    className={`h-9 w-24 mx-auto text-center font-bold shadow-sm ${task.originalQty !== task.countQty ? "border-amber-400 bg-amber-50" : ""}`}
                                                    placeholder="0"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => saveRow(task)}
                                                    disabled={savingIds.has(task.id) || task.countQty === "" || (task.originalQty === task.countQty && task.status === "counted")}
                                                    className={`h-8 min-w-[80px] shadow-sm transition-colors ${task.originalQty !== task.countQty ? "bg-amber-500 hover:bg-amber-600 font-bold" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
                                                >
                                                    {savingIds.has(task.id) ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />} 
                                                    {t("Save")}
                                                </Button>
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
                                        <SelectTrigger className="h-8 w-[70px] bg-white border-slate-200 shadow-sm"><SelectValue /></SelectTrigger>
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
                                    <Button variant="outline" size="icon" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="h-8 w-8 shadow-sm bg-white"><ChevronLeft className="w-4 h-4" /></Button>
                                    <div className="text-sm font-medium text-slate-600 px-1 min-w-[70px] text-center">{currentPage} / {totalPages}</div>
                                    <Button variant="outline" size="icon" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="h-8 w-8 shadow-sm bg-white"><ChevronRight className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
              </Card>

            </div>
          )}
        </div>

        {!accessDenied && !loading && (
          <div className="shrink-0 p-4 bg-white border-t border-slate-200 flex justify-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
            <Button 
                size="lg" 
                className={`w-full max-w-2xl font-bold h-12 shadow-md transition-all duration-300 ${progress < 100 ? "bg-slate-300 hover:bg-slate-300 text-slate-500" : "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]"}`} 
                onClick={handleCompleteAudit} 
                disabled={progress < 100}
            >
                <FileSignature className="w-5 h-5 mr-2" /> {t("Review & Submit Entire Count")}
            </Button>
          </div>
        )}

        {/* SIGNATURE MODAL */}
        <Dialog open={isSignatureModalOpen} onOpenChange={(o) => { if (!isSubmittingFinal) setIsSignatureModalOpen(o); }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-700">
                <FileSignature className="w-5 h-5" /> {t("Sign Audit Record")}
              </DialogTitle>
              <DialogDescription>
                {t("As the team representative, sign below to confirm the count data is accurate and submit for review.")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6 flex flex-col items-center">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-1 bg-white w-full">
                <ReactSignatureCanvas
                  ref={sigCanvas}
                  penColor="navy"
                  onEnd={handleSignatureEnd}
                  canvasProps={{
                    className: "w-full h-48 rounded-md cursor-crosshair",
                    style: { width: '100%' }
                  }}
                />
              </div>
              <div className="flex w-full justify-between items-center mt-3">
                <span className="text-xs text-slate-400 italic">{t("Sign inside the area above")}</span>
                <Button variant="ghost" size="sm" onClick={clearSignature} className="text-slate-500 h-8 px-2 hover:bg-transparent hover:text-indigo-600">
                  <Eraser className="w-3.5 h-3.5 mr-1.5" /> {t("Clear")}
                </Button>
              </div>
            </div>

            <DialogFooter className="flex flex-row gap-3 sm:gap-3 w-full mt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsSignatureModalOpen(false)} 
                disabled={isSubmittingFinal}
                className="flex-1 h-11 px-6 bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-indigo-600 font-bold transition-all shadow-sm active:scale-[0.98]"
              >
                {t("Cancel")}
              </Button>
              <Button 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 shadow-md transition-all active:scale-[0.98]"
                onClick={handleConfirmFullSubmit}
                disabled={!isSigned || isSubmittingFinal}
              >
                {isSubmittingFinal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {t("Submit & Return to List")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <OtpVerificationModal
          isOpen={isOtpModalOpen}
          onClose={() => setIsOtpModalOpen(false)}
          onSuccess={handleOtpSuccess}
        />
      </main>
    </div>
  );
}