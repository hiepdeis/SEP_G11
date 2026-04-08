"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Save,
  Loader2,
  PackagePlus,
  FileText,
  Calculator,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  History,
  Clock,
  XCircle,
  Hash,
  Construction,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  purchasingPurchaseOrderApi,
  purchasingPurchaseRequestApi,
  PurchaseOrderDto,
  PurchaseOrderHistoryItemDto,
} from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { showConfirmToast } from "@/hooks/confirm-toast";
import { formatPascalCase } from "@/lib/format-pascal-case";

interface OrderItemInput {
  id: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  orderedQuantity: string;
  unitPrice: string;
  supplierId: string;
}

export default function RecreatePurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const parentPOIdParam = searchParams.get("parentPOId");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [originalOrder, setOriginalOrder] = useState<PurchaseOrderDto | null>(
    null,
  );
  const [suppliers, setSuppliers] = useState<
    { supplierId: number; name: string; materialIds: number[] }[]
  >([]);
  const [poHistory, setPoHistory] = useState<PurchaseOrderHistoryItemDto[]>([]);

  const [globalSupplierId, setGlobalSupplierId] = useState<string>("");
  const [revisionNote, setRevisionNote] = useState<string>("");
  const [items, setItems] = useState<OrderItemInput[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!parentPOIdParam) {
        toast.error(t("Missing Parent PO ID. Cannot recreate order."));
        router.push("/purchasing/purchase-orders");
        return;
      }

      setIsLoadingData(true);
      try {
        const [suppliersRes, poRes] = await Promise.all([
          purchasingPurchaseOrderApi.getSuppliers(),
          purchasingPurchaseOrderApi.getOrder(Number(parentPOIdParam)),
        ]);

        setSuppliers(suppliersRes.data);
        const po = poRes.data;
        setOriginalOrder(po);

        const defaultSupplierStr = po.supplierId?.toString() || "";
        setGlobalSupplierId(defaultSupplierStr);

        const mappedItems: OrderItemInput[] = (po.items || []).map((i) => ({
          id: crypto.randomUUID(),
          materialId: i.materialId,
          materialCode: i.materialCode,
          materialName: i.materialName,
          orderedQuantity: i.orderedQuantity.toString(),
          unitPrice: i.unitPrice?.toString() || "",
          supplierId: defaultSupplierStr,
        }));
        setItems(mappedItems);

        if (po.requestId) {
          setIsLoadingHistory(true);
          try {
            const historyRes = await purchasingPurchaseRequestApi.getPoHistory(
              po.requestId,
            );
            setPoHistory(historyRes.data.poChain || []);
          } catch (error) {
            console.error("Failed to load PO history", error);
            setPoHistory([]);
          } finally {
            setIsLoadingHistory(false);
          }
        }
      } catch (error) {
        console.error("Failed to load original PO data", error);
        toast.error(t("Failed to load original PO data."));
        router.back();
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchInitialData();
  }, [parentPOIdParam, router, t]);

  const handleItemChange = (
    id: string,
    field: keyof OrderItemInput,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );

    if (field === "supplierId") {
      setGlobalSupplierId("");
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
  };

  const formatDateTime = (dateString?: string | null) => {
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

  const handleSubmit = () => {
    if (!originalOrder?.requestId) {
      return toast.error(t("Original order is missing Request ID mapping."));
    }

    if (items.length === 0) {
      return toast.error(t("Order must have at least one item."));
    }

    const invalidItem = items.find(
      (i) => !i.orderedQuantity || Number(i.orderedQuantity) <= 0,
    );
    if (invalidItem) {
      return toast.error(
        t("Please enter a valid ordered quantity for all items."),
      );
    }

    const missingSupplier = items.find((i) => !i.supplierId);
    if (missingSupplier) {
      return toast.error(t("Please assign a supplier for all items."));
    }

    const missingUnitPrice = items.find((i) => !i.unitPrice);
    if (missingUnitPrice) {
      return toast.error(t("Please assign a unit price for all items."));
    }

    if (!revisionNote.trim()) {
      return toast.error(
        t("Please provide a revision note explaining the changes."),
      );
    }

    showConfirmToast({
      title: t("Recreate Purchase Order?"),
      description: t(
        "Are you sure you want to submit this revised Purchase Order?",
      ),
      confirmLabel: t("Yes, Submit Revision"),
      onConfirm: async () => {
        setIsSubmitting(true);

        try {
          const payload = {
            requestId: Number(originalOrder.requestId),
            supplierId: globalSupplierId ? Number(globalSupplierId) : undefined,
            parentPOId: Number(parentPOIdParam),
            revisionNote: revisionNote.trim(),
            items: items.map((i) => ({
              materialId: i.materialId,
              orderedQuantity: Number(i.orderedQuantity),
              unitPrice: i.unitPrice ? Number(i.unitPrice) : undefined,
              supplierId: Number(i.supplierId),
            })),
          };

          await purchasingPurchaseOrderApi.createDraft(payload);
          toast.success(t("Revised Purchase Order submitted successfully!"));
          router.push("/purchasing/purchase-orders");
        } catch (error: any) {
          console.error(error);
          toast.error(
            error.response?.data?.message ||
              t("Failed to create Purchase Order."),
          );
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const calculateTotal = () => {
    return items.reduce((acc, curr) => {
      const qty = Number(curr.orderedQuantity) || 0;
      const price = Number(curr.unitPrice) || 0;
      return acc + qty * price;
    }, 0);
  };

  const handleGlobalSupplierChange = (val: string) => {
    setGlobalSupplierId(val);
    setItems((prev) => prev.map((item) => ({ ...item, supplierId: val })));
  };

  if (isLoadingData) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const requiredMaterialIds = Array.from(
    new Set(items.map((item) => item.materialId)),
  );

  const capableSuppliers = suppliers.filter((supplier) => {
    if (!supplier.materialIds || supplier.materialIds.length === 0)
      return false;

    return requiredMaterialIds.every((reqId) =>
      supplier.materialIds.includes(reqId),
    );
  });

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Recreate Purchase Order")} />

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
                  <RefreshCw className="w-6 h-6 text-indigo-600" />
                  {t("Recreate Rejected Order")}
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
                <Save className="w-4 h-4 mr-2" />
              )}
              {t("Submit Revised Order")}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* THÔNG TIN CHUNG (CỘT TRÁI) */}
            <div className="lg:col-span-1 space-y-6 flex flex-col">
              <Card className="border-slate-200 shadow-sm bg-white gap-0">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pt-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    {t("Original Order Info")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        {t("Rejected Order Code")}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-md px-3 py-1 text-rose-600 bg-rose-50 border-rose-200"
                      >
                        <Hash className="w-3.5 h-3.5 text-rose-500" />
                        {originalOrder?.purchaseOrderCode}
                      </Badge>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        {t("Source Request")}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-md px-3 py-1 text-indigo-600 bg-indigo-50 border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors"
                        onClick={() =>
                          router.push(
                            `/purchasing/purchase-request/${originalOrder?.requestId}`,
                          )
                        }
                      >
                        <Hash className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="underline">
                          {originalOrder?.requestCode ||
                            `PR ID: ${originalOrder?.requestId}`}
                        </span>
                      </Badge>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        {t("Project Name")}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-md px-3 py-1 text-slate-600 bg-slate-50 border-slate-200"
                      >
                        <Construction className="w-3.5 h-3.5 text-slate-500" />
                        {originalOrder?.projectName}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <label className="text-sm font-medium text-slate-700">
                      {t("Global Supplier")}
                    </label>
                    <Select
                      value={globalSupplierId}
                      onValueChange={handleGlobalSupplierChange}
                    >
                      <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                        <SelectValue
                          placeholder={t("Select to apply to all items...")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {capableSuppliers.length > 0 ? (
                          capableSuppliers.map((s) => (
                            <SelectItem
                              key={s.supplierId}
                              value={s.supplierId.toString()}
                            >
                              {s.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-3 text-sm text-rose-500 text-center italic bg-rose-50/50">
                            {t(
                              "No single supplier can provide all listed materials.",
                            )}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">
                      {t(
                        "Leave blank if you want to select different suppliers per item.",
                      )}
                    </p>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <label className="text-sm font-medium text-slate-700">
                      {t("Revision Note")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      placeholder={t(
                        "Explain the adjustments made (e.g., Updated unit price)...",
                      )}
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                      className="min-h-[80px] resize-none focus-visible:ring-indigo-600"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* THẺ LỊCH SỬ PO - Nằm dưới cùng cột trái */}
              {isLoadingHistory ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                poHistory.length > 0 && (
                  <Card className="border-slate-200 shadow-sm bg-white gap-0 flex-1 min-h-[300px] flex flex-col">
                    <CardHeader className="border-b border-slate-100 pb-4 shrink-0">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pt-2">
                        <History className="w-5 h-5 text-indigo-600" />
                        {t("PO Revision History")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 overflow-y-auto flex-1 relative">
                      <div className="space-y-6">
                        {poHistory
                          .filter(
                            (historyItem) =>
                              historyItem.status.includes("Rejected") &&
                              historyItem.poId === Number(parentPOIdParam),
                          )
                          .map((historyItem) => (
                            <div key={historyItem.poId}>
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                  <Badge
                                    variant="outline"
                                    className={
                                      historyItem.status.includes("Rejected")
                                        ? "text-rose-600 bg-rose-50 border-rose-200"
                                        : "text-slate-600 bg-slate-50"
                                    }
                                  >
                                    {formatPascalCase(historyItem.status)}
                                  </Badge>
                                </div>

                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDateTime(historyItem.createdAt)}
                                </div>

                                <div className="bg-slate-50 rounded-md p-3 text-sm space-y-2 border border-slate-100 mt-1">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">
                                      {t("Supplier")}:
                                    </span>
                                    <span
                                      className="font-medium text-slate-700 truncate max-w-[120px]"
                                      title={historyItem.supplierName}
                                    >
                                      {historyItem.supplierName}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">
                                      {t("Amount")}:
                                    </span>
                                    <span className="font-medium text-slate-700">
                                      {historyItem.totalAmount
                                        ? formatCurrency(
                                            historyItem.totalAmount,
                                          )
                                        : "N/A"}
                                    </span>
                                  </div>

                                  {historyItem.revisionNote && (
                                    <div className="pt-2 border-t border-slate-100">
                                      <span className="text-xs font-medium text-indigo-600 block mb-1">
                                        {t("Revision Note")}:
                                      </span>
                                      <p className="text-slate-600 text-xs italic">
                                        "{historyItem.revisionNote}"
                                      </p>
                                    </div>
                                  )}

                                  {historyItem.rejectionReason && (
                                    <div className="pt-2 border-t border-slate-100">
                                      <span className="text-xs font-medium text-rose-600 flex items-center gap-1 mb-1">
                                        <XCircle className="w-3 h-3" />{" "}
                                        {t("Rejection Reason")}:
                                      </span>
                                      <p className="text-rose-600 text-xs italic">
                                        "{historyItem.rejectionReason}"
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>

            {/* DANH SÁCH VẬT TƯ & ĐƠN GIÁ (CỘT PHẢI) */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] flex flex-col gap-0">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pt-2">
                    <PackagePlus className="w-5 h-5 text-indigo-600" />
                    {t("Order Details & Pricing")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                  <div className="overflow-x-auto flex-1">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[30%] pl-6">
                            {t("Material")}
                          </TableHead>
                          <TableHead className="w-[15%] text-center">
                            {t("Order Quantity")}
                          </TableHead>
                          <TableHead className="w-[15%]">
                            {t("Supplier")} *
                          </TableHead>
                          <TableHead className="w-[20%] text-right pr-6">
                            {t("Unit Price (VND)")} *
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="h-40 text-center text-slate-500"
                            >
                              {t("No items found in original order.")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedItems.map((item) => (
                            <TableRow
                              key={item.id}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <TableCell className="pl-6 align-top py-4">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800">
                                    {item.materialName}
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono mt-0.5">
                                    {item.materialCode}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="align-top py-5 text-center flex align-center justify-center">
                                <span className="font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                  {item.orderedQuantity}
                                </span>
                              </TableCell>
                              <TableCell className="align-top py-4">
                                <Select
                                  value={item.supplierId}
                                  onValueChange={(val) =>
                                    handleItemChange(item.id, "supplierId", val)
                                  }
                                >
                                  <SelectTrigger
                                    className={`w-full bg-white h-10 ${
                                      !item.supplierId
                                        ? "border-rose-300 ring-1 ring-rose-100"
                                        : "border-slate-200"
                                    }`}
                                  >
                                    <SelectValue placeholder={t("Select...")} />
                                  </SelectTrigger>
                                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                                    {suppliers
                                      .filter(
                                        (s) =>
                                          s.materialIds &&
                                          s.materialIds.includes(
                                            item.materialId,
                                          ),
                                      )
                                      .map((s) => (
                                        <SelectItem
                                          key={s.supplierId}
                                          value={s.supplierId.toString()}
                                        >
                                          {s.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="align-top text-right py-4 pr-6">
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  className="w-full text-right focus-visible:ring-indigo-600"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    handleItemChange(
                                      item.id,
                                      "unitPrice",
                                      e.target.value
                                        .replace(/-/g, "")
                                        .slice(0, 12),
                                    )
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {items.length > itemsPerPage && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-white mt-auto">
                      <div className="text-sm text-slate-500">
                        {t("Showing")}{" "}
                        <span className="font-medium text-slate-900">
                          {startIndex + 1}
                        </span>{" "}
                        {t("to")}{" "}
                        <span className="font-medium text-slate-900">
                          {Math.min(endIndex, items.length)}
                        </span>{" "}
                        {t("of")}{" "}
                        <span className="font-medium text-slate-900">
                          {items.length}
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
              <Card className="border-slate-200 shadow-sm bg-indigo-50/50 p-0">
                <CardContent className="p-5 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-1">
                    <Calculator className="w-5 h-5" />
                    {t("Estimated Total")}
                  </div>
                  <div className="text-3xl font-bold text-slate-900 truncate">
                    {formatCurrency(calculateTotal())}
                  </div>
                  <p className="text-xs text-slate-500">
                    {t("Based on entered unit prices.")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
