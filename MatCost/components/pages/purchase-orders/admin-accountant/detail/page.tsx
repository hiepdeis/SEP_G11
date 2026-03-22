"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Loader2,
  Calculator,
  Check,
  X,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
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
import { Textarea } from "@/components/ui/textarea";
import {
  accountantPurchaseOrderApi,
  adminPurchaseOrderApi,
  PurchaseOrderReviewResponse,
} from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { formatPascalCase } from "@/lib/format-pascal-case";
import { showConfirmToast } from "@/hooks/confirm-toast";

export default function PurchaseOrderReviewPage({ role = "accountant" }) {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();

  const id = Number(params.id);

  const [data, setData] = useState<PurchaseOrderReviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchReviewDetail = async () => {
    setIsLoading(true);
    try {
      const res = await accountantPurchaseOrderApi.getReview(id);
      setData(res.data);
    } catch (error: any) {
      console.error("Failed to fetch review details", error);
      toast.error(
        error.response?.data?.message || t("Purchase order not found"),
      );
      router.push("/accountant/purchase-orders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchReviewDetail();
  }, [id, router, t]);

  const handleApprove = () => {
    const isAccountant = role === "accountant";

    showConfirmToast({
      title: isAccountant
        ? t("Approve Pricing?")
        : t("Approve Purchase Order?"),
      description: isAccountant
        ? t("Are you sure you want to approve the pricing for this order?")
        : t("Are you sure you want to approve this purchase order?"),
      confirmLabel: t("Yes, Approve"),
      onConfirm: async () => {
        setIsApproving(true);
        try {
          if (isAccountant) {
            await accountantPurchaseOrderApi.approve(id);
            toast.success(t("Pricing approved successfully by Accountant."));
          } else {
            await adminPurchaseOrderApi.approve(id);
            toast.success(t("Purchase Order approved successfully by Admin."));
          }

          await fetchReviewDetail();
        } catch (error: any) {
          console.error(error);
          toast.error(error.response?.data?.message || t("Failed to approve."));
        } finally {
          setIsApproving(false);
        }
      },
    });
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error(t("Please provide a reason for rejection."));
      return;
    }
    setIsRejecting(true);
    try {
      if (role === "accountant") {
        await accountantPurchaseOrderApi.reject(id, { reason: rejectReason });
      } else {
        await adminPurchaseOrderApi.reject(id, { reason: rejectReason });
      }
      toast.success(t("Purchase order rejected successfully."));
      setRejectModalOpen(false);
      setRejectReason("");

      await fetchReviewDetail();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error.response?.data?.message || t("Failed to reject purchase order."),
      );
    } finally {
      setIsRejecting(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (val?: number | null) => {
    if (val == null) return "0 ₫";
    return val.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "AdminPending":
      case "AccountantApproved":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "AdminApproved":
      case "SentToSupplier":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">
            {t("Loading review details...")}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { order, review } = data;
  const isAccountantRejected = order.status === "AccountantRejected";
  const isAdminRejected = order.status === "AdminRejected";

  const showAccountantActions =
    role === "accountant" && order.status === "Draft";
  const showAdminActions =
    role === "admin" &&
    (order.status === "AccountantApproved" || order.status === "AdminPending");

  const totalPages = Math.ceil(review.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = review.slice(startIndex, endIndex);

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Price Review")} #${order.purchaseOrderCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6 mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back")}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500">
                {t("Status")}:
              </span>
              <Badge
                variant="outline"
                className={`px-3 py-1.5 text-sm font-medium ${getStatusBadge(order.status)}`}
              >
                {t(formatPascalCase(order.status))}
              </Badge>

              {(showAccountantActions || showAdminActions) && (
                <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
                  <Button
                    variant="outline"
                    onClick={() => setRejectModalOpen(true)}
                    disabled={isApproving || isRejecting}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    {t("Reject")}
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving || isRejecting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    {isApproving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    {role === "accountant"
                      ? t("Approve Pricing")
                      : t("Approve")}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* HORIZONTAL TIMELINE */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent>
              <div className="relative mx-auto px-4">
                <div className="absolute left-[12.5%] right-[12.5%] top-5 h-1 bg-slate-200 z-10 rounded-full" />

                <div
                  className={`absolute left-[12.5%] top-5 h-1 rounded-full z-10 transition-all duration-500 overflow-hidden ${
                    order.status === "Rejected" ? "bg-red-500" : "bg-indigo-600"
                  }`}
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
                  {order.status !== "Rejected" && (
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
                        {formatDate(order.createdAt)}
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
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatDate(order.accountantApprovedAt)}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">
                          {t("Pending")}
                        </p>
                      )}
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
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatDate(order.adminApprovedAt)}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">
                          {t("Pending")}
                        </p>
                      )}
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
                          {formatDate(order.sentToSupplierAt)}
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

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* THÔNG TIN CHUNG (CỘT TRÁI) */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-indigo-200 shadow-sm bg-indigo-50/50">
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-1">
                    <Calculator className="w-5 h-5" />
                    {t("PO Total Amount")}
                  </div>
                  <div className="text-3xl font-bold text-slate-900 truncate">
                    {formatCurrency(order.totalAmount)}
                  </div>
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
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Supplier")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {order.supplierName}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Destination Project")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {order.projectName}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Created By")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      ID: {order.createdBy}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Nếu đã bị Reject, hiển thị luôn lý do ra ngoài thẻ */}
              {(isAccountantRejected || isAdminRejected) && (
                <Card className="border-rose-200 shadow-sm bg-rose-50 p-0">
                  <CardContent className="p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-rose-700 font-semibold mb-1">
                      <AlertCircle className="w-5 h-5" />
                      {t("Rejection Reason")}
                    </div>
                    <p className="text-sm text-slate-700">
                      {t(
                        "This PO was rejected and returned to Purchasing. Please check notes for details.",
                      )}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* BẢNG SO SÁNH GIÁ (CỘT PHẢI) */}
            <div className="lg:col-span-3">
              <Card className="border-slate-200 shadow-sm bg-white min-h-[400px] flex flex-col gap-0">
                <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                      <Calculator className="w-5 h-5 text-indigo-600" />
                      {t("Price Variance Review")}
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-1">
                      {t(
                        "Compare proposed PO price against standard quotation price.",
                      )}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-white text-slate-700 border-slate-200"
                  >
                    {review.length} {t("Items")}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0">
                        <TableRow>
                          <TableHead className="w-[30%] pl-6">
                            {t("Material")}
                          </TableHead>
                          <TableHead className="w-[15%] text-right">
                            {t("Quote Price")}
                          </TableHead>
                          <TableHead className="w-[15%] text-right">
                            {t("PO Price")}
                          </TableHead>
                          <TableHead className="w-[20%] text-right">
                            {t("Variance")} (VND)
                          </TableHead>
                          <TableHead className="w-[20%] text-right pr-6">
                            {t("Variance")} %
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedItems.map((item, index) => {
                          const isOver = item.variance > 0;
                          const isUnder = item.variance < 0;

                          return (
                            <TableRow
                              key={index}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <TableCell className="pl-6 font-semibold text-slate-800">
                                {item.materialName}
                              </TableCell>
                              <TableCell className="text-right text-slate-500">
                                {formatCurrency(item.quotationPrice)}
                              </TableCell>
                              <TableCell className="text-right font-medium text-slate-800">
                                {formatCurrency(item.poUnitPrice)}
                              </TableCell>
                              <TableCell
                                className={`text-right font-bold ${isOver ? "text-rose-600" : isUnder ? "text-emerald-600" : "text-slate-400"}`}
                              >
                                <div className="flex items-center justify-end gap-1.5">
                                  {isOver && (
                                    <TrendingUp className="w-3.5 h-3.5" />
                                  )}
                                  {isUnder && (
                                    <TrendingDown className="w-3.5 h-3.5" />
                                  )}
                                  {item.variance > 0 ? "+" : ""}
                                  {formatCurrency(item.variance)}
                                </div>
                              </TableCell>
                              <TableCell className="pr-6 text-right">
                                {item.variancePercent != null ? (
                                  <Badge
                                    variant="outline"
                                    className={`
                                    ${
                                      isOver
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : isUnder
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-slate-100 text-slate-600 border-slate-200"
                                    }
                                  `}
                                  >
                                    {item.variancePercent > 0 ? "+" : ""}~{" "}
                                    {item.variancePercent.toFixed(3)}%
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {review.length > itemsPerPage && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-white mt-auto rounded-b-xl">
                      <div className="text-sm text-slate-500">
                        {t("Showing")}{" "}
                        <span className="font-medium text-slate-900">
                          {startIndex + 1}
                        </span>{" "}
                        {t("to")}{" "}
                        <span className="font-medium text-slate-900">
                          {Math.min(endIndex, review.length)}
                        </span>{" "}
                        {t("of")}{" "}
                        <span className="font-medium text-slate-900">
                          {review.length}
                        </span>{" "}
                        {t("items")}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" /> {t("Prev")}
                        </Button>
                        <div className="text-sm font-medium text-slate-600 px-2">
                          {t("Page")} {currentPage} {t("of")} {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                        >
                          {t("Next")} <ChevronRight className="w-4 h-4 ml-1" />
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

      {/* MODAL NHẬP LÝ DO REJECT */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <Card className="w-full max-w-md shadow-lg border-0 animate-in zoom-in-95 duration-200 gap-0">
            <CardHeader className="rounded-t-xl pt-2">
              <CardTitle className="text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {t(`Reject Purchase Order`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-slate-800">
                {t(
                  "Please provide a reason for rejecting this PO. This will be sent back to the Purchasing department.",
                )}
              </p>
              <Textarea
                placeholder={t("Enter rejection reason here...")}
                className="min-h-[100px] resize-none focus-visible:ring-rose-500"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-3 pt-2 p-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectReason("");
                }}
                className="text-slate-600"
              >
                {t("Cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isRejecting}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {isRejecting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {t("Confirm Reject")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
