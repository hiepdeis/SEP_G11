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
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
} from "@/services/receipt-service";
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
  supplierId: string; // Lưu string để bind với Select value
}

export default function ReceiptReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [receipt, setReceipt] = useState<ReceiptDetailDto | null>(null);
  const [availableMaterials, setAvailableMaterials] = useState<
    MaterialSuppliersDto[]
  >([]);

  const [items, setItems] = useState<EditableItem[]>([]);
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // 1. Fetch Data
  useEffect(() => {
    const initData = async () => {
      try {
        const [receiptRes, suppliersRes] = await Promise.all([
          receiptApi.getById(id),
          receiptApi.getAvailableSuppliers(id),
        ]);

        const receiptData = receiptRes.data;
        setReceipt(receiptData);
        setNotes(receiptData.notes || "");
        setAvailableMaterials(suppliersRes.data);

        // Map API items sang EditableItems
        const formItems = receiptData.items.map((i) => ({
          detailId: i.detailId,
          materialId: i.materialId || 0,
          materialCode: i.materialCode,
          materialName: i.materialName,
          requestedQty: Number(i.quantity),
          approvedQty: Number(i.quantity),
          unitPrice: Number(i.unitPrice) || 0,
          // Nếu đã có supplier (do save draft), gán vào, nếu không để rỗng
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

  // 2. Handle Logic: Thay đổi Supplier cho từng dòng
  const handleRowSupplierChange = (index: number, supplierIdStr: string) => {
    const newItems = [...items];
    const item = newItems[index];
    const supplierId = Number(supplierIdStr);

    // Tìm thông tin vật tư trong danh sách availableMaterials
    const materialInfo = availableMaterials.find(
      (m) => m.materialId === item.materialId,
    );

    // Tìm báo giá của Supplier vừa chọn
    const quotation = materialInfo?.suppliers.find(
      (s) => s.supplierId === supplierId,
    );

    // Cập nhật SupplierId và tự động điền giá
    newItems[index] = {
      ...item,
      supplierId: supplierIdStr,
      unitPrice: quotation ? quotation.price : 0,
    };

    setItems(newItems);

    // Xóa lỗi nếu có (ví dụ lỗi chưa chọn supplier)
    if (errors[`supplier-${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`supplier-${index}`];
      setErrors(newErrors);
    }
  };

  // 3. Validation Inputs
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
      items: items.map((i) => ({
        supplierId: Number(i.supplierId), // Supplier riêng của từng item
        materialId: i.materialId,
        quantity: Number(i.approvedQty),
        unitPrice: Number(i.unitPrice),
      })),
      notes: notes,
    };
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const payload = constructPayload();

      if (receipt?.status === "Requested") {
        await receiptApi.createDraft(id, payload);
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
    // Validate: Tất cả item phải có Supplier
    let hasMissingSupplier = false;
    const newErrors = { ...errors };

    items.forEach((item, idx) => {
      if (!item.supplierId) {
        newErrors[`supplier-${idx}`] = "Required";
        hasMissingSupplier = true;
      }
    });

    if (hasMissingSupplier) {
      setErrors(newErrors);
      return toast.error("Please select a supplier for all items.");
    }

    const hasErrors = Object.values(errors).some((e) => e !== "");
    if (hasErrors) return toast.error("Please fix validation errors.");

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
                  disabled={isSaving}
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
            {/* Left Column: Items Table (Rộng hơn vì chứa nhiều cột) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Items Table */}
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
                        // Lấy danh sách suppliers cho material này
                        const matInfo = availableMaterials.find(
                          (m) => m.materialId === item.materialId,
                        );
                        const suppliersForThisItem = matInfo?.suppliers || [];

                        return (
                          <TableRow
                            key={item.detailId}
                            className="hover:bg-slate-50 align-top transition-colors"
                          >
                            {/* Material Info */}
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

                            {/* Supplier Select (Per Row) */}
                            <TableCell className="py-3">
                              <div className="flex flex-col gap-1">
                                <Select
                                  value={item.supplierId}
                                  onValueChange={(val) =>
                                    handleRowSupplierChange(idx, val)
                                  }
                                >
                                  <SelectTrigger
                                    className={`h-9 text-md ${errors[`supplier-${idx}`] ? "border-red-500 ring-red-500" : ""}`}
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
                                            {/* Optional: Show price hint in dropdown */}
                                            {/* <span className="text-slate-400 text-[10px]">{s.price.toLocaleString()}</span> */}
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
                                  className={`h-8 w-20 text-center text-sm ${
                                    errors[`approvedQty-${idx}`]
                                      ? "border-red-500"
                                      : ""
                                  }`}
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
                                  className={`h-8 w-24 text-right pr-2 text-sm ${
                                    errors[`unitPrice-${idx}`]
                                      ? "border-red-500"
                                      : ""
                                  }`}
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

                  {/* Total Footer */}
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

              <Card className="border-slate-200 shadow-sm">
                <CardContent>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">
                      Notes / Remarks
                    </label>
                    <span
                      className={`text-xs ${notes.length > 500 ? "text-red-500" : "text-slate-400"}`}
                    >
                      {notes.length}/500
                    </span>
                  </div>
                  <textarea
                    className={`w-full min-h-[100px] p-3 rounded-md border text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 
                      ${
                        errors.notes
                          ? "border-red-500 focus-visible:ring-red-500"
                          : "border-slate-200 focus-visible:ring-indigo-500"
                      }`}
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
              </Card>
            </div>

            {/* Right Column: Info */}
            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-50">
                  <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Receipt Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Status</span>
                    <Badge
                      variant="outline"
                      className={`
                        ${
                          receipt.status === "Requested"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : receipt.status === "Draft"
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : receipt.status === "Submitted"
                                ? "bg-green-100 text-green-700 border-green-200"
                                : ""
                        }
                      `}
                    >
                      {receipt.status}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" /> Date
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {new Date(receipt.receiptDate).toLocaleDateString(
                        "vi-VN",
                      )}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Warehouse
                    </span>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium text-slate-900 block">
                        {receipt.warehouseName}
                      </span>
                      <span className="text-xs text-slate-500">
                        Processing Facility
                      </span>
                    </div>
                  </div>

                  {/* <div className="space-y-2">
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                        <Package className="w-4 h-4"/> Requester
                    </span>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                            SM
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">Site Manager</span>
                            <span className="text-[10px] text-slate-400">ID: {receipt.warehouseId}</span>
                        </div>
                    </div>
                  </div> */}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
