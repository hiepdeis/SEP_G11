"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { ArrowLeft, Lock, AlertTriangle, CheckCircle, FileSignature, Download, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditService, StockTakeReviewDetailDto, VarianceItemDto } from "@/services/audit-service";

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
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [resolveItem, setResolveItem] = useState<VarianceItemDto | null>(null);
  const [resolveAction, setResolveAction] = useState("");

  const canResolve = ["manager"].includes(role);
  const canFinalize = ["manager"].includes(role);

  const fetchData = async () => {
    if (!stockTakeId) return;
    try {
      setLoading(true);
      // Gọi API Review Detail và API Variances
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
      alert("Vui lòng chọn hướng xử lý!");
      return;
    }

    try {
      setIsSubmitting(true);
      // Gọi API Resolve Variance (Ví dụ nếu AdjustSystem, có thể cần truyền thêm Lý do id)
      await auditService.resolveVariance(stockTakeId, resolveItem.id, resolveAction, 1); 
      
      // Làm mới dữ liệu
      await fetchData();
      setResolveItem(null);
    } catch (error: any) {
      alert(error.response?.data?.message || "Lỗi xử lý.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeAction = async () => {
    try {
      setIsSubmitting(true);
      await auditService.finalizeAudit(stockTakeId, "Đã kiểm tra và khớp sổ");
      alert("Đã chốt sổ kiểm kê thành công!");
      router.push(`/${role}/audit`);
    } catch (error: any) {
      alert(error.response?.data?.message || "Lỗi chốt sổ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2" /> Đang tải dữ liệu...</div>;
  if (!detailData) return <div className="flex h-screen items-center justify-center text-red-500">Không tìm thấy thông tin Audit.</div>;

  const metrics = detailData.metrics;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-slate-500" /></Button>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{detailData.title}</h2>
                <p className="text-xs text-slate-500">ID: AUD-{stockTakeId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-slate-100 text-slate-700">{detailData.status}</Badge>
              <UserDropdown align="end" trigger={<Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"><User className="h-5 w-5" /></Button>} />
            </div>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white"><CardContent className="p-4"><p className="text-xs text-slate-500 uppercase font-bold">Total Items</p><p className="text-2xl font-bold">{metrics?.totalItems || 0}</p></CardContent></Card>
            <Card className="bg-white"><CardContent className="p-4"><p className="text-xs text-slate-500 uppercase font-bold">Counted</p><p className="text-2xl font-bold text-indigo-600">{metrics?.countedItems || 0}</p></CardContent></Card>
            <Card className="bg-green-50"><CardContent className="p-4"><p className="text-xs text-green-700 uppercase font-bold">Matched</p><p className="text-2xl font-bold text-green-800">{metrics?.matchedItems || 0}</p></CardContent></Card>
            <Card className="bg-red-50"><CardContent className="p-4"><p className="text-xs text-red-700 uppercase font-bold">Discrepancies</p><p className="text-2xl font-bold text-red-800">{metrics?.discrepancyItems || 0}</p></CardContent></Card>
          </div>

          {/* Variances Table */}
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
              <CardTitle>Discrepancies to Resolve</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">System Qty</TableHead>
                    <TableHead className="text-right">Count Qty</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variances.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-500">All items matched perfectly. No discrepancies.</TableCell></TableRow>
                  ) : (
                    variances.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-slate-700">
                          {row.materialName} <br/> <span className="text-xs text-slate-400">Bin: {row.binCode}</span>
                      </TableCell>
                      <TableCell className="text-right text-slate-500">{row.systemQty}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">{row.countQty}</TableCell>
                      <TableCell className={`text-right font-bold ${row.variance < 0 ? "text-red-600" : "text-blue-600"}`}>
                        {row.variance > 0 ? "+" : ""}{row.variance}
                      </TableCell>
                      <TableCell>
                         {row.resolutionAction ? (
                             <Badge className="bg-green-100 text-green-700 border-none">Resolved ({row.resolutionAction})</Badge>
                         ) : (
                             <Badge className="bg-red-100 text-red-700 border-none"><AlertTriangle className="w-3 h-3 mr-1" /> Pending</Badge>
                         )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canResolve && !row.resolutionAction && (
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setResolveItem(row); setResolveAction(""); }}>
                              Resolve
                            </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Finalize */}
          {canFinalize && detailData.status !== "Completed" && (
            <div className="mt-8 flex justify-end">
                  <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold" disabled={isSubmitting || isFinalizing} onClick={() => setIsFinalizing(true)}>
                    <FileSignature className="w-5 h-5 mr-2" /> Complete & Unlock System
                  </Button>
            </div>
          )}

          {/* Confirm Dialog to prevent accidental click */}
          {isFinalizing && (
             <Card className="border-green-200 bg-green-50 mt-4 p-6 shadow-sm flex justify-between items-center animate-in fade-in">
                 <div>
                    <h4 className="font-bold text-green-900">Ready to Finalize?</h4>
                    <p className="text-sm text-green-700">This will adjust the system inventory and lock this audit permanently.</p>
                 </div>
                 <div className="flex gap-2">
                     <Button variant="outline" onClick={() => setIsFinalizing(false)}>Cancel</Button>
                     <Button className="bg-green-600 hover:bg-green-700" onClick={handleFinalizeAction} disabled={isSubmitting}>
                         {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null} Confirm Finalize
                     </Button>
                 </div>
             </Card>
          )}

        </div>
      </main>

      <Dialog open={resolveItem !== null} onOpenChange={(open) => !open && setResolveItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Variance</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm">Action for: <strong>{resolveItem?.materialName}</strong></p>
            <Select value={resolveAction} onValueChange={setResolveAction}>
              <SelectTrigger><SelectValue placeholder="Select Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AdjustSystem">Adjust System (Chỉnh kho theo thực tế)</SelectItem>
                <SelectItem value="Investigate">Investigate (Tiếp tục điều tra)</SelectItem>
                <SelectItem value="Accept">Accept (Chấp nhận sai lệch)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveItem(null)}>Cancel</Button>
            <Button className="bg-indigo-600 text-white" onClick={handleConfirmResolve} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}