"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Receipt,
  UserSquare2,
  CalendarDays,
  PackageCheck,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  managerReceiptsApi,
  ManagerReceiptDetailDto,
} from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { formatPascalCase } from "@/lib/format-pascal-case";

export default function ManagerReceiptDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [receipt, setReceipt] = useState<ManagerReceiptDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State cho hành động "Stamp"
  const [isStampModalOpen, setIsStampModalOpen] = useState(false);
  const [stampNotes, setStampNotes] = useState("");
  const [isStamping, setIsStamping] = useState(false);

  useEffect(() => {
    const fetchReceiptDetail = async () => {
      setIsLoading(true);
      try {
        const res = await managerReceiptsApi.getReceiptDetail(id);
        setReceipt(res.data);
      } catch (error: any) {
        console.error("Failed to fetch receipt detail", error);
        toast.error(
          error.response?.data?.message || t("Receipt not found.")
        );
        router.push("/manager/inbound-requests");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchReceiptDetail();
  }, [id, router, t]);

  const handleStampReceipt = async () => {
    setIsStamping(true);
    try {
      await managerReceiptsApi.stampReceipt(id, {
        notes: stampNotes.trim() || null,
      });

      toast.success(t("Receipt stamped successfully!"));
      setIsStampModalOpen(false);
      
      router.push("/manager/inbound-requests"); 
    } catch (error: any) {
      console.error(error);
      toast.error(
        error.response?.data?.message || t("Failed to stamp receipt.")
      );
    } finally {
      setIsStamping(false);
    }
  };

const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";

    let safeDateString = dateString;
    
    if (!safeDateString.includes("Z") && !safeDateString.includes("+")) {
      safeDateString = safeDateString.replace(" ", "T") + "Z";
    }

    return new Date(safeDateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading || !receipt) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">
            {t("Loading receipt details...")}
          </p>
        </div>
      </div>
    );
  }

  const canStamp = receipt.status === "ReadyForStamp"; 

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Receipt Details")} #${receipt.receiptCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6 mx-auto w-full">
          {/* TOP BAR & ACTIONS */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to List")}
              </Button>
              <div className="hidden md:flex items-center gap-3 border-l border-slate-200 pl-4">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {t("Receipt Details")}
                </h1>
                <Badge
                  className={
                    receipt.status === "Completed"
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                      : receipt.status === "Closed"
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-100"
                      : "bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
                  }
                >
                  {t(formatPascalCase(receipt.status))}
                </Badge>
              </div>
            </div>

            {canStamp && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                onClick={() => setIsStampModalOpen(true)}
              >
                <PackageCheck className="w-4 h-4 mr-2" />
                {t("Stamp & Confirm Receipt")}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* THÔNG TIN CHUNG (Trái - 1 cột) */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white gap-0 pb-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    {t("General Information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Receipt Code")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
                      <Receipt className="w-5 h-5 text-slate-400" />
                      {receipt.receiptCode}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Purchase Order")}
                    </span>
                    <div className="flex items-center gap-2 text-indigo-700 font-medium bg-indigo-50 w-fit px-2 py-1 rounded border border-indigo-100">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      {receipt.purchaseOrderCode || "N/A"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Supplier")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      <UserSquare2 className="w-4 h-4 text-slate-400" />
                      {receipt.supplierName || t("Unknown Supplier")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* DANH SÁCH VẬT TƯ & BIN ALLOCATIONS (Phải - 3 cột) */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white flex flex-col gap-0 min-h-[400px]">
                <CardHeader className="border-b border-slate-100 py-4 flex flex-row items-center justify-between shrink-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pb-3">
                    <PackageCheck className="w-5 h-5 text-emerald-600" />
                    {t("Received Items & Putaway Details")}
                  </CardTitle>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                    {receipt.items.length} {t("Items")}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[25%] pl-6">{t("Material")}</TableHead>
                        <TableHead className="w-[20%] text-center">{t("Quantities")}</TableHead>
                        <TableHead className="w-[20%] text-center">{t("Batch Info")}</TableHead>
                        <TableHead className="w-[35%] pr-6 text-center">{t("Bin Allocations")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipt.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                            {t("No items found.")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        receipt.items.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-slate-50 align-top">
                            <TableCell className="pl-6 py-4">
                              <p className="text-sm font-bold text-slate-800">
                                {item.materialName}
                              </p>
                            </TableCell>

                            <TableCell className="py-4">
                              <div className="flex flex-col gap-1 text-sm">
                                <div className="flex justify-between items-center bg-slate-100 px-2 py-1 rounded">
                                  <span className="text-slate-500">{t("Ordered")}:</span>
                                  <span className="font-semibold text-slate-700">{item.orderedQuantity}</span>
                                </div>
                                <div className="flex justify-between items-center bg-blue-50 px-2 py-1 rounded text-blue-700">
                                  <span>{t("Actual")}:</span>
                                  <span className="font-semibold">{item.actualQuantity}</span>
                                </div>
                                <div className="flex justify-between items-center bg-emerald-50 px-2 py-1 rounded text-emerald-700">
                                  <span>{t("Passed")}:</span>
                                  <span className="font-semibold">{item.passQuantity}</span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-4">
                              <div className="flex flex-col gap-1 text-xs items-center text-center">
                                {item.batchCode ? (
                                  <>
                                    <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 font-mono mb-1">
                                      {item.batchCode}
                                    </Badge>
                                    {item.expiryDate && (
                                      <span className="flex items-center gap-1 text-slate-500">
                                        <CalendarDays className="w-3 h-3" />
                                        {t("Exp")}: {formatDate(item.expiryDate)}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-400 italic">{t("No batch")}</span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="pr-6 py-4">
                              {item.binAllocations.length === 0 ? (
                                <span className="text-slate-400 text-sm italic text-center">
                                  {t("No bins allocated")}
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-2 justify-center">
                                  {item.binAllocations.map((bin, binIdx) => (
                                    <div 
                                      key={binIdx}
                                      className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2 py-1.5 rounded-md text-xs"
                                    >
                                      <MapPin className="w-3 h-3 text-indigo-500" />
                                      <span className="font-semibold text-indigo-800">{bin.binCode}</span>
                                      <span className="text-indigo-400 mx-0.5">|</span>
                                      <span className="font-medium text-slate-700">Qty: {bin.quantity}</span>
                                    </div>
                                  ))}
                                </div>
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
          </div>
        </div>
      </main>

      {/* MODAL: ĐÓNG DẤU XÁC NHẬN (STAMP) */}
      <Dialog
        open={isStampModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsStampModalOpen(false);
            setStampNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-0 shadow-lg bg-white">
          <DialogHeader className="pt-5 pb-4 px-6 border-b border-slate-100 bg-white">
            <DialogTitle className="text-emerald-700 flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5" />
              {t("Stamp Receipt")}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-4 bg-white">
            <p className="text-sm text-slate-700">
              {t(
                "You are about to stamp and officially confirm this receipt. This action will notify the Accounting team."
              )}
            </p>
            {/* <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {t("Stamp Notes (Optional)")}
              </label>
              <Textarea
                placeholder={t("Add any final notes or remarks here...")}
                className="min-h-[100px] resize-none focus-visible:ring-emerald-500 mt-2 bg-white"
                value={stampNotes}
                onChange={(e) => setStampNotes(e.target.value)}
                autoFocus
              />
            </div> */}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsStampModalOpen(false);
                setStampNotes("");
              }}
              className="text-slate-600 hover:bg-slate-100"
              disabled={isStamping}
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleStampReceipt}
              disabled={isStamping}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isStamping && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {t("Confirm & Stamp")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}