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
  Info,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
} from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { showConfirmToast } from "@/hooks/confirm-toast";

interface ReceiveItemInput {
  materialId: number;
  materialCode: string;
  materialName: string;
  orderedQuantity: number;
  actualQuantity: number;
  passQuantity: number;
  failQuantity: number;
  failReason: string;
}

export default function ReceiveGoodsPage({ role = "staff" }: { role: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const rolePath = role === "manager" ? "manager" : "staff";

  const poIdParam = searchParams.get("poId");
  const supIdParam = searchParams.get("supId");

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<ReceiveItemInput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!poIdParam && !supIdParam) {
      toast.error(t("No Purchase Order or Supplementary selected."));
      router.push(`/${rolePath}/pending-pos`);
      return;
    }

    const fetchOrderDetails = async () => {
      setIsLoading(true);
      try {
        let orderData;

        if (supIdParam) {
          // GỌI API CHO SUPPLEMENTARY NẾU CÓ supId
          const res =
            await staffReceiptsApi.getPendingSupplementaryReceiptDetail(
              Number(supIdParam),
            );
          orderData = res.data;
        } else {
          const res = await purchasingPurchaseOrderApi.getOrder(
            Number(poIdParam),
          );
          orderData = res.data;
        }

        setOrder(orderData);

        if (orderData.items) {
          const mappedItems: ReceiveItemInput[] = orderData.items.map(
            (i: any) => ({
              materialId: i.materialId,
              materialCode: i.materialCode || "",
              materialName: i.materialName,
              orderedQuantity:
                i.orderedQuantity || i.supplementaryQuantity || 0,
              actualQuantity: i.orderedQuantity || i.supplementaryQuantity || 0,
              passQuantity: i.orderedQuantity || i.supplementaryQuantity || 0,
              failQuantity: 0,
              failReason: "",
            }),
          );
          setItems(mappedItems);
        }
      } catch (error: any) {
        console.error("Failed to fetch order details", error);
        toast.error(
          error.response?.data?.message || t("Order details not found."),
        );
        router.push(`/${rolePath}/pending-pos`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [poIdParam, supIdParam, router, t]);

  const handleActualChange = (id: number, val: string) => {
    const num = Math.max(0, Number(val) || 0);
    setItems((prev) =>
      prev.map((item) => {
        if (item.materialId === id) {
          const targetQuantity = Math.min(item.orderedQuantity, num);
          const fail = Math.max(0, targetQuantity - num);

          return {
            ...item,
            actualQuantity: num,
            passQuantity: num,
            failQuantity: fail,
            failReason:
              fail > 0 || num < item.orderedQuantity ? item.failReason : "",
          };
        }
        return item;
      }),
    );
  };

  const handlePassChange = (id: number, val: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.materialId === id) {
          const pass = Math.min(
            item.actualQuantity,
            Math.max(0, Number(val) || 0),
          );

          const targetQuantity = Math.min(
            item.orderedQuantity,
            item.actualQuantity,
          );
          const fail = Math.max(0, targetQuantity - pass);

          const needsReason =
            fail > 0 || item.actualQuantity < item.orderedQuantity;

          return {
            ...item,
            passQuantity: pass,
            failQuantity: fail,
            failReason: needsReason ? item.failReason : "",
          };
        }
        return item;
      }),
    );
  };

  const handleReasonChange = (id: number, val: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.materialId === id ? { ...item, failReason: val } : item,
      ),
    );
  };

  const handleSubmit = () => {
    if (items.length === 0) {
      return toast.error(t("There are no items to receive."));
    }

    const invalidReasonItem = items.find(
      (i) =>
        (i.failQuantity > 0 || i.actualQuantity < i.orderedQuantity) &&
        !i.failReason.trim(),
    );

    if (invalidReasonItem) {
      return toast.error(
        t("Please provide a reason for items with failed/mismatched quantity."),
      );
    }

    showConfirmToast({
      title: t("Finalize Receiving & QC?"),
      description: t(
        "Are you sure you want to finalize the receiving and Quality Control check for these items?",
      ),
      confirmLabel: t("Yes, Submit"),
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const payload: any = {
            items: items.map((i) => {
              const isFailed =
                i.failQuantity > 0 || i.actualQuantity < i.orderedQuantity;

              return {
                materialId: i.materialId,
                orderedQuantity: Number(i.orderedQuantity.toFixed(3)),
                actualQuantity: Number(i.actualQuantity.toFixed(3)),
                passQuantity: Number(i.passQuantity.toFixed(3)),
                failQuantity: Number(i.failQuantity.toFixed(3)),
                failReason: isFailed ? i.failReason.trim() : undefined,
                result: isFailed ? "Fail" : "Pass",
              };
            }),
          };

          if (supIdParam) {
            payload.supplementaryReceiptId = Number(supIdParam);
            payload.purchaseOrderId = Number(poIdParam);
          } else {
            payload.purchaseOrderId = Number(poIdParam);
          }

          const res =
            await staffReceiptsApi.receiveGoodsFromPurchaseOrder(payload);

          const hasFailedItems =
            res.data.failedItems && res.data.failedItems.length > 0;

          if (hasFailedItems) {
            toast.warning(
              t(
                "Receipt created with failed items. Please proceed with Incident Report.",
              ),
            );
            if (role == "staff")
              router.push(
                `/${rolePath}/incident-reports/${res.data.receiptId}`,
              );
            else if (role == "manager")
              router.push(
                `/${rolePath}/incident-reports/staff-portal/${res.data.receiptId}`,
              );
          } else {
            toast.success(t("Receipt and QC completed successfully!"));

            if (role == "staff")
              router.push(
                `/${rolePath}/inbound-requests/${res.data.receiptId}/putaway`,
              );
            else if (role == "manager")
              router.push(
                `/${rolePath}/inbound-requests/staff-portal/${res.data.receiptId}/putaway`,
              );
          }
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
        <Header title={t("Receive & QC Goods")} />

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
                  {supIdParam
                    ? t("Supplementary Receipt")
                    : t("Inbound Receipt")}
                  <Badge
                    variant="outline"
                    className="bg-indigo-50 text-indigo-700 border-indigo-200 ml-2"
                  >
                    PO #{order.purchaseOrderCode || order.poCode}
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
              {t("Complete Receiving & QC")}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* THÔNG TIN PO (CỘT TRÁI) */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white gap-0">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pt-2">
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
                  <div className="space-y-1 pt-4 border-t border-slate-100">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Supplier Note")}
                    </span>
                    <p className="text-sm text-slate-600 p-2 rounded-md italic bg-slate-50 border border-slate-100">
                      "{order.supplierNote}"
                    </p>
                  </div>
                  {order.originalFailReason && (
                    <div className="space-y-1 pt-4 border-t border-slate-100">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {t("Incident Note")}
                      </span>
                      <p className="text-sm text-slate-600 p-2 rounded-md italic bg-slate-50 border border-slate-100">
                        "{order.originalFailReason}"
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-indigo-900">
                    {t("Receiving & QC Workflow")}
                  </p>
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    {t(
                      "Please count the actual goods received and perform the Quality Control (QC) check directly. Passed items will proceed to Putaway, while failed items will require an Incident Report.",
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* BẢNG ĐẾM HÀNG VÀ QC (CỘT PHẢI) */}
            <div className="lg:col-span-3">
              <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] flex flex-col gap-0">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pt-2">
                      <PackageCheck className="w-5 h-5 text-indigo-600" />
                      {t("Goods Details & QC Results")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[25%] pl-6">
                            {t("Material Details")}
                          </TableHead>
                          <TableHead className="w-[10%] text-center">
                            {supIdParam ? t("Supplemented") : t("Ordered")}
                          </TableHead>
                          <TableHead className="w-[15%] text-center">
                            {t("Received")} *
                          </TableHead>
                          <TableHead className="w-[15%] text-center">
                            {t("Pass")} *
                          </TableHead>
                          <TableHead className="w-[10%] text-center">
                            {t("Fail")}
                          </TableHead>
                          <TableHead className="w-[25%] pr-6">
                            {t("Fail Reason")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow
                            key={item.materialId}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <TableCell className="pl-6 align-top py-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800">
                                  {item.materialName}
                                </span>
                                {item.materialCode && (
                                  <span className="text-xs text-slate-400 font-mono mt-0.5">
                                    {item.materialCode}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-center pt-5 flex align-center justify-center">
                              <span className="font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                                {item.orderedQuantity.toLocaleString("vi-VN")}
                              </span>
                            </TableCell>

                            {/* CỘT ACTUAL QUANTITY */}
                            <TableCell className="align-top pt-4">
                              <Input
                                type="number"
                                min="0"
                                className="w-full text-center focus-visible:ring-indigo-600 font-semibold"
                                value={item.actualQuantity}
                                onChange={(e) =>
                                  handleActualChange(
                                    item.materialId,
                                    e.target.value
                                      .replace(/-/g, "")
                                      .slice(0, 12),
                                  )
                                }
                              />
                            </TableCell>

                            {/* CỘT PASS QUANTITY */}
                            <TableCell className="align-top pt-4">
                              <Input
                                type="number"
                                min="0"
                                max={item.actualQuantity}
                                className="w-full text-center focus-visible:ring-emerald-500 font-semibold text-emerald-700"
                                value={item.passQuantity}
                                onChange={(e) =>
                                  handlePassChange(
                                    item.materialId,
                                    e.target.value
                                      .replace(/-/g, "")
                                      .slice(0, 12),
                                  )
                                }
                              />
                            </TableCell>

                            {/* CỘT FAIL QUANTITY (Tự động tính) */}
                            <TableCell className="align-top text-center pt-6">
                              <span
                                className={`font-bold ${
                                  item.failQuantity > 0
                                    ? "text-rose-600"
                                    : "text-slate-400"
                                }`}
                              >
                                {item.failQuantity.toFixed(3)}
                              </span>
                            </TableCell>

                            {/* CỘT FAIL REASON */}
                            <TableCell className="align-top pt-4 pr-6">
                              {item.failQuantity > 0 ||
                              item.actualQuantity < item.orderedQuantity ? (
                                <Input
                                  placeholder={t(
                                    "Reason for failed or missing items...",
                                  )}
                                  className="w-full focus-visible:ring-rose-500 border-rose-200 bg-rose-50/50"
                                  value={item.failReason}
                                  onChange={(e) =>
                                    handleReasonChange(
                                      item.materialId,
                                      e.target.value,
                                    )
                                  }
                                />
                              ) : (
                                <span className="text-slate-300 text-sm flex h-9 items-center justify-center italic bg-slate-50 rounded-md border border-dashed border-slate-200">
                                  {t("N/A")}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
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
