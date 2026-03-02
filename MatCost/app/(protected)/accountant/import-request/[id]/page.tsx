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
        <Header title={`Review Receipt #${receipt.receiptCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push("/accountant/import-request/")}
              className="pl-0 hover:bg-transparent hover:text-indigo-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </Button>

            {(receipt.status === "Requested" || receipt.status === "Draft") && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="bg-white"
                >
                  <Save className="w-4 h-4 mr-2" /> Save Draft
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
                  Submit for Approval
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-slate-200 shadow-sm overflow-hidden pb-0 gap-0">
                <CardHeader className="bg-white border-b border-slate-100 py-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-semibold text-slate-800">
                      Material & Supplier Selection
                    </CardTitle>
                    <Badge variant="secondary">{items.length} items</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="w-[30%] pl-6">Material</TableHead>
                        <TableHead className="w-[25%]">Supplier</TableHead>
                        <TableHead className="w-[10%] text-center">
                          Req. Qty
                        </TableHead>
                        <TableHead className="w-[12%] text-center">
                          Appr. Qty
                        </TableHead>
                        <TableHead className="w-[13%] text-right">
                          Unit Price
                        </TableHead>
                        <TableHead className="w-[10%] text-right pr-6">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => {
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
                                    handleRowSupplierChange(idx, val)
                                  }
                                >
                                  <SelectTrigger
                                    className={`h-9 text-md w-full ${
                                      !item.supplierId ||
                                      errors[`supplier-${idx}`]
                                        ? "border-red-300 bg-red-50 focus:ring-red-400"
                                        : "border-slate-300"
                                    }`}
                                  >
                                    <SelectValue placeholder="Select supplier..." />
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
                                        No suppliers available
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                                {errors[`supplier-${idx}`] && (
                                  <span className="text-[10px] text-red-500">
                                    Required
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
                                  className={`h-8 w-20 text-center text-sm ${errors[`approvedQty-${idx}`] ? "border-red-500" : ""}`}
                                  value={item.approvedQty}
                                  onChange={(e) =>
                                    updateItem(
                                      idx,
                                      "approvedQty",
                                      e.target.value,
                                    )
                                  }
                                />
                                {errors[`approvedQty-${idx}`] && (
                                  <span className="text-[10px] text-red-500">
                                    {errors[`approvedQty-${idx}`]}
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
                                  className={`h-8 w-24 text-right pr-2 text-sm ${errors[`unitPrice-${idx}`] ? "border-red-500" : ""}`}
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    updateItem(idx, "unitPrice", e.target.value)
                                  }
                                />
                                {errors[`unitPrice-${idx}`] && (
                                  <span className="text-[10px] text-red-500">
                                    {errors[`unitPrice-${idx}`]}
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
                  <div className="bg-slate-50 p-6 flex justify-end items-center gap-4 border-t border-slate-100">
                    <span className="text-slate-500 font-medium text-sm">
                      Grand Total (VND)
                    </span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {grandTotal.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Note Card */}
              {/* <Card className="border-slate-200 shadow-sm">
                <CardContent>
                  <div className="flex justify-between mb-2 mt-4">
                    <label className="text-md font-medium text-slate-700">
                      Notes / Remarks
                    </label>
                    <span
                      className={`text-xs ${notes.length > 500 ? "text-red-500" : "text-slate-400"}`}
                    >
                      {notes.length}/500
                    </span>
                  </div>
                  <textarea
                    className={`w-full min-h-[100px] p-3 rounded-md border text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 ${errors.notes ? "border-red-500" : "border-slate-200 focus-visible:ring-indigo-500"}`}
                    placeholder="Add any notes for the manager..."
                    value={notes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNotes(val);
                      validateInput("notes", val);
                    }}
                  />
                  {errors.notes && (
                    <p className="text-xs text-red-500 mt-1">{errors.notes}</p>
                  )}
                </CardContent>
              </Card> */}
            </div>

            {/* Right Column: Info & Warehouse Selection */}
            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-50">
                  <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Receipt Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  {/* Status */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Status</span>
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
                      {receipt.status}
                    </Badge>
                  </div>

                  {/* Date */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                      <CalendarDays className="w-4 h-4  text-indigo-600" /> Date
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {new Date(receipt.receiptDate || "").toLocaleDateString(
                        "vi-VN",
                      )}
                    </span>
                  </div>

                  {/* Warehouse Selection */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-5">
                      <Building2 className="w-4 h-4 text-indigo-600" /> Target
                      Warehouse
                    </span>
                    {receipt.status === "Requested" ||
                    receipt.status === "Draft" ? (
                      <div className="space-y-2">
                        <Select
                          value={selectedWarehouseId}
                          onValueChange={setSelectedWarehouseId}
                        >
                          <SelectTrigger
                            className={`w-full py-7 ${!selectedWarehouseId ? "border-red-300 bg-red-50" : "bg-slate-50 border-slate-200"}`}
                          >
                            <SelectValue placeholder="Select warehouse..." />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((w) => (
                              <SelectItem
                                key={w.warehouseId}
                                value={w.warehouseId.toString()}
                              >
                                <div className="flex flex-col items-start py-1">
                                  <span className="font-medium">{w.name}</span>
                                  <span className="text-xs text-slate-500">
                                    {w.address}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Chỉ hiện lỗi khi đang ở mode Requested mà chưa chọn kho */}
                        {!selectedWarehouseId && (
                          <p className="text-xs text-red-500 italic flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Please select
                            a target warehouse.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-md p-3 py-2 cursor-not-allowed opacity-80">
                        {selectedWarehouseId ? (
                          (() => {
                            // Tìm kho đã chọn để hiển thị tên
                            const selectedWarhouse = warehouses.find(
                              (w) =>
                                w.warehouseId.toString() ===
                                selectedWarehouseId,
                            );
                            return (
                              <div className="flex flex-col items-start">
                                <span className="font-medium text-sm text-slate-700">
                                  {selectedWarhouse?.name ||
                                    "Unknown Warehouse"}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {selectedWarhouse?.address}
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-sm text-slate-400 italic">
                            No warehouse selected
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
                      <History className="w-4 h-4" /> Rejection Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {/* Đường viền dọc tạo hiệu ứng Timeline */}
                    <div className="relative border-l-2 border-red-200 ml-2 space-y-6">
                      {rejectionHistory.map((history) => (
                        <div key={history.id} className="relative pl-5">
                          {/* Nút tròn trên timeline */}
                          <div className="absolute w-3 h-3 bg-red-500 rounded-full -left-[7px] top-1.5 border-2 border-white shadow-sm" />

                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800">
                              {history.rejectorName || "Manager"}
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

                            {/* Khung chứa lý do reject */}
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
