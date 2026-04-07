"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { ArrowLeft, Lock, AlertTriangle, CheckCircle, FileSignature, Download, Loader2, Search, ClipboardList, MapPin, LayoutGrid, Unlock, AlertCircle, Users, CheckCircle2, ChevronLeft, ChevronRight, Check, RefreshCcw, Eraser, Package, ClipboardCheck, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditService, RecountCandidateDto, StockTakeReviewDetailDto, VarianceItemDto } from "@/services/audit-service";
import { toast } from "sonner";
import ReactSignatureCanvas, { SignatureCanvas } from "react-signature-canvas";
import { useTranslation } from "react-i18next";

type UserRole = "admin" | "manager" | "accountant" | "staff";

interface AuditDetailProps { role: UserRole; }

export default function SharedAuditDetail({ role }: AuditDetailProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const stockTakeId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState<StockTakeReviewDetailDto | null>(null);
  const [variances, setVariances] = useState<VarianceItemDto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManagerSigning, setIsManagerSigning] = useState(false); 
  const [isAccountantFinalizing, setIsAccountantFinalizing] = useState(false); 

  const sigCanvas = useRef<ReactSignatureCanvas>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [resolveItem, setResolveItem] = useState<VarianceItemDto | null>(null);
  const [resolveAction, setResolveAction] = useState("");
  const [candidates, setCandidates] = useState<RecountCandidateDto[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  const canExport = ["accountant", "admin", "manager"].includes(role);
  const canResolve = ["manager"].includes(role);
  const isManagerSigned = detailData?.signatures?.some(s => s.role?.toLowerCase() === "manager");

  const fetchData = async () => {
    if (!stockTakeId) return;
    try {
      setLoading(true);
      const [reviewInfo, varianceList] = await Promise.all([ auditService.getReviewDetail(stockTakeId), auditService.getVariances(stockTakeId) ]);
      setDetailData(reviewInfo);

      if (varianceList) {
         const actualVariances = varianceList.filter((v: any) => v.variance !== 0);
         setVariances(actualVariances);
      }
      
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [stockTakeId]);
  useEffect(() => { setCurrentPage(1); }, [itemsPerPage]);

  const handleConfirmResolve = async () => {
    if (!resolveItem || !resolveAction) return toast.error(t("Select Resolution Action"));
    try {
      setIsSubmitting(true);
      if (resolveAction === "RequestRecount") {
         await auditService.requestRecount(stockTakeId, resolveItem.id, 1, "Manager recount request");
         toast.success(t("Recount request sent to staff!"));
      } else {
         await auditService.resolveVariance(stockTakeId, resolveItem.id, resolveAction, 1); 
         toast.success(t("Variance resolved successfully!"));
      }
      await fetchData(); 
      setResolveItem(null);
    } catch (error: any) { toast.error(error.response?.data?.message || "Error"); } finally { setIsSubmitting(false); }
  };

  const handleQuickRecount = async (item: VarianceItemDto) => {
    try {
        setIsSubmitting(true);
        await auditService.requestRecount(stockTakeId, item.id, 1, "Manager recount request");
        toast.success(t("Recount request sent to staff!"));
        await fetchData();
    } catch (error: any) { toast.error(error.response?.data?.message || "Error"); } finally { setIsSubmitting(false); }
  };

  const handleLockAudit = async () => {
    try {
      setIsSubmitting(true);
      await auditService.lockAudit(stockTakeId);
      toast.success(t("Warehouse locked! Staff can start counting."));
      await fetchData();
    } catch (error: any) { toast.error(error.response?.data?.message || "Error"); } finally { setIsSubmitting(false); }
  };

  const handleSignatureEnd = () => { if (sigCanvas.current && !sigCanvas.current.isEmpty()) setIsSigned(true); };
  const clearSignature = () => { if (sigCanvas.current) { sigCanvas.current.clear(); setIsSigned(false); } };

  const handleManagerSubmit = async () => {
    try {
      setIsSubmitting(true);
      await auditService.signOff(stockTakeId, t("Manager has signed off the resolution"));
      toast.success(t("Signed successfully! Audit is pending Accountant finalization."));
      setIsManagerSigning(false);
      await fetchData(); 
    } catch (error: any) { toast.error(error.response?.data?.message || "Error"); } finally { setIsSubmitting(false); clearSignature(); }
  };

  const handleAccountantFinalize = async () => {
    try {
      setIsSubmitting(true);
      try { await auditService.signOff(stockTakeId, t("Accountant has reviewed and finalized")); } 
      catch (signError: any) { if (signError.response?.data?.message !== "You have already signed off on this audit.") throw signError; }
      
      await auditService.finalizeAudit(stockTakeId, t("Update inventory based on audit results"));
      toast.success(t("Finalized and inventory updated successfully!"));
      router.push(`/${role}/audit`);
    } catch (error: any) { toast.error(error.response?.data?.message || "Error"); } finally { setIsSubmitting(false); setIsAccountantFinalizing(false); clearSignature(); }
  };

  const fetchCandidates = async () => {
    try {
      const data = await auditService.getRecountCandidates(stockTakeId);
      setCandidates(data);
      setShowCandidates(true);
    } catch (e) { toast.error("Error"); }
  };

  const handleRejoin = async (userId: number) => {
    try {
      await auditService.rejoinForRecount(stockTakeId, userId);
      toast.success(t("Staff re-summoned successfully!"));
      fetchCandidates(); 
    } catch (e: any) { toast.error(e.response?.data?.message || "Error"); }
  };

  const handleExportPdf = async () => {
    try {
      toast.info(t("Generating PDF report..."));
      const pdfBlob = await auditService.exportPdf(stockTakeId);
      const url = window.URL.createObjectURL(new Blob([pdfBlob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Stocktake-Report-${stockTakeId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t("Report downloaded successfully!"));
    } catch (error) { toast.error(t("Error exporting PDF file.")); }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "locked" || s === "inprogress") return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 gap-1 border-none"><Lock className="w-3 h-3" /> {t("In Progress (Locked)")}</Badge>;
    if (s === "completed") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 gap-1 border-none"><CheckCircle2 className="w-3 h-3" /> {t("Completed")}</Badge>;
    if (s === "readyforreview") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 gap-1 border-none"><AlertCircle className="w-3 h-3" /> {t("Ready For Review")}</Badge>;
    if (s === "assigned") return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 gap-1 border-none"><Users className="w-3 h-3" /> {t("Assigned")}</Badge>;
    return <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none gap-1"><Unlock className="w-3 h-3" /> {t("Planned")}</Badge>;
  };

  const hasRecountRequested = variances.some(v => v.discrepancyStatus === "RecountRequested");
  const hasUnresolvedVariances = variances.some(v => !v.resolutionAction);
  const metrics = detailData?.metrics;
  const isCountComplete = (metrics?.totalItems ?? 0) > 0 && (metrics?.countedItems === metrics?.totalItems);
  const canManagerSignOff = isCountComplete && !hasUnresolvedVariances && !hasRecountRequested;

  const isAll = itemsPerPage === -1;
  const totalPages = isAll ? 1 : Math.ceil(variances.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * (isAll ? variances.length : itemsPerPage);
  const endIndex = isAll ? variances.length : startIndex + itemsPerPage;
  const paginatedVariances = variances.slice(startIndex, endIndex);

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-50"><div className="flex flex-col items-center gap-2 text-indigo-600"><Loader2 className="w-8 h-8 animate-spin" /><p className="text-sm font-medium">{t("Loading audit data...")}</p></div></div>;
  if (!detailData) return <div className="p-10 text-center">Audit not found</div>;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Review Audit")} #${stockTakeId}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-indigo-600"><ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to List")}</Button>
            <div className="text-sm text-slate-500">{t("Created on:")} <span className="font-medium text-slate-700">{detailData.timeline?.createdAt ? new Date(detailData.timeline.createdAt).toLocaleDateString("vi-VN") : "N/A"}</span></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg shrink-0"><Package className="w-5 h-5" /></div><div><p className="text-xs font-medium text-slate-500 uppercase">{t("Total Items")}</p><h3 className="text-xl font-bold text-slate-900">{metrics?.totalItems || 0}</h3></div></CardContent></Card>
                <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-blue-100 text-blue-600 rounded-lg shrink-0"><ClipboardCheck className="w-5 h-5" /></div><div><p className="text-xs font-medium text-slate-500 uppercase">{t("Counted")}</p><h3 className="text-xl font-bold text-slate-900">{metrics?.countedItems || 0}</h3></div></CardContent></Card>
                <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg shrink-0"><CheckCircle2 className="w-5 h-5" /></div><div><p className="text-xs font-medium text-emerald-600 uppercase">{t("Matched")}</p><h3 className="text-xl font-bold text-emerald-700">{metrics?.matchedItems || 0}</h3></div></CardContent></Card>
                <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-rose-100 text-rose-600 rounded-lg shrink-0"><AlertTriangle className="w-5 h-5" /></div><div><p className="text-xs font-medium text-rose-600 uppercase">{t("Discrepancy")}</p><h3 className="text-xl font-bold text-rose-700">{metrics?.discrepancyItems || 0}</h3></div></CardContent></Card>
              </div>

              <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col gap-0">
                <CardHeader className="bg-white border-b border-slate-100 py-4 flex flex-row justify-between items-center">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pb-5"><ClipboardList className="w-4 h-4 text-indigo-600" /> {t("Discrepancies Details")}</CardTitle>
                  <div className="flex gap-2">
                    {canExport && detailData.status === "Completed" && (
                      <Button variant="outline" size="sm" className="h-8 text-xs border-indigo-200 text-indigo-700 bg-indigo-50" onClick={handleExportPdf}><Download className="w-3.5 h-3.5 mr-1.5" /> {t("Download PDF")}</Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex flex-col">
                  <div className="w-full [&>div]:max-h-[305px] [&>div]:overflow-y-auto">
                    <Table className="w-full min-w-[700px] table-fixed">
                      <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableHead className="pl-6 w-[28%]">{t("Material")}</TableHead>
                          <TableHead className="text-right w-[12%]">{t("Sys Qty")}</TableHead>
                          <TableHead className="text-right w-[12%]">{t("Count Qty")}</TableHead>
                          <TableHead className="text-right w-[12%]">{t("Variance")}</TableHead>
                          <TableHead className="text-center w-[10%]">{t("Round")}</TableHead>
                          <TableHead className="text-center w-[14%]">{t("Status")}</TableHead>
                          <TableHead className="text-right pr-6 w-[12%]">{t("Action")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedVariances.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-500 border-b-0"><div className="flex flex-col items-center justify-center gap-2"><CheckCircle className="w-8 h-8 text-emerald-400" /><p>{t("All items matched perfectly. No discrepancies found.")}</p></div></TableCell></TableRow>
                        ) : (
                          paginatedVariances.map((row) => {
                            let countRound = (row as any).countRound;
                            if (!countRound || countRound <= 0) countRound = (row.discrepancyStatus === "Recounted" || row.discrepancyStatus === "RecountRequested") ? 2 : 1;
                            return (
                            <TableRow key={row.id} className="hover:bg-slate-50/50">
                              <TableCell className="pl-6"><div className="font-medium text-slate-700 truncate max-w-[200px]" title={row.materialName}>{row.materialName}</div><div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5"><span><LayoutGrid className="w-3 h-3 inline mr-1" />{row.binCode}</span></div></TableCell>
                              <TableCell className="text-right text-slate-500">{row.systemQty}</TableCell>
                              <TableCell className="text-right font-bold text-slate-900">{row.countQty}</TableCell>
                              <TableCell className={`text-right font-bold ${row.variance < 0 ? "text-red-600" : "text-blue-600"}`}>{row.variance > 0 ? "+" : ""}{row.variance}</TableCell>
                              <TableCell className="text-center font-medium text-slate-600">{countRound}</TableCell>
                              <TableCell className="text-center">
                                {row.resolutionAction ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">{t("Resolved")}</Badge> : row.discrepancyStatus === "RecountRequested" ? <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-normal flex items-center justify-center gap-1 mx-auto w-fit"><RefreshCcw className="w-3 h-3" /> {t("Recounting")}</Badge> : <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-normal flex items-center justify-center gap-1 mx-auto w-fit"><AlertTriangle className="w-3 h-3" /> {t("Pending")}</Badge>}
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                {canResolve && !row.resolutionAction && row.discrepancyStatus !== "RecountRequested" && !isManagerSigned && (
                                  row.discrepancyStatus === "Discrepancy" ? <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-500" onClick={() => handleQuickRecount(row)} disabled={isSubmitting}><RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> {t("Recount")}</Button> : <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200" onClick={() => { setResolveItem(row); setResolveAction(""); }}>{t("Resolve")}</Button>
                                )}
                                {row.resolutionAction && <span className="text-xs text-slate-400 italic block">{t(row.resolutionAction)}</span>}
                              </TableCell>
                            </TableRow>
                          )})
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {variances.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50 gap-4 mt-auto">
                      <div className="text-sm text-slate-500">{t("Showing")} <span className="font-medium text-slate-900">{startIndex + 1}</span> {t("to")} <span className="font-medium text-slate-900">{Math.min(endIndex, variances.length)}</span> {t("of")} <span className="font-medium text-slate-900">{variances.length}</span> {t("results")}</div>
                      <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500 whitespace-nowrap">{t("Rows:")}</span>
                          <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}><SelectTrigger className="h-8 w-[70px] bg-white border-slate-200"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="5">5</SelectItem><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="-1">{t("All")}</SelectItem></SelectContent></Select>
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

            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm gap-0 bg-white">
                <CardHeader className="border-b border-slate-100 py-4"><CardTitle className="text-base font-semibold text-slate-800">{t("Audit Information")}</CardTitle></CardHeader>
                
                {role === "accountant" && detailData.status === "Assigned" && (
                  <Card className="border-blue-200 shadow-sm bg-blue-50/30 gap-0 border-x-0 border-t-0 rounded-none">
                    <CardHeader className="border-b border-blue-100 pt-4 pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2 text-blue-800"><Lock className="w-5 h-5" /> {t("Start Audit")}</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm text-blue-700/80">{t("Lock the warehouse/bins to prevent inventory movements and allow staff to start counting.")}</p>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm" onClick={handleLockAudit} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />} {t("Lock & Start Audit")}</Button>
                    </CardContent>
                  </Card>
                )}

                {role === "manager" && (detailData.status === "InProgress" || detailData.status === "ReadyForReview") && hasRecountRequested && (
                  <Card className="border-orange-200 shadow-sm bg-orange-50/30 gap-0 border-x-0 border-t-0 rounded-none">
                    <CardHeader className="border-b border-orange-100 pt-4 pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2 text-orange-800"><AlertTriangle className="w-5 h-5" /> {t("Manage Recount Team")}</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm text-orange-700/80">{t("Items are pending recount. Re-summon staff who have finished.")}</p>
                      <Button variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-500 bg-white" onClick={fetchCandidates}>{t("Open Team List")}</Button>
                    </CardContent>
                  </Card>
                )}

                <CardContent className="p-6 space-y-5">
                  <div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Warehouse")}</label><div className="mt-1.5 flex items-center gap-2 text-slate-800 font-medium bg-slate-50 p-2.5 rounded-md border border-slate-100"><MapPin className="w-4 h-4 text-indigo-500" />{detailData.warehouseName || `ID: ${detailData.warehouseId}`}</div></div>
                  <div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Current Status")}</label><div className="mt-2 flex items-center gap-2">{getStatusBadge(detailData.status || "")}</div></div>
                  {detailData.notes && (<div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Notes")}</label><p className="text-sm text-slate-700 mt-1.5 bg-slate-50 p-3 rounded-md border border-slate-100 leading-relaxed">{detailData.notes}</p></div>)}
                </CardContent>
              </Card>

              {role === "manager" && detailData.status !== "Completed" && !isManagerSigned && (
                <Card className="border-indigo-200 shadow-sm bg-indigo-50/30 gap-0 overflow-hidden">
                  <CardHeader className="border-b border-indigo-100 pt-4 pb-3 bg-indigo-50"><CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-800"><FileSignature className="w-5 h-5" /> {t("Manager Sign Off")}</CardTitle></CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-sm text-indigo-700/80 mb-4">{t("Ensure all discrepancies are resolved. Sign to send the result to the Accountant.")}</p>
                    <Dialog open={isManagerSigning} onOpenChange={(open) => { setIsManagerSigning(open); if (!open && sigCanvas.current) { sigCanvas.current.clear(); setIsSigned(false); } }}>
                      <DialogTrigger asChild><Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm h-11" disabled={isSubmitting || !canManagerSignOff}><CheckCircle className="w-5 h-5 mr-2" /> {t("Sign & Send to Accountant")}</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader><DialogTitle className="flex items-center gap-2 text-indigo-700"><FileSignature className="w-5 h-5" /> {t("Manager Signature")}</DialogTitle><DialogDescription>{t("Sign here to confirm the discrepancy resolution for the Accountant.")}</DialogDescription></DialogHeader>
                        <div className="py-2">
                           <div className="flex justify-between items-end mb-2"><label className="text-sm font-semibold text-slate-700">{t("Manager Signature")} <span className="text-red-500">*</span></label>{isSigned && (<button onClick={clearSignature} className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"><Eraser className="w-3 h-3" /> {t("Clear")}</button>)}</div>
                           <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden relative group"><SignatureCanvas ref={sigCanvas} onEnd={handleSignatureEnd} penColor="black" canvasProps={{ className: "w-full h-32 cursor-crosshair bg-white" }}/>{!isSigned && (<div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40"><span className="text-slate-400 select-none italic text-sm">{t("Sign here to enable button...")}</span></div>)}</div>
                        </div>
                        <DialogFooter className="gap-2 mt-4"><Button variant="outline" onClick={() => setIsManagerSigning(false)}>{t("Cancel")}</Button><Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleManagerSubmit} disabled={isSubmitting || !isSigned}>{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Check className="w-4 h-4 mr-2"/>} {t("Confirm Signature")}</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {!canManagerSignOff && (<div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-md flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" /><div className="text-xs text-rose-600 leading-relaxed flex flex-col gap-1">{!isCountComplete && <p>• {t("Staff have not finished counting")}</p>}{hasRecountRequested && <p>• {t("Items are waiting for recount")}</p>}{isCountComplete && !hasRecountRequested && hasUnresolvedVariances && <p>• {t("You must resolve all discrepancies before signing off.")}</p>}</div></div>)}
                  </CardContent>
                </Card>
              )}

              {role === "accountant" && detailData.status !== "Completed" && isManagerSigned && (
                <Card className="border-emerald-200 shadow-sm bg-emerald-50/30 gap-0 overflow-hidden">
                  <CardHeader className="border-b border-emerald-100 pt-4 pb-3 bg-emerald-50"><CardTitle className="text-base font-semibold flex items-center gap-2 text-emerald-800"><Calculator className="w-5 h-5" /> {t("Accountant Finalization")}</CardTitle></CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-sm text-emerald-700/80 mb-6">{t("Manager has signed off. Please review the data and sign to update Actual Inventory.")}</p>
                    <Dialog open={isAccountantFinalizing} onOpenChange={(open) => { setIsAccountantFinalizing(open); if (!open && sigCanvas.current) { sigCanvas.current.clear(); setIsSigned(false); } }}>
                      <DialogTrigger asChild><Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm h-11" disabled={isSubmitting}><CheckCircle className="w-5 h-5 mr-2" /> {t("Confirm & Update Inventory")}</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader><DialogTitle className="flex items-center gap-2 text-emerald-700"><Calculator className="w-5 h-5" /> {t("Confirm Inventory Update")}</DialogTitle><DialogDescription>{t("You are about to update inventory based on audit results. This cannot be undone.")}</DialogDescription></DialogHeader>
                        <div className="py-2">
                           <div className="flex justify-between items-end mb-2"><label className="text-sm font-semibold text-slate-700">{t("Accountant Signature")} <span className="text-red-500">*</span></label>{isSigned && (<button onClick={clearSignature} className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"><Eraser className="w-3 h-3" /> {t("Clear")}</button>)}</div>
                           <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden relative group"><SignatureCanvas ref={sigCanvas} onEnd={handleSignatureEnd} penColor="black" canvasProps={{ className: "w-full h-32 cursor-crosshair bg-white" }}/>{!isSigned && (<div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40"><span className="text-slate-400 select-none italic text-sm">{t("Sign here to enable update...")}</span></div>)}</div>
                        </div>
                        <DialogFooter className="gap-2 mt-4"><Button variant="outline" onClick={() => setIsAccountantFinalizing(false)}>{t("Cancel")}</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAccountantFinalize} disabled={isSubmitting || !isSigned}>{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Check className="w-4 h-4 mr-2"/>} {t("Update Inventory")}</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              )}

            </div>
          </div>
        </div>

        <Dialog open={showCandidates} onOpenChange={setShowCandidates}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>{t("Summon staff for recount")}</DialogTitle></DialogHeader>
            <div className="py-4 space-y-3">
              {candidates.map(c => (
                <div key={c.userId} className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg">
                  <div><p className="font-bold text-slate-800">{c.fullName}</p><p className="text-xs text-slate-500">{t("Status:")} {c.isActive ? <span className="text-emerald-500 font-bold">{t("Working")}</span> : <span className="text-red-500">{t("Resting")}</span>}</p></div>
                  {!c.isActive && (<Button size="sm" onClick={() => handleRejoin(c.userId)} className="bg-indigo-600 hover:bg-indigo-700 text-white">{t("Re-summon")}</Button>)}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <Dialog open={resolveItem !== null} onOpenChange={(open) => !open && setResolveItem(null)}>
        <DialogContent aria-describedby="resolve-dialog-description" className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-indigo-700 flex items-center gap-2"><ClipboardList className="w-5 h-5" /> {t("Resolve Discrepancy")}</DialogTitle>
            <DialogDescription id="resolve-dialog-description">{t("Action required for")} <span className="font-bold text-slate-800">{resolveItem?.materialName}</span>.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-5">
             <div className="flex justify-between p-3 bg-slate-50 rounded-md border border-slate-200 text-sm">
                <span className="text-slate-600 font-medium">{t("System vs Counted Variance:")}</span>
                <span className={`font-bold text-base ${(resolveItem?.variance || 0) < 0 ? 'text-red-600' : 'text-blue-600'}`}>{(resolveItem?.variance || 0) > 0 ? "+" : ""}{resolveItem?.variance}</span>
             </div>
            <div className="space-y-2">
               <label className="text-sm font-semibold text-slate-700">{t("Select Resolution Action")} <span className="text-red-500">*</span></label>
               <Select value={resolveAction} onValueChange={setResolveAction}>
                 <SelectTrigger className="h-10"><SelectValue placeholder={t("Choose action...")} /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="AdjustSystem">{t("Adjust System (Update Inventory)")}</SelectItem>
                   <SelectItem value="Investigate">{t("Investigate (Keep pending)")}</SelectItem>
                   <SelectItem value="Accept">{t("Accept (Ignore variance)")}</SelectItem>
                 </SelectContent>
               </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("Cancel")}</Button></DialogClose>
            <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleConfirmResolve} disabled={isSubmitting || !resolveAction}>{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} {t("Confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}