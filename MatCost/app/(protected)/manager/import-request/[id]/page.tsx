"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Building2,
  MapPin,
  AlertTriangle,
  Loader2,
  Receipt,
  Eraser,
  Gavel,
  History,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  managerReceiptApi,
  PendingReceiptDto,
  receiptApi,
  ReceiptRejectionHistoryDto,
} from "@/services/receipt-service";
import { toast } from "sonner";
import { showConfirmToast } from "@/hooks/confirm-toast";
import ReactSignatureCanvas, { SignatureCanvas } from "react-signature-canvas";

export default function ManagerReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [receipt, setReceipt] = useState<PendingReceiptDto | null>(null);
  const [rejectionHistory, setRejectionHistory] = useState<
    ReceiptRejectionHistoryDto[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const sigCanvas = useRef<ReactSignatureCanvas>(null);
  const [isSigned, setIsSigned] = useState(false);

  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await managerReceiptApi.getById(id);
        const resHis = await receiptApi
          .getRejectionHistory(id)
          .catch(() => ({ data: [] }));
        setReceipt(res.data);
        setRejectionHistory(resHis.data || []);
      } catch (error) {
        console.error("Failed to load receipt details", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "0 ₫";
    return val.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
  };

  const handleApprove = () => {
    showConfirmToast({
      title: "Approve Receipt?",
      description: "Are you sure you want to approve this receipt?",
      confirmLabel: "Yes, Approve",
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await managerReceiptApi.approveReceipt(id, { approvalNotes: notes });
          toast.success("Receipt approved successfully!");
          router.push("/manager/import-request");
        } catch (error) {
          console.error(error);
          toast.error("Failed to approve receipt.");
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    setIsProcessing(true);
    try {
      await managerReceiptApi.rejectReceipt(id, {
        rejectionReason: rejectReason,
      });
      toast.success("Receipt rejected.");
      router.push("/manager/import-request");
    } catch (error) {
      console.error(error);
      toast.error("Failed to reject receipt.");
    } finally {
      setIsProcessing(false);
      setIsRejectDialogOpen(false);
    }
  };

  const handleSignatureEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setIsSigned(true);
    }
  };

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsSigned(false);
    }
  };

  const totalItems = receipt?.details?.length || 0;
  const totalTablePages = Math.ceil(totalItems / tableItemsPerPage) || 1;
  const startTableIndex = (tablePage - 1) * tableItemsPerPage;
  const paginatedTableItems =
    receipt?.details?.slice(
      startTableIndex,
      startTableIndex + tableItemsPerPage,
    ) || [];

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Loading details...</p>
        </div>
      </div>
    );
  }

  if (!receipt)
    return <div className="p-10 text-center">Receipt not found</div>;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`Review Receipt #${receipt.receiptCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          {/* Top Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push("/manager/import-request")}
              className="pl-0 hover:bg-transparent hover:text-indigo-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </Button>
            <div className="text-sm text-slate-500">
              Created on:{" "}
              <span className="font-medium text-slate-700">
                {new Date(receipt.receiptDate || "").toLocaleDateString(
                  "vi-VN",
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN: Main Details (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Supplier & Warehouse Info Card */}
              <Card className="border-slate-200 shadow-sm gap-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <Building2 className="w-4 h-4 text-indigo-600" />{" "}
                    Procurement Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
                      Destination Warehouse
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-md">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {receipt.warehouseName}
                        </p>
                        <p className="text-xs text-slate-500">
                          Site A - Construction Zone
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items Table Card */}
              <Card className="border-slate-200 shadow-sm overflow-hidden pb-0 gap-0">
                <CardHeader className="bg-white border-b border-slate-100 py-4 flex flex-row justify-between items-center">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pb-5">
                    <Receipt className="w-4 h-4 text-indigo-600" /> Item List &
                    Pricing
                  </CardTitle>
                  <Badge variant="outline" className="font-normal">
                    {totalItems} items
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="[&>div]:max-h-[300px] [&>div]:min-h-[300px] [&>div]:overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                        <TableRow className="bg-slate-50/50">
                          <TableHead className="pl-6 w-[40%]">
                            Material
                          </TableHead>
                          <TableHead className="w-[30%]">Supplier</TableHead>
                          <TableHead className="text-center">
                            Quantity
                          </TableHead>
                          <TableHead className="text-right">
                            Unit Price
                          </TableHead>
                          <TableHead className="text-right pr-6">
                            Subtotal
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTableItems.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-slate-50/50">
                            <TableCell className="pl-6">
                              <div className="font-medium text-slate-700">
                                {item.materialName}
                              </div>
                              <div className="text-xs text-slate-500">
                                {item.materialCode}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-slate-600">
                                {item.supplierName || "N/A"}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-medium">
                                {item.quantity}
                              </span>
                              <span className="text-xs text-slate-400 ml-1">
                                {item.unit}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-600">
                              {formatCurrency(item.unitPrice)}
                            </TableCell>
                            <TableCell className="text-right pr-6 font-bold text-slate-800">
                              {formatCurrency(item.subTotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>

                {totalTablePages > 1 && (
                  <div className="px-6 py-3 flex items-center justify-between border-t border-slate-100 bg-white">
                    <span className="text-xs text-slate-500">
                      Showing {startTableIndex + 1}-
                      {Math.min(
                        startTableIndex + tableItemsPerPage,
                        totalItems,
                      )}{" "}
                      of {totalItems}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                        disabled={tablePage === 1}
                      >
                        <ChevronLeft className="w-3 h-3 mr-1" /> Prev
                      </Button>
                      <span className="text-xs font-medium text-slate-600 w-10 text-center">
                        {tablePage} / {totalTablePages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() =>
                          setTablePage((p) => Math.min(totalTablePages, p + 1))
                        }
                        disabled={tablePage === totalTablePages}
                      >
                        Next <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Grand Total Footer */}
                <div className="bg-slate-50 p-6 flex justify-end items-center gap-4 border-t border-slate-100">
                  <div className="text-right">
                    <span className="text-slate-500 text-sm font-medium block">
                      Total Value (VND)
                    </span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {formatCurrency(receipt.totalAmount)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* RIGHT COLUMN: Approval Actions (1/3 width) */}
            <div className="space-y-6">
              {/* Status Card */}
              <Card className="border-slate-200 shadow-sm bg-indigo-50/30 border-indigo-100 gap-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md font-medium text-indigo-800 uppercase tracking-wider">
                    Current Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    <span className="text-lg font-semibold text-indigo-700">
                      {receipt.status}
                    </span>
                  </div>
                  {receipt.status == "Submitted" ? (
                    <p className="text-xs text-indigo-600/70 mt-2">
                      This receipt has been processed and is waiting for your
                      final approval.
                    </p>
                  ) : (
                    <p className="text-xs text-indigo-600/70 mt-2">
                      This receipt has been approved
                    </p>
                  )}
                </CardContent>
              </Card>

              {rejectionHistory.length > 0 && (
                <Card className="border-red-200 shadow-sm bg-red-50/40">
                  <CardHeader className="pb-3 border-b border-red-100">
                    <CardTitle className="text-sm font-bold text-red-800 uppercase tracking-wide flex items-center gap-2">
                      <History className="w-4 h-4" /> Rejection Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {/* Đường viền dọc tạo hiệu ứng Timeline */}
                    <div className="relative border-l-2 border-red-200 ml-2 space-y-6">
                      {rejectionHistory.map((history) => (
                        <div key={history.id} className="relative pl-5">
                          {/* Nút tròn trên timeline */}
                          <div className="absolute w-3 h-3 bg-red-500 rounded-full -left-[7px] top-1.5 border-2 border-white shadow-sm" />

                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800">
                              {history.rejectorName || "Manager"}
                            </span>
                            <span className="text-[11px] text-slate-500 mb-2">
                              {new Date(history.rejectedAt).toLocaleString(
                                "vi-VN",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>

                            {/* Khung chứa lý do reject */}
                            <div className="p-3 bg-white border border-red-100 rounded-md text-sm text-slate-700 shadow-sm">
                              {history.rejectionReason}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Card */}
              {receipt.status == "Submitted" && (
                <Card className="border-slate-200 shadow-sm gap-0">
                  <CardHeader className="border-b border-slate-100 pt-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                      <Gavel className="w-5 h-5 text-indigo-600" /> Manager
                      Decision
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <label className="text-sm font-medium text-slate-700">
                          Manager Signature{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        {isSigned && (
                          <button
                            onClick={clearSignature}
                            className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                          >
                            <Eraser className="w-3 h-3" /> Clear
                          </button>
                        )}
                      </div>

                      <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden relative group">
                        <SignatureCanvas
                          ref={sigCanvas}
                          onEnd={handleSignatureEnd}
                          penColor="black"
                          canvasProps={{
                            className: "w-full h-32 cursor-crosshair bg-white",
                          }}
                        />
                        {!isSigned && (
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
                            <span className="text-slate-400 select-none italic">
                              Sign here to enable decision buttons...
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-3 pt-6 pb-6 px-6">
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                      size="lg"
                      onClick={handleApprove}
                      disabled={isProcessing || !isSigned}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Approve Receipt
                    </Button>

                    <Dialog
                      open={isRejectDialogOpen}
                      onOpenChange={setIsRejectDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          // Nút sẽ bị disable nếu đang gửi API HOẶC chưa ký
                          disabled={isProcessing || !isSigned}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject Receipt
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle className="text-rose-600 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" /> Reject Receipt
                          </DialogTitle>
                          <DialogDescription>
                            Please provide a reason for rejecting this receipt.
                            This will be sent back to the accountant.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <label className="text-sm font-medium mb-2 block">
                            Reason *
                          </label>
                          <Textarea
                            placeholder="E.g. Price is too high compared to market..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="min-h-[100px]"
                          />
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={isProcessing || !rejectReason.trim()}
                          >
                            {isProcessing
                              ? "Rejecting..."
                              : "Confirm Rejection"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
