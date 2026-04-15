"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { ArrowLeft, Lock, AlertTriangle, CheckCircle, FileSignature, Download, Loader2, Search, ClipboardList, MapPin, LayoutGrid, Unlock, AlertCircle, Users, CheckCircle2, ChevronLeft, ChevronRight, Check, RefreshCcw, Eraser, Package, ClipboardCheck, Calculator, ShieldAlert, Gavel, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

  // Dialogs
  const [isAccountantApproving, setIsAccountantApproving] = useState(false);
  const [isAccountantApprovingResolve, setIsAccountantApprovingResolve] = useState(false);
  const [isAccountantRejecting, setIsAccountantRejecting] = useState(false);
  const [isAdminFinalizing, setIsAdminFinalizing] = useState(false);
  const [isManagerConfirming, setIsManagerConfirming] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  // Admin penalty form
  const [penaltyReason, setPenaltyReason] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState("");
  const [penaltyNotes, setPenaltyNotes] = useState("");
  const [targetManagerId, setTargetManagerId] = useState("");

  const sigCanvas = useRef<ReactSignatureCanvas>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [resolveItem, setResolveItem] = useState<VarianceItemDto | null>(null);
  const [resolveAction, setResolveAction] = useState("");
  const [resolveNotes, setResolveNotes] = useState("");
  const [candidates, setCandidates] = useState<RecountCandidateDto[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [managerInfo, setManagerInfo] = useState<{ id: number; name: string } | null>(null);
  const [prevIsAdminFinalizing, setPrevIsAdminFinalizing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  const canExport = ["accountant", "admin", "manager"].includes(role);
  const status = detailData?.status?.toLowerCase() || "";

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

  useEffect(() => { 
    if (role === "staff") {
      router.push("/staff/audit");
      return;
    }
    fetchData(); 
  }, [stockTakeId, role]);

  useEffect(() => {
    if (isAdminFinalizing && !prevIsAdminFinalizing && detailData) {
      // 1. Find Manager from signatures
      const managerSig = detailData.signatures?.find(s => s.role === "Manager");
      if (managerSig) {
        setManagerInfo({ id: managerSig.userId, name: managerSig.fullName || `User #${managerSig.userId}` });
        setTargetManagerId(managerSig.userId.toString());
      }

      // 2. Calculate Penalty Amount
      const total = variances.reduce((acc, v) => {
        const missing = (v.systemQty || 0) - (v.countQty || 0);
        if (missing > 0) {
          return acc + (missing * (v.unitPrice || 0));
        }
        return acc;
      }, 0);
      setPenaltyAmount(total.toString());
    } else if (!isAdminFinalizing && prevIsAdminFinalizing) {
       handleClearSignature();
       // Clear values when closing if you want, or leave them. 
       // User usually wants them cleared on close to re-init next time.
       setPenaltyReason("");
       setPenaltyAmount("0");
       setTargetManagerId("");
       setManagerInfo(null);
    }
    setPrevIsAdminFinalizing(isAdminFinalizing);
  }, [isAdminFinalizing, prevIsAdminFinalizing, detailData, variances, t]);

  useEffect(() => { setCurrentPage(1); }, [itemsPerPage]);

  // === MANAGER ACTIONS ===
  const canResolve = role === "manager" && status === "pendingmanagerreview";

  const handleClearSignature = () => {
    sigCanvas.current?.clear();
    setIsSigned(false);
  };

  const onSignatureEnd = () => {
    if (sigCanvas.current) {
      setIsSigned(!sigCanvas.current.isEmpty());
    }
  };

  const handleConfirmResolve = async () => {
    if (!resolveItem) return;
    if (!resolveNotes.trim()) return toast.error(t("Please enter a resolution note"));

    try {
      setIsSubmitting(true);
      await auditService.resolveVariance(stockTakeId, resolveItem.id, "Accept", 1, undefined, resolveNotes.trim()); 
      toast.success(t("Variance resolved successfully!"));
      await fetchData(); 
      setResolveItem(null);
      setResolveNotes("");
    } catch (error: any) { toast.error(error.response?.data?.message || "Error"); } finally { setIsSubmitting(false); }
  };

  const handleManagerConfirm = async () => {
    if (!isSigned) return toast.error(t("Please sign before confirming"));
    const sigData = sigCanvas.current?.toDataURL();
    try {
      setIsSubmitting(true);
      await auditService.managerConfirmResolution(stockTakeId, sigData);
      toast.success(t("All resolutions confirmed! Awaiting accountant approval."));
      await fetchData();
    } catch (error: any) { toast.error(error.response?.data?.message || "Error"); } finally { setIsSubmitting(false); setIsManagerConfirming(false); handleClearSignature(); }
  };

  const handleRecountAll = async () => {
    try {
        setIsSubmitting(true);
        await auditService.requestRecountAll(stockTakeId, 0, "Manager recount all request");
        toast.success(t("Recount request sent for all pending items!"));
        await fetchData();
    } catch (error: any) { toast.error(error.response?.data?.message || "Error"); } finally { setIsSubmitting(false); }
  };

  // === ACCOUNTANT ACTIONS ===
  const handleAccountantApprove = async () => {
    if (!isSigned) return toast.error(t("Please sign before completing"));
    const sigData = sigCanvas.current?.toDataURL();
    try {
      setIsSubmitting(true);
      await auditService.accountantReview(stockTakeId, "Approve", sigData);
      toast.success(t("Audit completed! All items matched."));
      router.push(`/${role}/audit`);
    } catch (error: any) { toast.error(error.response?.data?.message || "Error"); } finally { setIsSubmitting(false); setIsAccountantApproving(false); handleClearSignature(); }
  };

  const handleAccountantForward = async () => {
    try {
      setIsSubmitting(true);
      await auditService.accountantReview(stockTakeId, "ForwardToManager");
      toast.success(t("Forwarded to Manager for review!"));
      await fetchData();
    } catch (error: any) { toast.error(error.response?.data?.message || "Error"); } finally { setIsSubmitting(false); }
  };

  const handleAccountantApproveResolve = async () => {
    if (!isSigned) return toast.error(t("Please sign before approving"));
    const sigData = sigCanvas.current?.toDataURL();
    try {
      setIsSubmitting(true);
      await auditService.accountantApproveResolve(stockTakeId, sigData);
      toast.success(t("Resolution approved! Inventory updated."));
      router.push(`/${role}/audit`);
    } catch (error: any) { toast.error(error.response?.data?.message || "Error"); } finally { setIsSubmitting(false); setIsAccountantApprovingResolve(false); handleClearSignature(); }
  };

  const handleAccountantRejectResolve = async () => {
    if (!isSigned) return toast.error(t("Please sign before rejecting"));
    const sigData = sigCanvas.current?.toDataURL();
    try {
      setIsSubmitting(true);
      await auditService.accountantRejectResolve(stockTakeId, rejectNotes, sigData);
      toast.success(t("Resolution rejected. Escalated to Admin."));
      await fetchData();
    } catch (error: any) { toast.error(error.response?.data?.message || "Error"); } finally { setIsSubmitting(false); setIsAccountantRejecting(false); setRejectNotes(""); handleClearSignature(); }
  };

  // === ADMIN ACTIONS ===
  const handleAdminFinalize = async () => {
    if (!penaltyReason || !penaltyAmount || !targetManagerId) return toast.error(t("Please fill all penalty fields"));
    if (!isSigned) return toast.error(t("Please sign before completing"));
    
    const sigData = sigCanvas.current?.toDataURL();

    try {
      setIsSubmitting(true);
      await auditService.adminFinalize(stockTakeId, {
        penaltyReason,
        penaltyAmount: Number(penaltyAmount),
        penaltyNotes: penaltyNotes || undefined,
        targetManagerUserId: Number(targetManagerId),
        auditNotes: "Admin finalized with penalty",
        signatureData: sigData
      });
      toast.success(t("Penalty issued and audit completed!"));
      router.push(`/${role}/audit`);
    } catch (error: any) { toast.error(error.response?.data?.message || "Error"); } finally { setIsSubmitting(false); setIsAdminFinalizing(false); handleClearSignature(); }
  };

  // === OTHER ACTIONS ===
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

  const getStatusBadge = (s: string) => {
    const sl = s?.toLowerCase() || "";
    if (sl === "locked" || sl === "inprogress") return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 gap-1 border-none"><Lock className="w-3 h-3" /> {t("In Progress")}</Badge>;
    if (sl === "completed") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 gap-1 border-none"><CheckCircle2 className="w-3 h-3" /> {t("Completed")}</Badge>;
    if (sl === "pendingaccountantreview") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 gap-1 border-none"><Calculator className="w-3 h-3" /> {t("Pending Accountant Review")}</Badge>;
    if (sl === "pendingmanagerreview") return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 gap-1 border-none"><AlertCircle className="w-3 h-3" /> {t("Pending Manager Review")}</Badge>;
    if (sl === "pendingaccountantapproval") return <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-200 gap-1 border-none"><FileSignature className="w-3 h-3" /> {t("Pending Accountant Approval")}</Badge>;
    if (sl === "pendingadminreview") return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 gap-1 border-none"><ShieldAlert className="w-3 h-3" /> {t("Pending Admin Review")}</Badge>;
    if (sl === "readyforreview") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 gap-1 border-none"><AlertCircle className="w-3 h-3" /> {t("Ready For Review")}</Badge>;
    if (sl === "assigned") return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 gap-1 border-none"><Users className="w-3 h-3" /> {t("Assigned")}</Badge>;
    return <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none gap-1"><Unlock className="w-3 h-3" /> {t("Planned")}</Badge>;
  };

  const hasRecountRequested = variances.some(v => v.discrepancyStatus === "RecountRequested");
  const hasUnresolvedVariances = variances.some(v => !v.resolutionAction);
  const hasRecountEligibleItems = variances.some(v => !v.resolutionAction && v.discrepancyStatus !== "RecountRequested" && (v.countRound ?? 1) <= 1 && v.discrepancyStatus === "Discrepancy");
  const allVariancesResolved = variances.length > 0 && variances.every(v => v.resolutionAction);
  const metrics = detailData?.metrics;
  const isCountComplete = (metrics?.totalItems ?? 0) > 0 && (metrics?.countedItems === metrics?.totalItems);
  const hasDiscrepancies = (metrics?.discrepancyItems ?? 0) > 0;

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

              <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col gap-0 pb-0 bg-white">
                <CardHeader className="border-b border-slate-100 py-4 flex flex-row justify-between items-center">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800"><ClipboardList className="w-4 h-4 text-indigo-600" /> {t("Discrepancies Details")}</CardTitle>
                  <div className="flex gap-2">
                    {canResolve && hasRecountEligibleItems && (
                      <Button size="sm" className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white shadow-sm" onClick={handleRecountAll} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />} {t("Request Recount All")}</Button>
                    )}
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
                          <TableHead className="pl-6 w-[28%] font-bold text-slate-800 uppercase text-[11px] tracking-wider">{t("Material")}</TableHead>
                          <TableHead className="text-right w-[12%] font-bold text-slate-800 uppercase text-[11px] tracking-wider">{t("Sys Qty")}</TableHead>
                          <TableHead className="text-right w-[12%] font-bold text-slate-800 uppercase text-[11px] tracking-wider">{t("Count Qty")}</TableHead>
                          <TableHead className="text-right w-[12%] font-bold text-slate-800 uppercase text-[11px] tracking-wider">{t("Variance")}</TableHead>
                          <TableHead className="text-center w-[10%] font-bold text-slate-800 uppercase text-[11px] tracking-wider">{t("Round")}</TableHead>
                          <TableHead className="text-center w-[14%] font-bold text-slate-800 uppercase text-[11px] tracking-wider">{t("Status")}</TableHead>
                          <TableHead className="text-right pr-6 w-[12%] font-bold text-slate-800 uppercase text-[11px] tracking-wider">{t("Action")}</TableHead>
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
                                {canResolve && !row.resolutionAction && row.discrepancyStatus !== "RecountRequested" && countRound > 1 && (
                                  <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200" onClick={() => { setResolveItem(row); setResolveAction(""); }}>{t("Resolve")}</Button>
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
                
                {/* ACCOUNTANT/ADMIN: Lock & Start (Assigned status) */}
                {(role === "accountant" || role === "admin") && detailData.status === "Assigned" && (
                  <Card className="border-blue-200 shadow-sm bg-blue-50/30 gap-0 border-x-0 border-t-0 rounded-none">
                    <CardHeader className="border-b border-blue-100 pt-4 pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2 text-blue-800"><Lock className="w-5 h-5" /> {t("Start Audit")}</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm text-blue-700/80">{t("Lock the warehouse/bins to prevent inventory movements and allow staff to start counting.")}</p>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm" onClick={handleLockAudit} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />} {t("Lock & Start Audit")}</Button>
                    </CardContent>
                  </Card>
                )}

                {/* ACCOUNTANT/ADMIN: Review after staff finished (PendingAccountantReview) */}
                {(role === "accountant" || role === "admin") && status === "pendingaccountantreview" && (
                  <Card className="border-amber-200 shadow-sm bg-amber-50/30 gap-0 border-x-0 border-t-0 rounded-none">
                    <CardHeader className="border-b border-amber-100 pt-4 pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-800"><Calculator className="w-5 h-5" /> {t("Accountant Review")}</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm text-amber-700/80">{t("Staff counting is complete. Please review the results and decide.")}</p>
                      {!hasDiscrepancies ? (
                        <Dialog open={isAccountantApproving} onOpenChange={setIsAccountantApproving}>
                          <DialogTrigger asChild><Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm h-11" disabled={isSubmitting}><CheckCircle className="w-5 h-5 mr-2" /> {t("All Matched — Sign & Complete")}</Button></DialogTrigger>
                          <DialogContent className="sm:max-w-[400px]">
                            <DialogHeader><DialogTitle className="text-emerald-700">{t("Confirm Completion")}</DialogTitle><DialogDescription>{t("All items matched. Sign to complete this audit.")}</DialogDescription></DialogHeader>
                            <div className="space-y-3 py-4">
                              <label className="text-xs font-semibold text-slate-500 uppercase">{t("Accountant Signature")}</label>
                              <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-inner">
                                <ReactSignatureCanvas ref={sigCanvas} penColor="navy" canvasProps={{ className: "w-full h-40" }} onEnd={onSignatureEnd} />
                              </div>
                              <Button variant="ghost" size="sm" onClick={handleClearSignature} className="text-slate-500 text-xs flex items-center gap-1 hover:bg-transparent hover:text-indigo-600"><Eraser className="w-3 h-3" /> {t("Clear")}</Button>
                            </div>
                            <DialogFooter className="gap-2 mt-4"><Button variant="outline" onClick={() => { setIsAccountantApproving(false); handleClearSignature(); }}>{t("Cancel")}</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAccountantApprove} disabled={isSubmitting || !isSigned}>{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Check className="w-4 h-4 mr-2"/>} {t("Sign & Complete")}</Button></DialogFooter>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-rose-600">{t("There are")} <strong>{metrics?.discrepancyItems}</strong> {t("discrepancy items. Forward to Manager for investigation.")}</p>
                          </div>
                          <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-sm h-11" onClick={handleAccountantForward} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} {t("Forward to Manager")}</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* MANAGER: Review discrepancies (PendingManagerReview) */}
                {role === "manager" && status === "pendingmanagerreview" && hasRecountRequested && (
                  <Card className="border-orange-200 shadow-sm bg-orange-50/30 gap-0 border-x-0 border-t-0 rounded-none">
                    <CardHeader className="border-b border-orange-100 pt-4 pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2 text-orange-800"><AlertTriangle className="w-5 h-5" /> {t("Manage Recount Team")}</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm text-orange-700/80">{t("Items are pending recount. Re-summon staff who have finished.")}</p>
                      <Button variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-500 bg-white" onClick={fetchCandidates}>{t("Open Team List")}</Button>
                    </CardContent>
                  </Card>
                )}

                {/* MANAGER: Confirm & Sign after all resolved */}
                {role === "manager" && status === "pendingmanagerreview" && allVariancesResolved && (
                  <Card className="border-emerald-200 shadow-sm bg-emerald-50/30 gap-0 border-x-0 border-t-0 rounded-none">
                    <CardHeader className="border-b border-emerald-100 pt-4 pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2 text-emerald-800"><CheckCircle className="w-5 h-5" /> {t("All Discrepancies Resolved")}</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm text-emerald-700/80">{t("All discrepancy items have been resolved. Confirm and sign to submit for accountant approval.")}</p>
                      <Dialog open={isManagerConfirming} onOpenChange={(open) => { setIsManagerConfirming(open); if (!open) handleClearSignature(); }}>
                        <DialogTrigger asChild><Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm h-11" disabled={isSubmitting}><FileSignature className="w-5 h-5 mr-2" /> {t("Confirm & Sign")}</Button></DialogTrigger>
                        <DialogContent className="sm:max-w-[400px]">
                          <DialogHeader><DialogTitle className="text-emerald-700">{t("Confirm All Resolutions")}</DialogTitle><DialogDescription>{t("Sign below to confirm all resolutions and submit for accountant approval.")}</DialogDescription></DialogHeader>
                          <div className="space-y-3 py-4">
                            <label className="text-xs font-semibold text-slate-500 uppercase">{t("Manager Digital Signature")} <span className="text-red-500">*</span></label>
                            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-inner">
                              <ReactSignatureCanvas ref={sigCanvas} penColor="maroon" canvasProps={{ className: "w-full h-40" }} onEnd={onSignatureEnd} />
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleClearSignature} className="text-slate-500 text-xs flex items-center gap-1 hover:bg-transparent hover:text-indigo-600"><Eraser className="w-3 h-3" /> {t("Clear")}</Button>
                          </div>
                          <DialogFooter className="gap-2 mt-4"><Button variant="outline" onClick={() => { setIsManagerConfirming(false); handleClearSignature(); }}>{t("Cancel")}</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleManagerConfirm} disabled={isSubmitting || !isSigned}>{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Check className="w-4 h-4 mr-2"/>} {t("Sign & Submit")}</Button></DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                )}

                {/* ACCOUNTANT/ADMIN: Approve/Reject Manager's resolution (PendingAccountantApproval) */}
                {(role === "accountant" || role === "admin") && status === "pendingaccountantapproval" && (
                  <Card className="border-violet-200 shadow-sm bg-violet-50/30 gap-0 border-x-0 border-t-0 rounded-none">
                    <CardHeader className="border-b border-violet-100 pt-4 pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2 text-violet-800"><FileSignature className="w-5 h-5" /> {t("Review Manager's Resolution")}</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm text-violet-700/80">{t("Manager has resolved all discrepancies. Please review and decide.")}</p>
                      <div className="flex gap-3">
                        <Dialog open={isAccountantApprovingResolve} onOpenChange={setIsAccountantApprovingResolve}>
                          <DialogTrigger asChild><Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm" disabled={isSubmitting}><Check className="w-4 h-4 mr-2" /> {t("Approve")}</Button></DialogTrigger>
                          <DialogContent className="sm:max-w-[400px]">
                            <DialogHeader><DialogTitle className="text-emerald-700">{t("Approve Resolution")}</DialogTitle><DialogDescription>{t("Approve to update inventory and complete audit.")}</DialogDescription></DialogHeader>
                            <div className="space-y-3 py-4">
                                <label className="text-xs font-semibold text-slate-500 uppercase">{t("Accountant Signature")}</label>
                                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-inner">
                                  <ReactSignatureCanvas ref={sigCanvas} penColor="navy" canvasProps={{ className: "w-full h-40" }} onEnd={onSignatureEnd} />
                                </div>
                                <Button variant="ghost" size="sm" onClick={handleClearSignature} className="text-slate-500 text-xs flex items-center gap-1 hover:bg-transparent hover:text-indigo-600"><Eraser className="w-3 h-3" /> {t("Clear")}</Button>
                            </div>
                            <DialogFooter className="gap-2 mt-4"><Button variant="outline" onClick={() => { setIsAccountantApprovingResolve(false); handleClearSignature(); }}>{t("Cancel")}</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAccountantApproveResolve} disabled={isSubmitting || !isSigned}>{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Check className="w-4 h-4 mr-2"/>} {t("Approve & Complete")}</Button></DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={isAccountantRejecting} onOpenChange={(open) => { setIsAccountantRejecting(open); if (!open) handleClearSignature(); }}>
                          <DialogTrigger asChild><Button variant="outline" className="flex-1 border-red-200 text-red-700 hover:bg-red-50" disabled={isSubmitting}><AlertTriangle className="w-4 h-4 mr-2" /> {t("Reject")}</Button></DialogTrigger>
                          <DialogContent className="sm:max-w-[450px]">
                            <DialogHeader><DialogTitle className="text-red-700">{t("Reject Resolution")}</DialogTitle><DialogDescription>{t("Reject to escalate this audit to Admin for final review.")}</DialogDescription></DialogHeader>
                            <div className="py-4 space-y-4">
                              <Textarea placeholder={t("Reason for rejection (optional)...")} value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} className="min-h-[100px]" />
                              <div className="space-y-3">
                                <label className="text-xs font-semibold text-slate-500 uppercase">{t("Accountant Signature")} <span className="text-red-500">*</span></label>
                                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-inner">
                                  <ReactSignatureCanvas ref={sigCanvas} penColor="navy" canvasProps={{ className: "w-full h-40" }} onEnd={onSignatureEnd} />
                                </div>
                                <Button variant="ghost" size="sm" onClick={handleClearSignature} className="text-slate-500 text-xs flex items-center gap-1 hover:bg-transparent hover:text-indigo-600"><Eraser className="w-3 h-3" /> {t("Clear")}</Button>
                              </div>
                            </div>
                            <DialogFooter className="gap-2"><Button variant="outline" onClick={() => { setIsAccountantRejecting(false); handleClearSignature(); }}>{t("Cancel")}</Button><Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleAccountantRejectResolve} disabled={isSubmitting || !isSigned}>{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <ShieldAlert className="w-4 h-4 mr-2"/>} {t("Reject & Escalate")}</Button></DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ADMIN: Issue Penalty & Finalize (PendingAdminReview) */}
                {role === "admin" && status === "pendingadminreview" && (
                  <Card className="border-red-200 shadow-sm bg-red-50/30 gap-0 border-x-0 border-t-0 rounded-none">
                    <CardHeader className="border-b border-red-100 pt-4 pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2 text-red-800"><Gavel className="w-5 h-5" /> {t("Admin Final Review")}</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm text-red-700/80">{t("Accountant rejected Manager's resolution. Issue a penalty and finalize.")}</p>
                      <Dialog open={isAdminFinalizing} onOpenChange={setIsAdminFinalizing}>
                        <DialogTrigger asChild><Button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm h-11" disabled={isSubmitting}><Gavel className="w-5 h-5 mr-2" /> {t("Issue Penalty & Complete")}</Button></DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader><DialogTitle className="text-red-700 flex items-center gap-2"><Gavel className="w-5 h-5" /> {t("Issue Penalty")}</DialogTitle><DialogDescription>{t("Fill in penalty details for the responsible Manager.")}</DialogDescription></DialogHeader>
                          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto px-1">
                            <div>
                                <label className="text-sm font-semibold text-slate-700">{t("Responsible Manager")}</label>
                                <Input value={managerInfo?.name || t("Not identified")} disabled className="mt-1 bg-slate-100 border-slate-200 cursor-not-allowed opacity-80" />
                                <input type="hidden" value={targetManagerId} />
                            </div>
                            <div><label className="text-sm font-semibold text-slate-700">{t("Penalty Reason")} <span className="text-red-500">*</span></label><Input placeholder={t("Reason for penalty...")} value={penaltyReason} onChange={(e) => setPenaltyReason(e.target.value)} className="mt-1" /></div>
                            <div><label className="text-sm font-semibold text-slate-700">{t("Auto-Calculated Penalty Amount (VNĐ)")} <span className="text-red-500">*</span></label><Input type="number" placeholder="0" value={penaltyAmount} disabled className="mt-1 bg-slate-100 border-slate-200 font-bold text-red-600 cursor-not-allowed opacity-80" /></div>
                            <div><label className="text-sm font-semibold text-slate-700">{t("Notes")}</label><Textarea placeholder={t("Additional notes...")} value={penaltyNotes} onChange={(e) => setPenaltyNotes(e.target.value)} className="mt-1 min-h-[80px]" /></div>
                            
                            <div className="space-y-3 pt-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Admin Digital Signature")} <span className="text-red-500">*</span></label>
                                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-inner">
                                  <ReactSignatureCanvas ref={sigCanvas} penColor="black" canvasProps={{ className: "w-full h-32" }} onEnd={onSignatureEnd} />
                                </div>
                                <Button variant="ghost" size="sm" onClick={handleClearSignature} className="text-slate-500 text-xs flex items-center gap-1 hover:bg-transparent hover:text-indigo-600"><Eraser className="w-3 h-3" /> {t("Clear")}</Button>
                            </div>
                          </div>
                          <DialogFooter className="gap-2 pt-4"><Button variant="outline" onClick={() => setIsAdminFinalizing(false)}>{t("Cancel")}</Button><Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleAdminFinalize} disabled={isSubmitting || !penaltyReason || !penaltyAmount || !targetManagerId || !isSigned}>{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Gavel className="w-4 h-4 mr-2"/>} {t("Sign & Complete")}</Button></DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                )}

                <CardContent className="p-6 space-y-5">
                  <div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Warehouse")}</label><div className="mt-1.5 flex items-center gap-2 text-slate-800 font-medium bg-slate-50 p-2.5 rounded-md border border-slate-100"><MapPin className="w-4 h-4 text-indigo-500" />{detailData.warehouseName || `ID: ${detailData.warehouseId}`}</div></div>
                  <div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Current Status")}</label><div className="mt-2 flex items-center gap-2">{getStatusBadge(detailData.status || "")}</div></div>
                  {detailData.notes && (<div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Notes")}</label><p className="text-sm text-slate-700 mt-1.5 bg-slate-50 p-3 rounded-md border border-slate-100 leading-relaxed">{detailData.notes}</p></div>)}
                </CardContent>
              </Card>

              {/* PENALTY CARD */}
              {detailData.penalty && (
                <Card className="border-red-200 shadow-sm bg-red-50/30">
                  <CardHeader className="border-b border-red-100 py-4"><CardTitle className="text-base font-semibold flex items-center gap-2 text-red-800"><Gavel className="w-4 h-4" /> {t("Penalty Record")}</CardTitle></CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Penalty Reason")}</label>
                      <p className="text-sm text-red-700 mt-1.5 bg-red-50 p-2.5 rounded-md border border-red-200 font-medium break-words">{detailData.penalty.reason}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Penalty Amount")}</label>
                      <div className="mt-1.5 bg-red-50 p-2.5 rounded-md border border-red-200">
                        <span className="text-lg font-bold text-red-700">{Number(detailData.penalty.amount).toLocaleString("vi-VN")} VNĐ</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Penalized Manager")}</label>
                      <div className="mt-1.5 flex items-center gap-2 text-slate-800 font-medium bg-slate-50 p-2.5 rounded-md border border-slate-100">
                        <Users className="w-4 h-4 text-red-500" />{detailData.penalty.targetUserName || `ID: ${detailData.penalty.targetUserId}`}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Issued By")}</label>
                      <div className="mt-1.5 flex items-center gap-2 text-slate-800 font-medium bg-slate-50 p-2.5 rounded-md border border-slate-100">
                        <ShieldAlert className="w-4 h-4 text-indigo-500" />{detailData.penalty.issuedByName || `ID: ${detailData.penalty.issuedByUserId}`}
                      </div>
                    </div>
                    {detailData.penalty.notes && (
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Notes")}</label>
                        <p className="text-sm text-slate-700 mt-1.5 bg-slate-50 p-3 rounded-md border border-slate-100 leading-relaxed break-words">{detailData.penalty.notes}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Issued Date")}</label>
                      <p className="text-sm text-slate-700 mt-1.5 font-medium">{new Date(detailData.penalty.createdAt).toLocaleString("vi-VN")}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* RECOUNT CANDIDATES DIALOG */}
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

      {/* RESOLVE DIALOG */}
      <Dialog open={resolveItem !== null} onOpenChange={(open) => { if (!open) { setResolveItem(null); setResolveNotes(""); } }}>
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
               <label className="text-sm font-semibold text-slate-700">{t("Resolution Note")} <span className="text-red-500">*</span></label>
               <Textarea placeholder={t("Enter your resolution note...")} value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} maxLength={500} className="min-h-[80px] max-h-[160px] resize-none break-words overflow-wrap-anywhere" />
               <p className="text-xs text-slate-400 text-right">{resolveNotes.length}/500</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("Cancel")}</Button></DialogClose>
            <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleConfirmResolve} disabled={isSubmitting || !resolveNotes.trim()}>{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} {t("Confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}