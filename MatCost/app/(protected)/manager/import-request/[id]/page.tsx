"use client";

import { useState, useEffect } from "react";
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
} from "@/services/receipt-service";
import { toast } from "sonner";
import { showConfirmToast } from "@/hooks/confirm-toast";

export default function ManagerReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [receipt, setReceipt] = useState<PendingReceiptDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await managerReceiptApi.getById(id);
        setReceipt(res.data);
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
        <Header title={`Review Receipt #${receipt.receiptId}`} />

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
                    <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
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
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <Receipt className="w-4 h-4 text-indigo-600" /> Item List &
                    Pricing
                  </CardTitle>
                  <Badge variant="outline" className="font-normal">
                    {receipt.details.length} items
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="pl-6 w-[40%]">Material</TableHead>
                        <TableHead className="text-center">Supplier</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right pr-6">
                          Subtotal
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipt.details.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/50">
                          <TableCell className="pl-6">
                            <div className="font-medium text-slate-700">
                              {item.materialName}
                            </div>
                            <div className="text-xs text-slate-500">
                              {item.materialCode}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm text-slate-600">
                              {item.supplierName || "N/A"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium">{item.quantity}</span>
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
                </CardContent>
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
                  <p className="text-xs text-indigo-600/70 mt-2">
                    This receipt has been processed by{" "}
                    <span className="font-medium">
                      {receipt.createdByName || "Accountant"}
                    </span>{" "}
                    and is waiting for your final approval.
                  </p>
                </CardContent>
              </Card>

              {/* Action Card */}
              {receipt.status == "Submitted" && (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">
                      Manager Decision
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium text-slate-700">
                          Notes / Remarks
                        </label>
                        <span
                          className={`text-xs ${notes.length > 500 ? "text-red-500" : "text-slate-400"}`}
                        >
                          {notes.length}/500
                        </span>
                      </div>
                      <Textarea
                        placeholder="E.g. Approved. Proceed with delivery."
                        className="resize-none h-24"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        maxLength={500}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3 pt-2">
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                      size="lg"
                      onClick={handleApprove}
                      disabled={isProcessing}
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
                          disabled={isProcessing}
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
