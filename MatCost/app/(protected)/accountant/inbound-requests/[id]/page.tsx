"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Loader2,
  CalendarDays,
  Receipt,
  CheckCircle2,
  Lock,
  FileText,
  Package,
  Building2,
  ChevronLeft,
  ChevronRight,
  Database,
  FileBox,
  ClipboardList,
  Check,
  User,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  accountantReceiptsApi,
  AccountantReceiptDetailDto,
} from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { formatPascalCase } from "@/lib/format-pascal-case";
import { formatCurrency } from "@/lib/format-currency";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format-date-time";
import { OtpVerificationModal } from "@/components/ui/custom/otp-modal";
import { showConfirmToast } from "@/hooks/confirm-toast";

export default function AccountantReceiptDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [receipt, setReceipt] = useState<AccountantReceiptDetailDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [accountingNote, setAccountingNote] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  // Pagination for Warehouse Cards
  const [cardsPage, setCardsPage] = useState(1);
  const cardsPerPage = 5;

  // Pagination for Inventory
  const [inventoryPage, setInventoryPage] = useState(1);
  const inventoryPerPage = 5;

  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

  useEffect(() => {
    const fetchReceiptDetail = async () => {
      setIsLoading(true);
      try {
        const res = await accountantReceiptsApi.getReceipt(id);
        setReceipt(res.data);
      } catch (error: any) {
        console.error("Failed to fetch accountant receipt detail", error);
        toast.error(error.response?.data?.message || t("Receipt not found."));
        router.push("/accountant/inbound-requests");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchReceiptDetail();
  }, [id, router, t]);

  const executeCloseReceipt = async () => {
    setIsClosing(true);
    try {
      await accountantReceiptsApi.closeReceipt(id, {
        accountingNote: accountingNote.trim() || undefined,
      });

      toast.success(
        t("Receipt closed successfully. Accounting records finalized."),
      );

      router.push("/accountant/inbound-requests");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error.response?.data?.message || t("Failed to close receipt."),
      );
    } finally {
      setIsClosing(false);
    }
  };

  if (isLoading || !receipt) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">
            {t("Loading accounting details...")}
          </p>
        </div>
      </div>
    );
  }

  const isPendingClosure = receipt.status === "Stamped";

  const totalCards = receipt.warehouseCards?.length || 0;
  const totalCardsPages = Math.ceil(totalCards / cardsPerPage) || 1;
  const startCardsIndex = (cardsPage - 1) * cardsPerPage;
  const paginatedCards =
    receipt.warehouseCards?.slice(
      startCardsIndex,
      startCardsIndex + cardsPerPage,
    ) || [];

  const totalInventory = receipt.inventoryCurrents?.length || 0;
  const totalInventoryPages = Math.ceil(totalInventory / inventoryPerPage) || 1;
  const startInventoryIndex = (inventoryPage - 1) * inventoryPerPage;
  const paginatedInventory =
    receipt.inventoryCurrents?.slice(
      startInventoryIndex,
      startInventoryIndex + inventoryPerPage,
    ) || [];

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Accounting Review")} #${receipt.receiptCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6 mx-auto w-full">
          {/* TOP BAR */}
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
                    receipt.status === "Stamped"
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-100"
                  }
                >
                  {receipt.status === "Stamped"
                    ? t("Pending Closure")
                    : t(formatPascalCase(receipt.status))}
                </Badge>
              </div>
            </div>

            {isPendingClosure && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                onClick={() =>
                  showConfirmToast({
                    title: t("Finalize & Close Receipt"),
                    description: t(
                      "By closing this receipt, you confirm that all accounting checks have been completed. This action will lock the receipt from further modifications.",
                    ),
                    confirmLabel: t("Confirm Close"),
                    cancelLabel: t("Cancel"),
                    onConfirm: () => setIsOtpModalOpen(true),
                  })
                }
              >
                <Lock className="w-4 h-4 mr-2" />
                {t("Finalize & Close Receipt")}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CỘT TRÁI: THÔNG TIN CHUNG */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 py-4 ">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <Receipt className="w-5 h-5 text-indigo-600" />
                    {t("Document Information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      {t("Receipt Code")}
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-md px-3 py-1 text-indigo-600 bg-indigo-50 border-indigo-200"
                    >
                      <Hash className="w-3.5 h-3.5 text-indigo-500" />
                      {receipt.receiptCode}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("System Date")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-700 text-md font-medium">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      {formatDateTime(receipt.receiptDate)}
                    </div>
                  </div>

                  {receipt.status === "Stamped" && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {t("Stamped At")}
                      </span>
                      <div className="flex items-center gap-2 text-slate-700 text-md font-medium">
                        <CalendarDays className="w-4 h-4 text-slate-400" />
                        {formatDateTime(receipt.stampedAt)}
                      </div>
                    </div>
                  )}

                  {receipt.status === "Stamped" && receipt.stampedByName && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {t("Stamped By")}
                      </span>
                      <div className="flex items-center gap-2 text-slate-700 text-md font-medium">
                        <User className="w-4 h-4 text-slate-400" />
                        {receipt.stampedByName}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 py-4 ">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    {t("Related Purchase Order")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      {t("PO Code")}
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-md px-3 py-1 text-indigo-600 bg-indigo-50 border-indigo-200"
                    >
                      <Hash className="w-3.5 h-3.5 text-indigo-500" />
                      {receipt.purchaseOrder?.purchaseOrderCode || "N/A"}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Supplier")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {receipt.purchaseOrder?.supplierName || "N/A"}
                    </div>
                  </div>

                  <div className="space-y-1 pt-3 border-t border-slate-100">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("PO Total Value")}
                    </span>
                    <div className="font-bold text-slate-900 text-xl">
                      {formatCurrency(receipt.purchaseOrder?.totalAmount)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {receipt.qcCheck && (
                <Card className="border-slate-200 shadow-sm bg-white">
                  <CardHeader className="border-b border-slate-100 py-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                      {t("QC Check Summary")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 font-medium">
                        {t("QC Code")}
                      </span>
                      <span className="font-mono text-sm font-medium text-slate-800">
                        {receipt.qcCheck.qcCheckCode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 font-medium">
                        {t("Overall Result")}
                      </span>
                      <Badge
                        className={
                          receipt.qcCheck.overallResult === "Pass"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : "bg-red-100 text-red-700 hover:bg-red-100"
                        }
                      >
                        {t(receipt.qcCheck.overallResult)}
                      </Badge>
                    </div>
                    {receipt.qcCheck.notes && (
                      <p className="text-xs text-slate-500 italic border-t border-emerald-100 pt-3 mt-1">
                        {receipt.qcCheck.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* CỘT PHẢI: BẢNG SỐ LIỆU */}
            <div className="lg:col-span-2 space-y-6">
              {/* TABLE 1: WAREHOUSE CARDS (THẺ KHO) */}
              <Card className="border-slate-200 shadow-sm bg-white flex flex-col gap-0 pb-0">
                <CardHeader className="border-b border-slate-100 py-4 flex flex-row items-center justify-between shrink-0 ">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pb-2">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                    {t("Ledger Entries (Warehouse Cards)")}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-white border-slate-200 text-slate-700"
                  >
                    {totalCards} {t("Entries")}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <Table>
                    <TableHeader className="bg-white">
                      <TableRow>
                        <TableHead className="pl-6 w-[20%]">
                          {t("Date")}
                        </TableHead>
                        <TableHead className="w-[25%]">
                          {t("Material")}
                        </TableHead>
                        <TableHead className="w-[15%] text-center">
                          {t("Type")}
                        </TableHead>
                        <TableHead className="w-[10%] text-right">
                          {t("Before")}
                        </TableHead>
                        <TableHead className="w-[15%] text-right text-emerald-600">
                          {t("Change")}
                        </TableHead>
                        <TableHead className="w-[15%] pr-6 text-right font-bold">
                          {t("After")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCards.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="h-24 text-center text-slate-500"
                          >
                            {t("No ledger entries found.")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedCards.map((card, idx) => (
                          <TableRow key={idx} className="hover:bg-slate-50/50">
                            <TableCell className="pl-6 py-3">
                              <p className="text-sm font-medium text-slate-700">
                                {format(
                                  new Date(card.transactionDate),
                                  "dd/MM/yyyy",
                                )}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {card.cardCode}
                              </p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-semibold text-slate-800 truncate max-w-[150px]">
                                {card.materialName}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Bin: {card.binCode} | Batch: {card.batchCode}
                              </p>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className="bg-indigo-50 text-indigo-700 border-indigo-200 font-normal"
                              >
                                {card.transactionType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm text-slate-600">
                              {card.quantityBefore}
                            </TableCell>
                            <TableCell className="text-right text-sm font-bold text-emerald-600">
                              +{card.quantity}
                            </TableCell>
                            <TableCell className="pr-6 text-right text-sm font-bold text-slate-900">
                              {card.quantityAfter}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {/* Pagination Cards */}
                  {totalCardsPages > 1 && (
                    <div className="px-6 py-2 flex items-center justify-between border-t border-slate-100 bg-slate-50 rounded-b-xl">
                      <span className="text-xs text-slate-500">
                        {startCardsIndex + 1}-
                        {Math.min(startCardsIndex + cardsPerPage, totalCards)}{" "}
                        {t("of")} {totalCards}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() =>
                            setCardsPage((p) => Math.max(1, p - 1))
                          }
                          disabled={cardsPage === 1}
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() =>
                            setCardsPage((p) =>
                              Math.min(totalCardsPages, p + 1),
                            )
                          }
                          disabled={cardsPage === totalCardsPages}
                        >
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* TABLE 2: INVENTORY CURRENTS (TỒN KHO HIỆN TẠI) */}
              <Card className="border-slate-200 min-h-[300px] shadow-sm bg-white flex flex-col gap-0 pb-0">
                <CardHeader className="border-b border-slate-100 py-4 flex flex-row items-center justify-between shrink-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pb-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    {t("Updated Inventory Stock")}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-white border-slate-200 text-slate-700"
                  >
                    {totalInventory} {t("Locations")}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col">
                  <div className="[&>div]:max-h-[300px] [&>div]:min-h-[300px] [&>div]:overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-white">
                        <TableRow>
                          <TableHead className="pl-6 w-[35%]">
                            {t("Material")}
                          </TableHead>
                          <TableHead className="w-[20%]">
                            {t("Bin Location")}
                          </TableHead>
                          <TableHead className="w-[25%]">
                            {t("Batch Code")}
                          </TableHead>
                          <TableHead className="w-[20%] pr-6 text-right">
                            {t("Current Quantity")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedInventory.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="h-24 text-center text-slate-500"
                            >
                              {t("No inventory updates.")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedInventory.map((inv, idx) => (
                            <TableRow
                              key={idx}
                              className="hover:bg-slate-50/50"
                            >
                              <TableCell className="pl-6 py-3">
                                <div className="flex items-center gap-2">
                                  <FileBox className="w-4 h-4 text-slate-400" />
                                  <span className="text-sm font-semibold text-slate-800">
                                    {inv.materialName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="font-normal text-slate-600 bg-slate-100"
                                >
                                  {inv.binCode}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs font-mono text-slate-500">
                                  {inv.batchCode}
                                </span>
                              </TableCell>
                              <TableCell className="pr-6 text-right">
                                <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                                  {inv.quantityOnHand}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Pagination Inventory */}
                  {totalInventoryPages > 1 && (
                    <div className="px-6 py-2 flex items-center justify-between border-t border-slate-100 bg-slate-50 rounded-b-xl">
                      <span className="text-xs text-slate-500">
                        {startInventoryIndex + 1}-
                        {Math.min(
                          startInventoryIndex + inventoryPerPage,
                          totalInventory,
                        )}{" "}
                        {t("of")} {totalInventory}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() =>
                            setInventoryPage((p) => Math.max(1, p - 1))
                          }
                          disabled={inventoryPage === 1}
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() =>
                            setInventoryPage((p) =>
                              Math.min(totalInventoryPages, p + 1),
                            )
                          }
                          disabled={inventoryPage === totalInventoryPages}
                        >
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <OtpVerificationModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        onSuccess={executeCloseReceipt}
        title={t("Verify Closure")}
        description={t(
          "Please enter the OTP to confirm closing this receipt. This action cannot be undone.",
        )}
        submitText={t("Confirm Closure")}
        requireSignature={true}
      />
    </div>
  );
}
