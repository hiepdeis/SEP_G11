"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Loader2,
  Building2,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  staffReceiptsApi,
  purchasingPurchaseOrderApi,
  PurchaseOrderDto,
} from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { showConfirmToast } from "@/hooks/confirm-toast";

interface ReceiveItemInput {
  materialId: number;
  materialCode: string;
  materialName: string;
  orderedQuantity: number;
  actualQuantity: string;
}

export default function ReceiveGoodsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const poIdParam = searchParams.get("poId");

  const [order, setOrder] = useState<PurchaseOrderDto | null>(null);
  const [items, setItems] = useState<ReceiveItemInput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!poIdParam) {
      toast.error(t("No Purchase Order selected."));
      router.push("/staff/receipts/pending-pos");
      return;
    }

    const fetchOrderDetails = async () => {
      setIsLoading(true);
      try {
        const res = await purchasingPurchaseOrderApi.getOrder(
          Number(poIdParam),
        );
        const orderData = res.data;
        setOrder(orderData);

        if (orderData.items) {
          const mappedItems = orderData.items.map((i) => ({
            materialId: i.materialId,
            materialCode: i.materialCode,
            materialName: i.materialName,
            orderedQuantity: i.orderedQuantity,
            actualQuantity: i.orderedQuantity.toString(),
          }));
          setItems(mappedItems);
        }
      } catch (error: any) {
        console.error("Failed to fetch PO details", error);
        toast.error(
          error.response?.data?.message || t("Purchase order not found."),
        );
        router.push("/staff/receipts/pending-pos");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [poIdParam, router, t]);

  const handleQuantityChange = (materialId: number, value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.materialId === materialId
          ? { ...item, actualQuantity: value }
          : item,
      ),
    );
  };

  const handleSetAllToOrdered = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        actualQuantity: item.orderedQuantity.toString(),
      })),
    );
  };

  const handleClearAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        actualQuantity: "",
      })),
    );
  };

  const handleSubmit = () => {
    const invalidItem = items.find(
      (i) => i.actualQuantity === "" || Number(i.actualQuantity) < 0,
    );

    if (invalidItem) {
      return toast.error(
        t("Please enter a valid quantity (>= 0) for all items."),
      );
    }

    const totalReceived = items.reduce(
      (sum, item) => sum + Number(item.actualQuantity),
      0,
    );
    if (totalReceived === 0) {
      return toast.error(
        t("You must receive at least 1 item to create a receipt."),
      );
    }

    const hasDiscrepancy = items.some(
      (i) => Number(i.actualQuantity) !== i.orderedQuantity,
    );

    showConfirmToast({
      title: t("Create Goods Receipt?"),
      description: hasDiscrepancy
        ? t(
            "There is a difference between the ordered quantity and actual received quantity. Are you sure you want to proceed? The receipt will be sent to QC.",
          )
        : t(
            "Are you sure you want to create a receipt for these items? They will be sent to QC for quality check.",
          ),
      confirmLabel: t("Yes, Create Receipt"),
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const payload = {
            purchaseOrderId: Number(poIdParam),
            items: items.map((i) => ({
              materialId: i.materialId,
              actualQuantity: Number(i.actualQuantity),
            })),
          };

          await staffReceiptsApi.receiveGoodsFromPurchaseOrder(payload);
          toast.success(
            t("Goods Receipt created successfully! Status: Pending QC."),
          );

          router.push("/staff/inbound-requests");
        } catch (error: any) {
          console.error(error);
          toast.error(
            error.response?.data?.message ||
              t("Failed to create goods receipt."),
          );
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("vi-VN");
  };

  if (isLoading || !order) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">{t("Loading order details...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Receive Goods")} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6 mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="pl-0 hover:bg-transparent hover:text-indigo-600"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  {t("Inbound Receipt")}
                  <Badge
                    variant="outline"
                    className="bg-indigo-50 text-indigo-700 border-indigo-200 ml-2"
                  >
                    PO #{order.purchaseOrderCode}
                  </Badge>
                </h1>
              </div>
            </div>

            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <PackageCheck className="w-4 h-4 mr-2" />
              )}
              {t("Create Receipt & Send to QC")}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* THÔNG TIN PO (CỘT TRÁI) */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white gap-0">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                    {t("Delivery Information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
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
                      {t("Expected Delivery")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      {formatDate(order.expectedDeliveryDate)}
                    </div>
                  </div>

                  {order.supplierNote && (
                    <div className="space-y-1 pt-4 border-t border-slate-100">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {t("Supplier Note")}
                      </span>
                      <p className="text-sm text-slate-600 bg-amber-50 p-2 rounded-md italic border border-amber-100">
                        {order.supplierNote}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Box Hướng dẫn */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-indigo-900">
                    {t("Next Step: QC Check")}
                  </p>
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    {t(
                      "Once this receipt is created, the items will be moved to the staging area and wait for Quality Control (QC) inspection. Stock will not be updated until QC is passed.",
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* BẢNG ĐẾM HÀNG THỰC TẾ (CỘT PHẢI) */}
            <div className="lg:col-span-3">
              <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] flex flex-col gap-0">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                      <PackageCheck className="w-5 h-5 text-indigo-600" />
                      {t("Actual Goods Received")}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearAll}
                        className="h-8 text-xs text-slate-600"
                      >
                        {t("Clear All")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSetAllToOrdered}
                        className="h-8 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                      >
                        {t("Match Ordered Quantity")}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[45%] pl-6">
                            {t("Material Details")}
                          </TableHead>
                          <TableHead className="w-[20%] text-center">
                            {t("Ordered Quantity")}
                          </TableHead>
                          <TableHead className="w-[25%] text-center">
                            {t("Actual Received Quantity")} *
                          </TableHead>
                          <TableHead className="w-[10%] text-center"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => {
                          const actualNum = Number(item.actualQuantity);
                          const isShortage =
                            item.actualQuantity !== "" &&
                            actualNum < item.orderedQuantity;
                          const isOverage =
                            item.actualQuantity !== "" &&
                            actualNum > item.orderedQuantity;
                          const isMatch =
                            item.actualQuantity !== "" &&
                            actualNum === item.orderedQuantity;

                          return (
                            <TableRow
                              key={item.materialId}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <TableCell className="pl-6 align-middle py-4">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800">
                                    {item.materialName}
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono mt-0.5">
                                    {item.materialCode}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell className="align-middle text-center">
                                <span className="font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                                  {item.orderedQuantity.toLocaleString("vi-VN")}
                                </span>
                              </TableCell>

                              <TableCell className="align-middle px-4">
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  className={`w-full text-center font-semibold text-lg focus-visible:ring-indigo-600 transition-colors ${
                                    isShortage
                                      ? "border-amber-300 bg-amber-50 text-amber-700"
                                      : isOverage
                                        ? "border-rose-300 bg-rose-50 text-rose-700"
                                        : isMatch
                                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                          : ""
                                  }`}
                                  value={item.actualQuantity}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      item.materialId,
                                      e.target.value.slice(0, 9),
                                    )
                                  }
                                />
                              </TableCell>

                              <TableCell className="align-middle text-center pr-4">
                                {isShortage && (
                                  <div
                                    className="flex justify-center"
                                    title={t(
                                      "Shortage: Receiving less than ordered",
                                    )}
                                  >
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                  </div>
                                )}
                                {isOverage && (
                                  <div
                                    className="flex justify-center"
                                    title={t(
                                      "Overage: Receiving more than ordered",
                                    )}
                                  >
                                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                                  </div>
                                )}
                                {isMatch && (
                                  <div
                                    className="flex justify-center"
                                    title={t("Match: Exact quantity")}
                                  >
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
