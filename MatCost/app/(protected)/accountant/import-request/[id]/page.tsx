"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  CalendarDays,
  MapPin,
  Building2,
  AlertTriangle,
  History,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
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
  receiptApi,
  ReceiptDetailDto,
  MaterialSuppliersDto,
  ReceiptRejectionHistoryDto,
} from "@/services/receipt-service";

import {
  warehouseApi,
  WarehouseListItemDto,
} from "@/services/warehouse-service"; // Giả sử bạn lưu file service ở đây

import { toast } from "sonner";
import { showConfirmToast } from "@/hooks/confirm-toast";
import { useTranslation } from "react-i18next";

interface EditableItem {
  detailId: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  requestedQty: number;
  approvedQty: number;
  unitPrice: number;
  supplierId: string;
}

export default function ReceiptReviewPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [receipt, setReceipt] = useState<ReceiptDetailDto | null>(null);

  // STATE MỚI CHO WAREHOUSE
  const [warehouses, setWarehouses] = useState<WarehouseListItemDto[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");

  const [availableMaterials, setAvailableMaterials] = useState<
    MaterialSuppliersDto[]
  >([]);

  const [rejectionHistory, setRejectionHistory] = useState<
    ReceiptRejectionHistoryDto[]
  >([]);

  const [items, setItems] = useState<EditableItem[]>([]);
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [hasMissingSupplier, setHasMissingSupplier] = useState(false);
  const [hasAllSupplierMissing, setHasAllSupplierMissing] = useState(false);

  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 10;

  // 1. Fetch Data
  useEffect(() => {
    const initData = async () => {
      try {
        // Gọi thêm warehouseApi.getAll()
        const [receiptRes, suppliersRes, warehouseRes, historyRes] =
          await Promise.all([
            receiptApi.getById(id),
            receiptApi.getAvailableSuppliers(id),
            warehouseApi.getAll(),
            receiptApi.getRejectionHistory(id).catch(() => ({ data: [] })),
          ]);

        const receiptData = receiptRes.data;
        setReceipt(receiptData);
        setRejectionHistory(historyRes.data || []);

        // Set danh sách kho và kho hiện tại của phiếu
        setWarehouses(warehouseRes.data || []);
        if (receiptData.warehouseId) {
          setSelectedWarehouseId(receiptData.warehouseId.toString());
        }

        const supData = suppliersRes.data;
        if (Array.isArray(supData)) {
          setAvailableMaterials(supData);
        } else {
          setAvailableMaterials([]);
        }

        const formItems = receiptData.items.map((i) => ({
          detailId: i.detailId,
          materialId: i.materialId || 0,
          materialCode: i.materialCode,
          materialName: i.materialName,
          requestedQty: Number(i.quantity),
          approvedQty: Number(i.quantity),
          unitPrice: Number(i.unitPrice) || 0,
          supplierId: i.supplierId ? i.supplierId.toString() : "",
        }));
        setItems(formItems);
      } catch (error) {
        console.error("Error loading receipt", error);
        toast.error("Failed to load receipt data");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) initData();
  }, [id]);

  useEffect(() => {
    if (items.length === 0) return; // Tránh lỗi khi danh sách rỗng

    const isAnyMissing = items.some(
      (item) => !item.supplierId || item.supplierId === "",
    );
    setHasMissingSupplier(isAnyMissing);

    const isAllMissing = items.every(
      (item) => !item.supplierId || item.supplierId === "",
    );
    setHasAllSupplierMissing(isAllMissing);
  }, [items]);

  const handleRowSupplierChange = (index: number, supplierIdStr: string) => {
    const newItems = [...items];
    const item = newItems[index];
    const supplierId = Number(supplierIdStr);
    const materialInfo = availableMaterials.find(
      (m) => m.materialId === item.materialId,
    );
    const quotation = materialInfo?.suppliers.find(
      (s) => s.supplierId === supplierId,
    );

    newItems[index] = {
      ...item,
      supplierId: supplierIdStr,
      unitPrice: quotation ? quotation.price : 0,
    };
    setItems(newItems);

    if (errors[`supplier-${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`supplier-${index}`];
      setErrors(newErrors);
    }
    autoSaveDraft(newItems);
  };

  const handleWarehouseChange = (val: string) => {
    setSelectedWarehouseId(val);
    autoSaveDraft(items, val);
  };

  const validateInput = (
    field: string,
    value: number | string,
    index?: number,
  ) => {
    let errorMsg = "";
    if (field === "approvedQty") {
      const num = Number(value);
      if (num < 0) errorMsg = "Negative qty";
    }
    if (field === "unitPrice") {
      const num = Number(value);
      if (num < 0) errorMsg = "Negative price";
    }
    if (field === "notes") {
      if ((value as string).length > 500) errorMsg = "Max 500 chars";
    }
    if (index !== undefined) {
      setErrors((prev) => ({ ...prev, [`${field}-${index}`]: errorMsg }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    }
  };

  const updateItem = (
    index: number,
    field: keyof EditableItem,
    value: string,
  ) => {
    if (value === "") {
      const newItems = [...items];
      // @ts-ignore
      newItems[index] = { ...newItems[index], [field]: 0 };
      setItems(newItems);
      return;
    }
    if (
      field === "approvedQty" &&
      (!/^\d*\.?\d*$/.test(value) || value.length > 9)
    )
      return;
    if (
      field === "unitPrice" &&
      (!/^\d*\.?\d*$/.test(value) || value.length > 15)
    )
      return;

    const numValue = Number(value);
    validateInput(field, numValue, index);
    const newItems = [...items];
    // @ts-ignore
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const grandTotal = items.reduce(
    (sum, item) => sum + Number(item.approvedQty) * Number(item.unitPrice),
    0,
  );

  const constructPayload = () => {
    return {
      warehouseId: Number(selectedWarehouseId),
      items: items.map((i) => ({
        supplierId: Number(i.supplierId),
        materialId: i.materialId,
        quantity: Number(i.approvedQty),
        unitPrice: Number(i.unitPrice),
      })),
      notes: notes,
    };
  };

  const handleSaveDraft = async () => {
    if (!selectedWarehouseId && hasAllSupplierMissing) {
      return toast.error(
        "Please select a warehouse or a supplier to save draft",
      );
    }
    setIsSaving(true);
    try {
      const payload = constructPayload();
      if (receipt?.status === "Requested") {
        await receiptApi.createDraft(id, payload);
        setReceipt((prev) => (prev ? { ...prev, status: "Draft" } : null));
      } else {
        await receiptApi.updateDraft(id, payload);
      }
      toast.success("Draft saved successfully!");
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Failed to save draft";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const executeSubmit = async () => {
    setIsSaving(true);
    try {
      const payload = constructPayload();
      console.log(payload);

      if (receipt?.status === "Requested") {
        await receiptApi.createDraft(id, payload);
      } else {
        await receiptApi.updateDraft(id, payload);
      }
      await receiptApi.submitForApproval(id);
      toast.success("Submitted successfully!");
      router.push("/accountant/import-request");
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Failed to submit";
      toast.error(msg);
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedWarehouseId) return toast.error("Please select a warehouse");

    const newErrors = { ...errors };
    let localMissingCheck = false;
    items.forEach((item, idx) => {
      if (!item.supplierId) {
        newErrors[`supplier-${idx}`] = "Required";
        localMissingCheck = true;
      } else {
        delete newErrors[`supplier-${idx}`];
      }
    });
    setErrors(newErrors);
    if (localMissingCheck) {
      setHasMissingSupplier(true);
      return toast.error("Please select a supplier for all items.");
    }
    const hasOtherErrors = Object.values(newErrors).some((e) => e !== "");
    if (hasOtherErrors) return toast.error("Please fix validation errors.");
    if (items.some((i) => Number(i.unitPrice) <= 0)) {
      return toast.error("All items must have a valid unit price > 0.");
    }

    showConfirmToast({
      title: "Submit for Approval?",
      description:
        "You are about to submit this receipt. You cannot edit it afterwards.",
      confirmLabel: "Yes, Submit",
      onConfirm: () => executeSubmit(),
    });
  };

  const autoSaveDraft = async (
    updatedItems: EditableItem[],
    newWarehouseId?: string,
  ) => {
    const targetWarehouseId = newWarehouseId || selectedWarehouseId;

    setIsSaving(true);
    try {
      const payload = {
        warehouseId: Number(targetWarehouseId),
        items: updatedItems.map((i) => ({
          supplierId: Number(i.supplierId),
          materialId: i.materialId,
          quantity: Number(i.approvedQty),
          unitPrice: Number(i.unitPrice),
        })),
        notes: notes,
      };

      if (receipt?.status === "Requested") {
        await receiptApi.createDraft(id, payload);
        setReceipt((prev) => (prev ? { ...prev, status: "Draft" } : null));
      } else {
        await receiptApi.updateDraft(id, payload);
      }
    } catch (error: any) {
      console.error("Auto-save failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  const totalTablePages = Math.ceil(items.length / tableItemsPerPage) || 1;
  const startTableIndex = (tablePage - 1) * tableItemsPerPage;
  const paginatedTableItems = items.slice(
    startTableIndex,
    startTableIndex + tableItemsPerPage,
  );

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
      </div>
    );

  if (!receipt)
    return <div className="p-10 text-center">Receipt not found</div>;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Review Receipt")} #${receipt.receiptCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push("/accountant/import-request/")}
              className="pl-0 hover:bg-transparent hover:text-indigo-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to List")}
            </Button>

            {(receipt.status === "Requested" || receipt.status === "Draft") && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="bg-white"
                >
                  <Save className="w-4 h-4 mr-2" /> {t("Save Draft")}
                </Button>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  onClick={handleSubmit}
                  disabled={
                    isSaving || hasMissingSupplier || !selectedWarehouseId
                  }
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {t("Submit for Approval")}
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-slate-200 shadow-sm overflow-hidden pb-0 gap-0 flex flex-col">
                <CardHeader className="bg-white border-b border-slate-100 py-4 shrink-0">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-semibold text-slate-800">
                      {t("Material & Supplier Selection")}
                    </CardTitle>
                    <Badge variant="secondary">
                      {items.length} {t("items")}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-0 flex flex-col flex-1">
                  <div className="[&>div]:max-h-[350px] [&>div]:min-h-[350px] [&>div]:overflow-y-auto [&>div]:no-scrollbar">
                    <Table>
                      <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                        <TableRow className="bg-slate-50/50">
                          <TableHead className="w-[30%] pl-6">
                            {t("Material")}
                          </TableHead>
                          <TableHead className="w-[25%]">
                            {t("Supplier")}
                          </TableHead>
                          <TableHead className="w-[10%] text-center">
                            {t("Req. Qty")}
                          </TableHead>
                          <TableHead className="w-[12%] text-center">
                            {t("Appr. Qty")}
                          </TableHead>
                          <TableHead className="w-[13%] text-right">
                            {t("Unit Price")}
                          </TableHead>
                          <TableHead className="w-[10%] text-right pr-6">
                            {t("Total")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTableItems.map((item, pageIdx) => {
                          const absoluteIdx = startTableIndex + pageIdx;

                          const matInfo = availableMaterials.find(
                            (m) => m.materialId === item.materialId,
                          );
                          const suppliersForThisItem = matInfo?.suppliers || [];

                          return (
                            <TableRow
                              key={item.detailId}
                              className="hover:bg-slate-50 align-top transition-colors"
                            >
                              <TableCell className="pl-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium text-slate-700 text-sm">
                                    {item.materialName}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-mono bg-slate-100 w-fit px-1.5 rounded">
                                    {item.materialCode}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex flex-col gap-1">
                                  <Select
                                    value={item.supplierId}
                                    onValueChange={(val) =>
                                      handleRowSupplierChange(absoluteIdx, val)
                                    }
                                  >
                                    <SelectTrigger
                                      className={`h-9 text-md w-full ${
                                        !item.supplierId ||
                                        errors[`supplier-${absoluteIdx}`]
                                          ? "border-red-300 bg-red-50 focus:ring-red-400"
                                          : "border-slate-300"
                                      }`}
                                    >
                                      <SelectValue
                                        placeholder={t("Select supplier...")}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {suppliersForThisItem.length > 0 ? (
                                        suppliersForThisItem.map((s) => (
                                          <SelectItem
                                            key={s.supplierId}
                                            value={s.supplierId.toString()}
                                          >
                                            <span className="flex items-center justify-between w-full gap-2">
                                              <span>{s.supplierName}</span>
                                            </span>
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <div className="p-2 text-xs text-slate-500 text-center">
                                          {t("No suppliers available")}
                                        </div>
                                      )}
                                    </SelectContent>
                                  </Select>
                                  {errors[`supplier-${absoluteIdx}`] && (
                                    <span className="text-[10px] text-red-500">
                                      {t("Required")}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-slate-500 pt-4 text-sm">
                                {item.requestedQty}
                              </TableCell>
                              <TableCell className="pt-3">
                                <div className="flex flex-col gap-1 items-center">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    className={`h-8 w-20 text-center text-sm ${
                                      errors[`approvedQty-${absoluteIdx}`]
                                        ? "border-red-500"
                                        : ""
                                    }`}
                                    value={item.approvedQty}
                                    onChange={(e) =>
                                      updateItem(
                                        absoluteIdx,
                                        "approvedQty",
                                        e.target.value,
                                      )
                                    }
                                  />
                                  {errors[`approvedQty-${absoluteIdx}`] && (
                                    <span className="text-[10px] text-red-500">
                                      {errors[`approvedQty-${absoluteIdx}`]}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="pt-3">
                                <div className="flex flex-col gap-1 items-end relative">
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    disabled={!item.supplierId}
                                    className={`h-8 w-24 text-right pr-2 text-sm ${
                                      errors[`unitPrice-${absoluteIdx}`]
                                        ? "border-red-500"
                                        : ""
                                    }`}
                                    value={item.unitPrice}
                                    onChange={(e) =>
                                      updateItem(
                                        absoluteIdx,
                                        "unitPrice",
                                        e.target.value,
                                      )
                                    }
                                  />
                                  {errors[`unitPrice-${absoluteIdx}`] && (
                                    <span className="text-[10px] text-red-500">
                                      {errors[`unitPrice-${absoluteIdx}`]}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-6 font-semibold text-slate-700 pt-4 text-sm">
                                {(
                                  Number(item.approvedQty) *
                                  Number(item.unitPrice)
                                ).toLocaleString("vi-VN")}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {totalTablePages > 1 && (
                    <div className="px-6 py-3 flex items-center justify-between border-t border-slate-100 bg-white shrink-0">
                      <span className="text-xs text-slate-500">
                        {t("Showing")} {startTableIndex + 1}-
                        {Math.min(
                          startTableIndex + tableItemsPerPage,
                          items.length,
                        )}{" "}
                        {t("of")} {items.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() =>
                            setTablePage((p) => Math.max(1, p - 1))
                          }
                          disabled={tablePage === 1}
                        >
                          <ChevronLeft className="w-3 h-3 mr-1" /> {t("Prev")}
                        </Button>
                        <span className="text-xs font-medium text-slate-600 w-10 text-center">
                          {tablePage} / {totalTablePages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() =>
                            setTablePage((p) =>
                              Math.min(totalTablePages, p + 1),
                            )
                          }
                          disabled={tablePage === totalTablePages}
                        >
                          {t("Next")} <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 p-6 flex justify-end items-center gap-4 border-t border-slate-100 shrink-0">
                    <span className="text-slate-500 font-medium text-sm">
                      {t("Grand Total (VND)")}
                    </span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {grandTotal.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-50">
                  <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    {t("Receipt Details")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">
                      {t("Status")}
                    </span>
                    <Badge
                      variant="outline"
                      className={`${
                        receipt.status === "Requested"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : receipt.status === "Draft"
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : receipt.status === "Submitted"
                              ? "bg-green-100 text-green-700 border-green-200"
                              : ""
                      }`}
                    >
                      {t(receipt.status)}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                      <CalendarDays className="w-4 h-4 text-indigo-600" />{" "}
                      {t("Date")}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {new Date(receipt.receiptDate || "").toLocaleDateString(
                        "vi-VN",
                      )}
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-5">
                      <Building2 className="w-4 h-4 text-indigo-600" />{" "}
                      {t("Target Warehouse")}
                    </span>
                    {receipt.status === "Requested" ||
                    receipt.status === "Draft" ? (
                      <div className="space-y-2">
                        <Select
                          value={selectedWarehouseId}
                          onValueChange={handleWarehouseChange}
                        >
                          <SelectTrigger
                            className={`w-full py-7 ${!selectedWarehouseId ? "border-red-300 bg-red-50" : "bg-slate-50 border-slate-200"}`}
                          >
                            <SelectValue
                              placeholder={t("Select warehouse...")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((w) => (
                              <SelectItem
                                key={w.warehouseId}
                                value={w.warehouseId.toString()}
                              >
                                <div className="flex flex-col items-start py-1">
                                  <span className="font-medium">{w.name}</span>
                                  <span className="text-xs">{w.address}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {!selectedWarehouseId && (
                          <p className="text-xs text-red-500 italic flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />{" "}
                            {t("Please select a target warehouse.")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-md p-3 py-2 cursor-not-allowed opacity-80">
                        {selectedWarehouseId ? (
                          (() => {
                            const selectedWarhouse = warehouses.find(
                              (w) =>
                                w.warehouseId.toString() ===
                                selectedWarehouseId,
                            );
                            return (
                              <div className="flex flex-col items-start">
                                <span className="font-medium text-sm text-slate-700">
                                  {selectedWarhouse?.name ||
                                    t("Unknown Warehouse")}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {selectedWarhouse?.address}
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-sm text-slate-400 italic">
                            {t("No warehouse selected")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              {rejectionHistory.length > 0 && (
                <Card className="border-red-200 shadow-sm bg-red-50/40">
                  <CardHeader className="pb-3 border-b border-red-100">
                    <CardTitle className="text-sm font-bold text-red-800 uppercase tracking-wide flex items-center gap-2">
                      <History className="w-4 h-4" /> {t("Rejection Feedback")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="relative border-l-2 border-red-200 ml-2 space-y-6">
                      {rejectionHistory.map((history) => (
                        <div key={history.id} className="relative pl-5">
                          <div className="absolute w-3 h-3 bg-red-500 rounded-full -left-[7px] top-1.5 border-2 border-white shadow-sm" />

                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800">
                              {history.rejectorName || t("Manager")}
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
