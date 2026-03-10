"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft, Lock, AlertTriangle, CheckCircle, FileSignature, 
  Download, Loader2, Search, ClipboardList, MapPin, LayoutGrid, Unlock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditService, StockTakeReviewDetailDto, VarianceItemDto } from "@/services/audit-service";
import { toast } from "sonner";

type UserRole = "admin" | "manager" | "accountant" | "staff";

interface AuditDetailProps {
  role: UserRole;
}

export default function SharedAuditDetail({ role }: AuditDetailProps) {
  const router = useRouter();
  const params = useParams();
  const stockTakeId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState<StockTakeReviewDetailDto | null>(null);
  const [variances, setVariances] = useState<VarianceItemDto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false); // Thêm state này để quản lý thao tác chốt sổ

  const [resolveItem, setResolveItem] = useState<VarianceItemDto | null>(null);
  const [resolveAction, setResolveAction] = useState("");

  // FIX LỖI: Thêm lại biến canExport
  const canExport = ["accountant", "admin", "manager"].includes(role);
  const canResolve = ["manager"].includes(role);
  const canFinalize = ["manager"].includes(role);

  const fetchData = async () => {
    if (!stockTakeId) return;
    try {
      setLoading(true);
      const [reviewInfo, varianceList] = await Promise.all([
        auditService.getReviewDetail(stockTakeId),
        auditService.getVariances(stockTakeId)
      ]);
      setDetailData(reviewInfo);
      setVariances(varianceList);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [stockTakeId]);

  const handleConfirmResolve = async () => {
    if (!resolveItem || !resolveAction) {
      toast.error("Vui lòng chọn hướng xử lý!");
      return;
    }

    try {
      setIsSubmitting(true);
      // Gọi API Resolve Variance
      await auditService.resolveVariance(stockTakeId, resolveItem.id, resolveAction, 1); 
      toast.success("Xử lý chênh lệch thành công!");
      await fetchData(); // Tải lại dữ liệu mới nhất
      setResolveItem(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi xử lý.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeAction = async () => {
    try {
      setIsSubmitting(true);
      await auditService.finalizeAudit(stockTakeId, "Đã kiểm tra và khớp sổ");
      toast.success("Đã chốt sổ kiểm kê thành công!");
      router.push(`/${role}/audit`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi chốt sổ.");
    } finally {
      setIsSubmitting(false);
      setIsFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Loading audit details...</p>
        </div>
      </div>
    );
  }

  if (!detailData) return <div className="p-10 text-center">Audit not found</div>;

  const metrics = detailData.metrics;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`Review Audit #${stockTakeId}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          {/* Top Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="pl-0 hover:bg-transparent hover:text-indigo-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </Button>
            <div className="text-sm text-slate-500">
              Created on:{" "}
              <span className="font-medium text-slate-700">
                {detailData.timeline?.createdAt ? new Date(detailData.timeline.createdAt).toLocaleDateString("vi-VN") : "N/A"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN: Data (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="shadow-sm border-slate-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Total Items</p>
                    <p className="text-2xl font-bold text-slate-800">{metrics?.totalItems || 0}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Counted</p>
                    <p className="text-2xl font-bold text-indigo-600">{metrics?.countedItems || 0}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-emerald-200 bg-emerald-50/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-emerald-700 font-semibold uppercase mb-1">Matched</p>
                    <p className="text-2xl font-bold text-emerald-700">{metrics?.matchedItems || 0}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-red-200 bg-red-50/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-red-700 font-semibold uppercase mb-1">Discrepancies</p>
                    <p className="text-2xl font-bold text-red-700">{metrics?.discrepancyItems || 0}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Variances Table */}
              <Card className="border-slate-200 shadow-sm overflow-hidden gap-0">
                <CardHeader className="bg-white border-b border-slate-100 py-4 flex flex-row justify-between items-center">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pb-5">
                    <ClipboardList className="w-4 h-4 text-indigo-600" /> Discrepancies Details
                  </CardTitle>
                  <div className="flex gap-2">
                    {canExport && (
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="pl-6 w-[35%]">Material</TableHead>
                        <TableHead className="text-right">Sys Qty</TableHead>
                        <TableHead className="text-right">Count Qty</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variances.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <CheckCircle className="w-8 h-8 text-emerald-400" />
                              <p>All items matched perfectly. No discrepancies found.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        variances.map((row) => (
                          <TableRow key={row.id} className="hover:bg-slate-50/50">
                            <TableCell className="pl-6">
                              <div className="font-medium text-slate-700">{row.materialName}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <LayoutGrid className="w-3 h-3" /> Bin: {row.binCode}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-slate-500">{row.systemQty}</TableCell>
                            <TableCell className="text-right font-bold text-slate-900">{row.countQty}</TableCell>
                            <TableCell className={`text-right font-bold ${row.variance < 0 ? "text-red-600" : "text-blue-600"}`}>
                              {row.variance > 0 ? "+" : ""}{row.variance}
                            </TableCell>
                            <TableCell className="text-center">
                              {row.resolutionAction ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">
                                  Resolved
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-normal flex items-center gap-1 w-fit mx-auto">
                                  <AlertTriangle className="w-3 h-3" /> Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              {canResolve && !row.resolutionAction && (
                                <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => { setResolveItem(row); setResolveAction(""); }}>
                                  Resolve
                                </Button>
                              )}
                              {row.resolutionAction && (
                                <span className="text-xs text-slate-400 italic">{row.resolutionAction}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: Status & Actions (1/3) */}
            <div className="space-y-6">
              {/* Audit Info Card */}
              <Card className="border-slate-200 shadow-sm gap-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold text-slate-800">
                    Audit Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Warehouse</label>
                    <div className="mt-1 flex items-center gap-2 text-slate-800 font-medium">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      {detailData.warehouseName || `ID: ${detailData.warehouseId}`}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Status</label>
                    <div className="mt-1.5 flex items-center gap-2">
                       {detailData.status === "InProgress" || detailData.status === "Locked" ? (
                          <Badge className="bg-blue-100 text-blue-700 border-none"><Lock className="w-3 h-3 mr-1"/> {detailData.status}</Badge>
                       ) : detailData.status === "Completed" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-none"><CheckCircle className="w-3 h-3 mr-1"/> {detailData.status}</Badge>
                       ) : (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none"><Unlock className="w-3 h-3 mr-1"/> {detailData.status}</Badge>
                       )}
                    </div>
                  </div>
                  {detailData.notes && (
                    <div>
                       <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</label>
                       <p className="text-sm text-slate-700 mt-1 bg-slate-50 p-2 rounded-md border border-slate-100">{detailData.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Card */}
              {canFinalize && detailData.status !== "Completed" && (
                <Card className="border-indigo-200 shadow-sm bg-indigo-50/30 gap-0">
                  <CardHeader className="border-b border-indigo-100 pt-4 pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-800">
                      <FileSignature className="w-5 h-5" /> Manager Decision
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-sm text-indigo-700/80 mb-6">
                      Ensure all discrepancies are resolved. This action will adjust inventory levels and lock this audit permanently.
                    </p>
                    <Button 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
                      size="lg"
                      onClick={() => setIsFinalizing(true)}
                      disabled={isSubmitting || isFinalizing || variances.some(v => !v.resolutionAction)}
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      Complete & Unlock System
                    </Button>
                    
                    {variances.some(v => !v.resolutionAction) && (
                       <p className="text-xs text-rose-500 mt-3 flex items-start gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          You must resolve all discrepancies before completing the audit.
                       </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Phụ: Confirm Box khi ấn Complete */}
              {isFinalizing && (
                 <Card className="border-green-200 bg-green-50 mt-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                     <CardContent className="p-5 flex flex-col gap-4">
                        <div>
                          <h4 className="font-bold text-green-900">Ready to Finalize?</h4>
                          <p className="text-sm text-green-700 mt-1">This will automatically apply all resolved inventory adjustments to the system ledger.</p>
                        </div>
                        <div className="flex gap-2">
                           <Button variant="outline" className="flex-1" onClick={() => setIsFinalizing(false)}>Cancel</Button>
                           <Button className="bg-green-600 hover:bg-green-700 flex-1" onClick={handleFinalizeAction} disabled={isSubmitting}>
                               {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null} Confirm
                           </Button>
                        </div>
                     </CardContent>
                 </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Dialog Resolve */}
      <Dialog open={resolveItem !== null} onOpenChange={(open) => !open && setResolveItem(null)}>
        <DialogContent aria-describedby="resolve-dialog-description" className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-indigo-700 flex items-center gap-2">
              <ClipboardList className="w-5 h-5" /> Resolve Discrepancy
            </DialogTitle>
            <DialogDescription id="resolve-dialog-description">
              Action required for <span className="font-bold text-slate-800">{resolveItem?.materialName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="flex justify-between p-3 bg-slate-50 rounded-md border border-slate-100 text-sm">
                <span className="text-slate-500">Variance:</span>
                <span className={`font-bold ${(resolveItem?.variance || 0) < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {(resolveItem?.variance || 0) > 0 ? "+" : ""}{resolveItem?.variance}
                </span>
             </div>
            <div className="space-y-2">
               <label className="text-sm font-medium">Select Resolution Action <span className="text-red-500">*</span></label>
               <Select value={resolveAction} onValueChange={setResolveAction}>
                 <SelectTrigger>
                   <SelectValue placeholder="Choose action..." />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="AdjustSystem">Adjust System (Update Inventory)</SelectItem>
                   <SelectItem value="Investigate">Investigate (Keep pending)</SelectItem>
                   <SelectItem value="Accept">Accept (Ignore variance)</SelectItem>
                 </SelectContent>
               </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
               <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleConfirmResolve} disabled={isSubmitting || !resolveAction}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}