"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { issueSlipApi, IssueSlipAllocation } from "@/services/issueslip-service";
import {
  ArrowLeft, Loader2, PackageSearch, ClipboardList,
  CheckCircle2, XCircle, AlertCircle, FileText, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function CheckInventoryPage() {
  const router = useRouter();
  const params = useParams();
  const issueId = Number(params?.issueId || params?.id);

  const [allocation, setAllocation] = useState<IssueSlipAllocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState<{ [detailId: number]: number }>({});

  useEffect(() => {
    if (!issueId) return;
    const fetchAllocation = async () => {
      try {
        setLoading(true);
        const data = await issueSlipApi.getIssueSlipAllocation(issueId);
        setAllocation(data);
      } catch (error) {
        console.error(error);
        toast.error("Không lấy được dữ liệu phân bổ!");
      } finally {
        setLoading(false);
      }
    };
    fetchAllocation();
  }, [issueId]);

  const handleBatchChange = (detailId: number, batchId: number) => {
    setSelectedBatches((prev) => ({
      ...prev,
      [detailId]: batchId,
    }));
  };

  const handleProcess = async () => {
    if (!allocation) return;
    
    const items = allocation.items.map((item) => ({
      detailId: item.detailId,
      // Lấy batch được chọn, nếu chưa chọn thì lấy batch đầu tiên trong list gợi ý
      batchId: selectedBatches[item.detailId] || item.availableBatches[0]?.batchId,
      quantity: item.requestedQty,
    }));

    // Kiểm tra xem có item nào không có batchId hợp lệ không (do hết hàng)
    if (items.some(i => !i.batchId)) {
       toast.error("Không thể xuất kho vì có vật tư chưa được chọn lô (Hết hàng).");
       return;
    }

    try {
      setIsProcessing(true);
      await issueSlipApi.processIssueSlip(allocation.issueId, { items });
      toast.success("Xuất kho thành công! Hệ thống đã ghi nhận Inventory Issue.");
      router.push("/accountant/outbound/issueSlip"); // Quay về danh sách
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Xuất kho thất bại! Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "approved") return <Badge className="bg-emerald-100 text-emerald-800 border-none px-3 py-1"><CheckCircle2 className="w-4 h-4 mr-1.5" /> {status}</Badge>;
    if (s === "rejected") return <Badge className="bg-rose-100 text-rose-800 border-none px-3 py-1"><XCircle className="w-4 h-4 mr-1.5" /> {status}</Badge>;
    if (s === "pending") return <Badge className="bg-amber-100 text-amber-800 border-none px-3 py-1"><AlertCircle className="w-4 h-4 mr-1.5" /> {status}</Badge>;
    return <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none px-3 py-1">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Loading inventory allocation...</p>
        </div>
      </div>
    );
  }

  if (!allocation) return <div className="p-10 text-center">Allocation data not found</div>;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`Inventory Allocation #${allocation.issueCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-indigo-600">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </Button>
            {getStatusBadge(allocation.status)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN: Data Table (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-slate-200 shadow-sm overflow-hidden gap-0">
                <CardHeader className="bg-white border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <PackageSearch className="w-5 h-5 text-indigo-600" /> Material Batches Allocation
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="pl-6">Material Name</TableHead>
                        <TableHead className="text-right">Req Qty</TableHead>
                        <TableHead className="text-center">Unit</TableHead>
                        <TableHead className="text-right">Available Stock</TableHead>
                        <TableHead className="pr-6 w-[250px]">Select Batch (FIFO)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocation.items.map((item) => {
                        const currentBatch = selectedBatches[item.detailId]?.toString() || item.availableBatches[0]?.batchId?.toString();
                        
                        return (
                          <TableRow key={item.detailId} className="hover:bg-slate-50/50">
                            <TableCell className="pl-6 font-medium text-slate-700">{item.materialName}</TableCell>
                            <TableCell className="text-right font-bold text-slate-900">{item.requestedQty}</TableCell>
                            <TableCell className="text-center text-slate-500">{item.unit}</TableCell>
                            <TableCell className="text-right">
                              <span className={`font-semibold ${!item.isEnough ? "text-rose-600" : "text-emerald-600"}`}>
                                {item.totalAvailable}
                              </span>
                            </TableCell>
                            <TableCell className="pr-6">
                              {item.availableBatches.length === 0 ? (
                                <Badge variant="outline" className="text-rose-500 border-rose-200 bg-rose-50 w-full justify-center">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> Out of stock
                                </Badge>
                              ) : (
                                <Select 
                                  value={currentBatch} 
                                  onValueChange={(val) => handleBatchChange(item.detailId, parseInt(val))}
                                >
                                  <SelectTrigger className="w-full bg-white">
                                    <SelectValue placeholder="Select batch" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {item.availableBatches.map((batch: any) => (
                                      <SelectItem key={batch.batchId} value={batch.batchId.toString()}>
                                        {batch.batchCode} (Qty: {batch.availableQty})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: Info & Actions (1/3) */}
            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm gap-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                     <FileText className="w-5 h-5 text-indigo-600" /> Slip Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue Code</label>
                    <div className="mt-1 font-bold text-indigo-700">{allocation.issueCode}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Name</label>
                    <div className="mt-1 font-medium text-slate-800">{allocation.projectName || "N/A"}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Box for Accountant */}
              <Card className="border-indigo-200 shadow-sm bg-indigo-50/30 gap-0">
                <CardHeader className="border-b border-indigo-100 pt-4 pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-800">
                    <ClipboardList className="w-5 h-5" /> Accountant Action
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 flex flex-col gap-3">
                  {allocation.isAllEnough ? (
                    <>
                      <p className="text-sm text-indigo-700/80 mb-2">
                        All materials have sufficient stock. Please review the selected batches and proceed.
                      </p>
                      <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm h-11"
                        onClick={handleProcess}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Confirm & Process Issue
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-md mb-2">
                        <p className="text-sm text-rose-700 flex items-start gap-1.5 font-medium">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          Shortage Detected! Cannot fulfill request.
                        </p>
                      </div>
                      <Button 
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-sm h-11"
                        onClick={() => toast.info("Tính năng tạo phiếu nợ đang được phát triển")}
                      >
                        Create Debt Slip / Partial Issue
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}