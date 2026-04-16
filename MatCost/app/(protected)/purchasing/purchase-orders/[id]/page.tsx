"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Loader2,
  CalendarDays,
  Building2,
  Package,
  FileText,
  Hash,
  Send,
  Calculator,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Construction,
  Ticket, // Thêm icon cảnh báo
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  purchasingPurchaseOrderApi,
  PurchaseOrderDto,
} from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { showConfirmToast } from "@/hooks/confirm-toast";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/custom/date-time-picker";
import { formatPascalCase } from "@/lib/format-pascal-case";
import { formatCurrency } from "@/lib/format-currency";
import { formatDateTime } from "@/lib/format-date-time";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();

  const id = Number(params.id);

  const [order, setOrder] = useState<PurchaseOrderDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [isConfirmDeliveryModalOpen, setIsConfirmDeliveryModalOpen] =
    useState(false);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<
    Date | undefined
  >(undefined);
  const [supplierNote, setSupplierNote] = useState("");
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [isRecreating, setIsRecreating] = useState(false);

  useEffect(() => {
    const fetchOrderDetail = async () => {
      setIsLoading(true);
      try {
        const res = await purchasingPurchaseOrderApi.getOrder(id);
        setOrder(res.data);
      } catch (error: any) {
        console.error("Failed to fetch purchase order detail", error);
        toast.error(
          error.response?.data?.message || t("Purchase order not found"),
        );
        router.push("/purchasing/purchase-orders");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchOrderDetail();
    }
  }, [id, router, t]);

  const handleSendToSupplier = () => {
    showConfirmToast({
      title: t("Send to Supplier?"),
      description: t(
        "Are you sure you want to send this Purchase Order to the supplier? This action cannot be undone.",
      ),
      confirmLabel: t("Yes, Send"),
      onConfirm: async () => {
        setIsSending(true);
        try {
          await purchasingPurchaseOrderApi.sendToSupplier(id);
          toast.success(t("Purchase Order sent to supplier successfully!"));

          const res = await purchasingPurchaseOrderApi.getOrder(id);
          setOrder(res.data);
        } catch (error: any) {
          console.error(error);
          toast.error(
            error.response?.data?.message || t("Failed to send to supplier"),
          );
        } finally {
          setIsSending(false);
        }
      },
    });
  };

  const handleRecreatePO = () => {
    if (!order?.requestId) {
      toast.error(
        t("Cannot recreate PO: Missing original Purchase Request ID."),
      );
      return;
    }

    showConfirmToast({
      title: t("Recreate Purchase Order?"),
      description: t(
        "Are you sure you want to recreate this rejected Purchase Order? You will be redirected to draft a new one based on the original request.",
      ),
      confirmLabel: t("Yes, Recreate"),
      onConfirm: async () => {
        setIsRecreating(true);
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          router.push(
            `/purchasing/purchase-orders/recreate?requestId=${order.requestId}&parentPOId=${order.purchaseOrderId}`,
          );
        } catch (error: any) {
          console.error(error);
          toast.error(t("An error occurred while trying to recreate the PO."));
        } finally {
          setIsRecreating(false);
        }
      },
    });
  };

  const handleConfirmDelivery = async () => {
    if (!expectedDeliveryDate) {
      toast.error(t("Please select an expected delivery date."));
      return;
    }

    const now = new Date();
    if (expectedDeliveryDate <= now) {
      toast.error(t("Expected delivery date and time must be in the future."));
      return;
    }

    setIsConfirmingDelivery(true);
    try {
      const isoDate = expectedDeliveryDate.toISOString();

      await purchasingPurchaseOrderApi.confirmDelivery(id, {
        expectedDeliveryDate: isoDate,
        supplierNote: supplierNote.trim() || undefined,
      });

      toast.success(t("Delivery confirmed successfully!"));
      setIsConfirmDeliveryModalOpen(false);

      const res = await purchasingPurchaseOrderApi.getOrder(id);
      setOrder(res.data);
    } catch (error: any) {
      console.error(error);
      toast.error(
        error.response?.data?.message || t("Failed to confirm delivery."),
      );
    } finally {
      setIsConfirmingDelivery(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "AccountantPending":
      case "AdminPending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "AdminApproved":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "SentToSupplier":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Rejected":
      case "AccountantRejected":
      case "AdminRejected":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">{t("Loading order details...")}</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const isAccountantRejected = order.status === "AccountantRejected";
  const isAdminRejected = order.status === "AdminRejected";
  const isRejected =
    isAccountantRejected || isAdminRejected || order.status === "Rejected";

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Purchase Order")} #${order.purchaseOrderCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6 mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back")}
            </Button>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500">
                {t("Status")}:
              </span>
              <Badge
                variant="outline"
                className={`px-3 py-1.5 text-sm font-medium ${getStatusBadge(order.status)}`}
              >
                {order.status === "SentToSupplier" && order.expectedDeliveryDate
                  ? t("Delivery Confirmed")
                  : t(formatPascalCase(order.status))}
              </Badge>

              {/* BADGE REVISION */}
              {order.revisionNumber > 1 && (
                <Badge
                  variant="outline"
                  className="px-3 py-1.5 text-sm font-medium bg-amber-50 text-amber-700 border-amber-200"
                >
                  {t("Revision")} #{order.revisionNumber}
                </Badge>
              )}

              {order.status === "AdminApproved" && (
                <Button
                  onClick={handleSendToSupplier}
                  disabled={isSending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm ml-2"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {t("Send to Supplier")}
                </Button>
              )}

              {order.status === "SentToSupplier" &&
                !order.expectedDeliveryDate && (
                  <Button
                    onClick={() => setIsConfirmDeliveryModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ml-2"
                  >
                    <CalendarDays className="w-4 h-4 mr-2" />
                    {t("Confirm Delivery")}
                  </Button>
                )}

              {order.expectedDeliveryDate && (
                <Badge
                  variant="outline"
                  className="px-3 py-1.5 text-sm font-medium bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  <CalendarDays className="w-4 h-4 mr-2" />
                  {t("Expected")}: {formatDateTime(order.expectedDeliveryDate)}
                </Badge>
              )}

              {isRejected && (
                <Button
                  onClick={handleRecreatePO}
                  disabled={isRecreating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm ml-2"
                >
                  {isRecreating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {t("Recreate PO")}
                </Button>
              )}
            </div>
          </div>

          {/* HIỂN THỊ KHUNG CẢNH BÁO LÝ DO TỪ CHỐI */}
          {isRejected && order.rejectionReason && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-rose-900">
                  {t("Order Rejected")}
                </p>
                <p className="text-sm text-rose-700 leading-relaxed">
                  <span className="font-medium">{t("Reason")}:</span>{" "}
                  {order.rejectionReason}
                </p>
              </div>
            </div>
          )}

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent>
              <div className="relative mx-auto px-4">
                <div className="absolute left-[12.5%] right-[12.5%] top-5 h-1 bg-slate-200 z-10 rounded-full" />
                <div
                  className="absolute left-[12.5%] top-5 h-1 rounded-full z-10 transition-all duration-500 overflow-hidden bg-indigo-600"
                  style={{
                    width: order.sentToSupplierAt
                      ? "75%"
                      : order.adminApprovedAt || isAdminRejected
                        ? "50%"
                        : order.accountantApprovedAt || isAccountantRejected
                          ? "25%"
                          : "0%",
                  }}
                >
                  {!isRejected && (
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/70 to-transparent animate-shimmer-slide" />
                  )}
                </div>

                <div className="flex justify-between w-full">
                  <div className="flex flex-col items-center relative z-10 w-1/4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm bg-indigo-600 text-white transition-colors">
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="text-center mt-3 bg-white px-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {t("Draft Created")}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDateTime(order.createdAt)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {order.createdByName}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center relative z-10 w-1/4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors ${
                        isAccountantRejected
                          ? "bg-red-500 text-white"
                          : order.accountantApprovedAt
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {isAccountantRejected ? (
                        <X className="w-5 h-5" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-center mt-3 bg-white px-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {isAccountantRejected
                          ? t("Rejected")
                          : t("Accountant Reviewed")}
                      </p>
                      {order.accountantApprovedAt || isAccountantRejected ? (
                        <>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {formatDateTime(order.accountantApprovedAt)}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">
                          {t("Pending")}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {order.accountantApprovedByName}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center relative z-10 w-1/4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors ${
                        isAdminRejected
                          ? "bg-red-500 text-white"
                          : order.adminApprovedAt
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {isAdminRejected ? (
                        <X className="w-5 h-5" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-center mt-3 bg-white px-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {isAdminRejected ? t("Rejected") : t("Admin Approved")}
                      </p>
                      {order.adminApprovedAt || isAdminRejected ? (
                        <>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {formatDateTime(order.adminApprovedAt)}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">
                          {t("Pending")}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {order.adminApprovedByName}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center relative z-10 w-1/4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors ${
                        order.sentToSupplierAt
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="text-center mt-3 bg-white px-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {t("Sent to Supplier")}
                      </p>
                      {order.sentToSupplierAt ? (
                        <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
                          {formatDateTime(order.sentToSupplierAt)}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">
                          {t("Pending")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* THÔNG TIN CHUNG (CỘT TRÁI) */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-indigo-200 shadow-sm bg-indigo-50/50 p-0">
                <CardContent className="p-5 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-1">
                    <Calculator className="w-5 h-5" />
                    {t("Total Amount")}
                  </div>
                  <div className="text-3xl font-bold text-slate-900 truncate">
                    {formatCurrency(order.totalAmount)}
                  </div>
                  <p className="text-xs text-slate-500">
                    {t("Includes all items in this order.")}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-white gap-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    {t("Order Information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5 pb-0">
                  <div className="space-y-1 flex flex-col">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Supplier")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      {order.supplierName}
                    </div>
                  </div>

                  <div className="space-y-1 flex flex-col">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Destination Project")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <Construction className="w-3.5 h-3.5 text-slate-500" />
                      {order.projectName}
                    </div>
                  </div>

                  {order.requestId && (
                    <div className="space-y-1 flex flex-col">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {t("Source PR")}
                      </span>
                      <div
                        className="flex items-center gap-2 text-slate-800 font-medium cursor-pointer hover:text-indigo-600 transition-colors underline"
                        onClick={() => {
                          router.push(
                            "/purchasing/purchase-request/" + order.requestId,
                          );
                        }}
                      >
                        <Ticket className="w-3.5 h-3.5 text-slate-500" />
                        {order.requestCode}
                      </div>
                    </div>
                  )}

                  {/* HIỂN THỊ REVISION NOTE NẾU CÓ */}
                  {order.revisionNote && (
                    <div className="space-y-1 pt-3 border-t border-slate-100">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {t("Revision Note")}
                      </span>
                      <div className="text-sm text-slate-700 bg-indigo-50/50 p-2 rounded-md italic">
                        "{order.revisionNote}"
                      </div>
                    </div>
                  )}

                  {order.expectedDeliveryDate && (
                    <div className="space-y-1 pt-3 border-t border-slate-100">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {t("Expected Delivery")}
                      </span>
                      <div className="flex items-center gap-2 text-emerald-600 font-medium">
                        <CalendarDays className="w-4 h-4 text-emerald-500" />
                        {formatDateTime(order.expectedDeliveryDate)}
                      </div>
                    </div>
                  )}

                  {order.supplierNote && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {t("Supplier Note")}
                      </span>
                      <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded-md italic">
                        "{order.supplierNote}"
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* CHI TIẾT ĐƠN HÀNG (CỘT PHẢI) */}
            <div className="lg:col-span-2">
              <Card className="border-slate-200 shadow-sm bg-white min-h-[400px] flex flex-col gap-0">
                <CardHeader className="border-b border-slate-100 py-5 flex flex-row items-center justify-between pt-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 py-2">
                    <Package className="w-5 h-5 text-indigo-600" />
                    {t("Order Details")}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-white text-slate-700 border-slate-200"
                  >
                    {order.items?.length || 0} {t("Items")}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0">
                        <TableRow>
                          <TableHead className="w-[5%] pl-6">#</TableHead>
                          <TableHead className="w-[40%]">
                            {t("Material")}
                          </TableHead>
                          <TableHead className="w-[15%] text-center">
                            {t("Quantity")}
                          </TableHead>
                          <TableHead className="w-[20%] text-right">
                            {t("Unit Price")}
                          </TableHead>
                          <TableHead className="w-[20%] text-right pr-6">
                            {t("Subtotal")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, index) => (
                            <TableRow
                              key={item.itemId}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <TableCell className="pl-6 text-slate-500 font-medium">
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col text-left">
                                  <span className="font-semibold text-slate-800">
                                    {item.materialName}
                                  </span>
                                  <span className="text-xs text-slate-500 mt-0.5 font-mono">
                                    {item.materialCode}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                                  {item.orderedQuantity.toLocaleString("vi-VN")}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-slate-600 text-sm font-medium">
                                {formatCurrency(item.unitPrice)}
                              </TableCell>
                              <TableCell className="pr-6 text-right font-bold text-slate-800">
                                {formatCurrency(item.lineTotal)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="h-32 text-center text-slate-500"
                            >
                              {t("No items found.")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Dialog
        open={isConfirmDeliveryModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsConfirmDeliveryModalOpen(false);
            setExpectedDeliveryDate(undefined);
            setSupplierNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-0 shadow-lg">
          <DialogHeader className="pt-5 pb-4 px-6 border-b border-slate-100 bg-white">
            <DialogTitle className="text-slate-800 flex items-center gap-2 text-lg">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
              {t("Confirm Supplier Delivery")}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-5 bg-white">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {t("Expected Delivery Date")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <DateTimePicker
                value={expectedDeliveryDate}
                onChange={setExpectedDeliveryDate}
                placeholder={t("Select date and time...")}
                disablePastDates
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {t("Supplier Note (Optional)")}
              </label>
              <Textarea
                placeholder={t(
                  "Enter any notes or conditions from the supplier...",
                )}
                className="min-h-[100px] resize-none focus-visible:ring-indigo-600"
                value={supplierNote}
                onChange={(e) => setSupplierNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsConfirmDeliveryModalOpen(false);
                setExpectedDeliveryDate(undefined);
                setSupplierNote("");
              }}
              className="text-slate-600"
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleConfirmDelivery}
              disabled={isConfirmingDelivery}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isConfirmingDelivery && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {t("Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
