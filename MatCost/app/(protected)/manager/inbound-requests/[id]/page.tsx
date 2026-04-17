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
  ChevronLeft,
  ChevronRight,
  FileInput,
  FileImage,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  managerReceiptsApi,
  ManagerReceiptDetailDto,
} from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { formatPascalCase } from "@/lib/format-pascal-case";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format-date-time";
import { showConfirmToast } from "@/hooks/confirm-toast";
import { OtpVerificationModal } from "@/components/ui/custom/otp-modal";

export default function ManagerReceiptDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [receipt, setReceipt] = useState<ManagerReceiptDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  const [stampNotes, setStampNotes] = useState("");
  const [isStamping, setIsStamping] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceiptDetail = async () => {
      setIsLoading(true);
      try {
        const res = await managerReceiptsApi.getReceiptDetail(id);
        setReceipt(res.data);
      } catch (error: any) {
        console.error("Failed to fetch receipt detail", error);
        toast.error(error.response?.data?.message || t("Receipt not found."));
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

      router.push("/manager/inbound-requests");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error.response?.data?.message || t("Failed to stamp receipt."),
      );
    } finally {
      setIsStamping(false);
    }
  };

  const totalItems = receipt?.items.length || 0;
  const isAll = itemsPerPage === -1;
  const totalPages = isAll ? 1 : Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * (isAll ? totalItems : itemsPerPage);
  const endIndex = isAll ? totalItems : startIndex + itemsPerPage;

  const paginatedItems = receipt?.items.slice(startIndex, endIndex) || [];

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
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back")}
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
                onClick={() => {
                  if (
                    receipt.items.some(
                      (item) => item.binAllocations.length === 0,
                    )
                  ) {
                    toast.error(
                      t(
                        "One or more receipt haven't been putaway yet. Cannot stamp receipt.",
                      ),
                    );
                    return;
                  }
                  showConfirmToast({
                    title: t("Verify Stamping"),
                    description: t(
                      "You are about to stamp and officially confirm this receipt. This action will notify the Accounting team.",
                    ),
                    confirmLabel: t("Confirm & Stamp"),
                    cancelLabel: t("Cancel"),
                    onConfirm: () => setIsOtpModalOpen(true),
                  });
                }}
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
                    <div className="flex items-center gap-2 text-amber-700 font-medium bg-amber-50 w-fit px-2 py-1 rounded border border-amber-100">
                      <Receipt className="w-4 h-4 text-amber-500" />
                      {receipt.receiptCode || "N/A"}
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
                  {receipt.putawayCompletedAt && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {t("Putaway")}
                      </span>
                      <div className="flex items-center gap-2 text-slate-700 font-medium">
                        <FileInput className="w-4 h-4 text-slate-400" />
                        {receipt.putawayCompletedByName} -{" "}
                        {formatDateTime(receipt.putawayCompletedAt)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* DANH SÁCH VẬT TƯ & BIN ALLOCATIONS (Phải - 3 cột) */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white flex flex-col gap-0 min-h-[400px] pb-0">
                <CardHeader className="border-b border-slate-100 py-4 flex flex-row items-center justify-between shrink-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pb-3">
                    <PackageCheck className="w-5 h-5 text-emerald-600" />
                    {t("Received Items & Putaway Details")}
                  </CardTitle>
                  <div className="flex gap-4">
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 text-slate-700"
                    >
                      {t("Total Quantity")}: {receipt.totalQuantity}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 text-slate-700"
                    >
                      {receipt.items.length} {t("Items")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[25%] pl-6">
                          {t("Material")}
                        </TableHead>
                        <TableHead className="w-[20%] text-center">
                          {t("Quantities")}
                        </TableHead>
                        <TableHead className="w-[20%] text-center">
                          {t("Batch Info")}
                        </TableHead>
                        <TableHead className="w-[35%] pr-6 text-center">
                          {t("Bin Allocations")}
                        </TableHead>
                        <TableHead className="w-[35%] pr-6 text-center">
                          {t("Putaway Image")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-32 text-center text-slate-500"
                          >
                            {t("No items found.")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedItems.map((item, idx) => (
                          <TableRow
                            key={idx}
                            className="hover:bg-slate-50 align-top"
                          >
                            <TableCell className="pl-6 py-4">
                              <div className="flex flex-col">
                                <p className="text-sm font-semibold text-slate-800">
                                  {item.materialName}
                                </p>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">
                                  {t(item.source)}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="py-4">
                              <div className="flex flex-col gap-1 text-sm">
                                <div className="flex justify-between items-center bg-slate-100 px-2 py-1 rounded">
                                  <span className="text-slate-500">
                                    {t("Ordered")}:
                                  </span>
                                  <span className="font-semibold text-slate-700">
                                    {item.orderedQuantity}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-blue-50 px-2 py-1 rounded text-blue-700">
                                  <span>{t("Actual")}:</span>
                                  <span className="font-semibold">
                                    {item.actualQuantity}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-emerald-50 px-2 py-1 rounded text-emerald-700">
                                  <span>{t("Passed")}:</span>
                                  <span className="font-semibold">
                                    {item.passQuantity}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-4">
                              <div className="flex flex-col gap-1 text-xs items-center text-center">
                                {item.batchCode ? (
                                  <>
                                    <Badge
                                      variant="outline"
                                      className="bg-white border-slate-200 text-slate-700 font-mono mb-1"
                                    >
                                      {item.batchCode}
                                    </Badge>
                                    {item.expiryDate && (
                                      <span className="flex items-center gap-1 text-slate-500">
                                        <CalendarDays className="w-3 h-3" />
                                        {t("Exp")}:{" "}
                                        {formatDateTime(item.expiryDate)}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-400 italic">
                                    {t("No batch")}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="pr-6 py-4">
                              <div className="flex flex-wrap gap-2 justify-center">
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
                                        <span className="font-semibold text-indigo-800">
                                          {bin.binCode}
                                        </span>
                                        <span className="text-indigo-400 mx-0.5">
                                          |
                                        </span>
                                        <span className="font-medium text-slate-700">
                                          {t("Quantity")}: {bin.quantity}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="pr-6 py-4">
                              {item.putawayImage && (
                                <div className="space-y-2">
                                  <div
                                    className="relative w-24 h-24 border border-slate-200 rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => {
                                      if (item.putawayImage) {
                                        setViewerImage(item.putawayImage);
                                        setIsViewerOpen(true);
                                      }
                                    }}
                                  >
                                    <img
                                      src={item.putawayImage}
                                      alt="Putaway"
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                      <FileImage className="w-6 h-6 text-white" />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
                {totalItems > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4 mt-auto">
                    <div className="text-sm text-slate-500">
                      {t("Showing")}{" "}
                      <span className="font-medium text-slate-900">
                        {startIndex + 1}
                      </span>{" "}
                      {t("to")}{" "}
                      <span className="font-medium text-slate-900">
                        {Math.min(endIndex, totalItems)}
                      </span>{" "}
                      {t("of")}{" "}
                      <span className="font-medium text-slate-900">
                        {totalItems}
                      </span>{" "}
                      {t("items")}
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 whitespace-nowrap">
                          {t("Items per page")}:
                        </span>
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={(val) => {
                            setItemsPerPage(Number(val));
                            setCurrentPage(1); // Reset về trang 1 khi đổi số lượng hiển thị
                          }}
                        >
                          <SelectTrigger className="h-8 w-[75px] bg-white border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="-1">{t("All")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                          className="h-8"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" /> {t("Prev")}
                        </Button>
                        <div className="text-sm font-medium text-slate-600 px-2 min-w-[70px] text-center">
                          {t("Page")} {currentPage} / {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages),
                            )
                          }
                          disabled={currentPage === totalPages}
                          className="h-8"
                        >
                          {t("Next")} <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="sm:max-w-3xl bg-transparent border-0 shadow-none p-0 flex flex-col items-center justify-center">
          <DialogHeader>
            <DialogTitle></DialogTitle>
          </DialogHeader>
          {viewerImage && (
            <div className="relative w-full flex flex-col items-center">
              <button
                onClick={() => setIsViewerOpen(false)}
                className="absolute -top-10 right-0 bg-slate-900/50 hover:bg-slate-900 text-white rounded-full p-2 backdrop-blur-sm transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={viewerImage}
                alt="Enlarged Certificate"
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      <OtpVerificationModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        onSuccess={handleStampReceipt}
        title={t("Verify Stamping")}
        description={t(
          "Please enter the OTP to confirm stamping this receipt. This action will notify the Accounting team.",
        )}
        submitText={t("Confirm & Stamp")}
      />
    </div>
  );
}
