"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Loader2,
  Package,
  CalendarDays,
  Plus,
  Trash2,
  CheckCircle2,
  MapPin,
  FileImage,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  staffReceiptsApi,
  GetInboundRequestListDto,
  ReceiptPutawayDto,
} from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { showConfirmToast } from "@/hooks/confirm-toast";
import { DateTimePicker } from "@/components/ui/custom/date-time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PutawayBinInput {
  id: string;
  binId: number | "";
  quantity: number | "";
}

interface PutawayItemInput {
  materialId: number;
  materialCode: string;
  materialName: string;
  passQuantity: number;
  unit: string;
  batch: {
    batchCode: string;
    mfgDate: string;
    expiryDate: string;
    certificateImage: string | null;
  };
  binAllocations: PutawayBinInput[];
}

export default function PutawayPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [receipt, setReceipt] = useState<GetInboundRequestListDto | null>(null);
  const [putawayItems, setPutawayItems] = useState<PutawayItemInput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const [binLocations, setBinLocations] = useState<any[]>([]);

  useEffect(() => {
    const fetchReceipt = async () => {
      setIsLoading(true);
      try {
        const [receiptRes, qcRes, binRes] = await Promise.all([
          staffReceiptsApi.getReceiptDetails(id),
          staffReceiptsApi.getQCCheck(id),
          staffReceiptsApi.getAllBinLocation(),
        ]);

        const data = receiptRes.data;
        const qcData = qcRes.data;

        setReceipt(data);
        setBinLocations(binRes.data);

        const validQcDetails = qcData.details.filter((q) => q.passQuantity > 0);

        const initialForm: PutawayItemInput[] = validQcDetails.map((qcItem) => {
          const receiptItem = (data.items || []).find(
            (i) => i.materialId === qcItem.materialId,
          );

          return {
            materialId: qcItem.materialId || 0,
            materialCode: receiptItem?.materialCode || "",
            materialName:
              receiptItem?.materialName || `Item #${qcItem.materialId}`,
            passQuantity: qcItem.passQuantity,
            unit: receiptItem?.unit || "Unit",
            batch: {
              batchCode: receiptItem?.batchCode || "",
              mfgDate: receiptItem?.mfgDate
                ? receiptItem.mfgDate.split("T")[0]
                : "",
              expiryDate: "",
              certificateImage: null,
            },
            binAllocations: [
              {
                id: crypto.randomUUID(),
                binId: receiptItem?.binLocationId || "",
                quantity: qcItem.passQuantity,
              },
            ],
          };
        });

        setPutawayItems(initialForm);
      } catch (error: any) {
        console.error(error);
        toast.error(
          error.response?.data?.message ||
            t("Failed to fetch receipt details."),
        );
        router.push("/staff/inbound-requests");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchReceipt();
  }, [id, router, t]);

  const handleBatchChange = (
    itemIndex: number,
    field: keyof PutawayItemInput["batch"],
    value: string | null,
  ) => {
    const newItems = [...putawayItems];
    newItems[itemIndex].batch = {
      ...newItems[itemIndex].batch,
      [field]: value,
    };
    setPutawayItems(newItems);
  };

  const handleImageUpload = async (
    itemIndex: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        handleBatchChange(
          itemIndex,
          "certificateImage",
          reader.result as string,
        );
      };
      reader.onerror = () => toast.error(t("Failed to read image file."));
    } catch (error) {
      toast.error(t("Failed to process image."));
    } finally {
      e.target.value = "";
    }
  };

  const handleAddBin = (itemIndex: number) => {
    const newItems = [...putawayItems];
    newItems[itemIndex].binAllocations.push({
      id: crypto.randomUUID(),
      binId: "",
      quantity: "",
    });
    setPutawayItems(newItems);
  };

  const handleRemoveBin = (itemIndex: number, binIndex: number) => {
    const newItems = [...putawayItems];
    newItems[itemIndex].binAllocations.splice(binIndex, 1);
    setPutawayItems(newItems);
  };

  const handleBinChange = (
    itemIndex: number,
    binIndex: number,
    field: keyof PutawayBinInput,
    value: number | "",
  ) => {
    const newItems = [...putawayItems];
    newItems[itemIndex].binAllocations[binIndex] = {
      ...newItems[itemIndex].binAllocations[binIndex],
      [field]: value,
    };
    setPutawayItems(newItems);
  };

  const calculateAllocatedQty = (allocations: PutawayBinInput[]) => {
    return allocations.reduce(
      (sum, bin) => sum + (Number(bin.quantity) || 0),
      0,
    );
  };

  const handleSubmitPutaway = async () => {
    if (putawayItems.length === 0) {
      return toast.error(t("No valid items to putaway."));
    }

    for (let i = 0; i < putawayItems.length; i++) {
      const item = putawayItems[i];

      if (!item.batch.batchCode.trim()) {
        return toast.error(
          `${t("Please enter a Batch Code for")} ${item.materialName}`,
        );
      }

      if (!item.batch.certificateImage) {
        return toast.error(
          `${t("Please upload a Certificate Image for")} ${item.materialName}`,
        );
      }

      if (item.binAllocations.length === 0) {
        return toast.error(
          `${t("Please allocate at least one bin for")} ${item.materialName}`,
        );
      }

      let hasEmptyBin = false;
      item.binAllocations.forEach((bin) => {
        if (
          bin.binId === "" ||
          bin.quantity === "" ||
          Number(bin.quantity) <= 0
        ) {
          hasEmptyBin = true;
        }
      });
      if (hasEmptyBin) {
        return toast.error(
          `${t("Invalid Bin ID or Quantity for")} ${item.materialName}`,
        );
      }

      const totalAllocated = calculateAllocatedQty(item.binAllocations);
      if (totalAllocated !== item.passQuantity) {
        return toast.error(
          `${t("Total allocated quantity for")} ${item.materialName} ${t("must equal actual quantity")} (${item.passQuantity}).`,
        );
      }
    }

    showConfirmToast({
      title: t("Confirm Putaway?"),
      description: t(
        "Are you sure you want to save these bin allocations and update the inventory?",
      ),
      confirmLabel: t("Yes, Save"),
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const payload: ReceiptPutawayDto = {
            items: putawayItems.map((item) => ({
              materialId: item.materialId,
              batch: {
                batchCode: item.batch.batchCode.trim(),
                mfgDate: item.batch.mfgDate
                  ? new Date(item.batch.mfgDate).toISOString()
                  : null,
                expiryDate: item.batch.expiryDate
                  ? new Date(item.batch.expiryDate).toISOString()
                  : null,
                certificateImage: item.batch.certificateImage, 
              },
              binAllocations: item.binAllocations.map((bin) => ({
                binId: Number(bin.binId),
                quantity: Number(bin.quantity),
              })),
            })),
          };

          await staffReceiptsApi.putaway(id, payload);
          toast.success(
            t("Putaway completed successfully! Inventory updated."),
          );
          router.push("/staff/inbound-requests");
        } catch (error: any) {
          console.error(error);
          toast.error(
            error.response?.data?.message || t("Failed to complete putaway."),
          );
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  if (isLoading || !receipt) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // --- Tính toán Phân trang ---
  const totalItems = putawayItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = putawayItems.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Putaway")} #${receipt.receiptCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 mx-auto w-full space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/staff/inbound-requests")}
                className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back")}
              </Button>
              <div className="hidden md:flex items-center gap-3 border-l border-slate-200 pl-4">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {t("Inventory Putaway")}
                </h1>
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                  {receipt.warehouseName}
                </Badge>
              </div>
            </div>

            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm min-w-[150px]"
              onClick={handleSubmitPutaway}
              disabled={isSubmitting || putawayItems.length === 0}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {t("Save & Update Inventory")}
            </Button>
          </div>

          {putawayItems.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-lg text-center shadow-sm">
              <p>
                {t(
                  "There are no valid items to putaway (All actual quantities are 0).",
                )}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {paginatedItems.map((item, idx) => {
                  const absoluteIdx = startIndex + idx;
                  const totalAllocated = calculateAllocatedQty(
                    item.binAllocations,
                  );
                  const isQtyMatched = totalAllocated === item.passQuantity;

                  return (
                    <Card
                      key={item.materialId}
                      className="border-slate-200 shadow-sm bg-white overflow-hidden gap-0"
                    >
                      <CardHeader className="border-b border-slate-100 py-4 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-800">
                            <Package className="w-5 h-5 text-indigo-600" />
                            {item.materialName}
                          </CardTitle>
                          <p className="text-xs text-slate-500 font-mono mt-1 ml-7">
                            {item.materialCode}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
                            {t("Target Quantity")}
                          </span>
                          <Badge
                            variant="outline"
                            className="bg-white border-indigo-200 text-indigo-700 px-3 py-1 text-sm"
                          >
                            {item.passQuantity} {item.unit}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="p-0">
                        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                          <div className="md:col-span-5 p-5 space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800 mb-3 border-b border-slate-100 pb-2">
                              <CalendarDays className="w-4 h-4 text-slate-500" />
                              {t("Batch Details")}
                            </h3>

                            <div className="space-y-2">
                              <label className="text-xs font-medium text-slate-700">
                                {t("Batch Code")}{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <Input
                                placeholder="e.g. BATCH-2026-03"
                                className="h-9 focus-visible:ring-indigo-500 bg-white"
                                value={item.batch.batchCode}
                                onChange={(e) =>
                                  handleBatchChange(
                                    absoluteIdx,
                                    "batchCode",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700">
                                  {t("Mfg Date")}
                                </label>
                                <DateTimePicker
                                  value={
                                    item.batch.mfgDate
                                      ? new Date(item.batch.mfgDate)
                                      : undefined
                                  }
                                  onChange={(date) =>
                                    handleBatchChange(
                                      absoluteIdx,
                                      "mfgDate",
                                      date ? date.toISOString() : "",
                                    )
                                  }
                                  placeholder={t("Select Mfg Date")}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700">
                                  {t("Expiry Date")}
                                </label>
                                <DateTimePicker
                                  value={
                                    item.batch.expiryDate
                                      ? new Date(item.batch.expiryDate)
                                      : undefined
                                  }
                                  onChange={(date) =>
                                    handleBatchChange(
                                      absoluteIdx,
                                      "expiryDate",
                                      date ? date.toISOString() : "",
                                    )
                                  }
                                  placeholder={t("Select Expiry Date")}
                                  minDate={
                                    item.batch.mfgDate
                                      ? new Date(item.batch.mfgDate)
                                      : undefined
                                  }
                                />
                              </div>
                            </div>

                            <div className="space-y-2 pt-2">
                              <label className="text-xs font-medium text-slate-700">
                                {t("Certificate Image")}
                              </label>
                              {item.batch.certificateImage ? (
                                <div className="relative w-full h-32 border border-slate-200 rounded-md overflow-hidden group">
                                  <img
                                    src={item.batch.certificateImage}
                                    alt="Certificate"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={() =>
                                        handleBatchChange(
                                          absoluteIdx,
                                          "certificateImage",
                                          null,
                                        )
                                      }
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-1" />{" "}
                                      {t("Remove")}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center w-full">
                                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                      <FileImage className="w-6 h-6 text-slate-400 mb-2" />
                                      <p className="text-xs text-slate-500">
                                        <span className="font-semibold text-indigo-600">
                                          {t("Click to upload")}
                                        </span>
                                      </p>
                                    </div>
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept="image/*"
                                      onChange={(e) =>
                                        handleImageUpload(absoluteIdx, e)
                                      }
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="md:col-span-7 p-5 flex flex-col">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                                <MapPin className="w-4 h-4 text-slate-500" />
                                {t("Bin Allocations")}
                              </h3>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800"
                                onClick={() => handleAddBin(absoluteIdx)}
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />{" "}
                                {t("Add Bin")}
                              </Button>
                            </div>

                            <div className="space-y-3 flex-1">
                              {item.binAllocations.map((bin, binIdx) => (
                                <div
                                  key={bin.id}
                                  className="flex items-start gap-3 relative group"
                                >
                                  <div className="flex-1 space-y-1">
                                    <label className="text-[10px] uppercase text-slate-500 font-semibold ml-1">
                                      {t("Bin Location")}{" "}
                                      <span className="text-red-500">*</span>
                                    </label>

                                    <Select
                                      value={
                                        bin.binId ? bin.binId.toString() : ""
                                      }
                                      onValueChange={(val) =>
                                        handleBinChange(
                                          absoluteIdx,
                                          binIdx,
                                          "binId",
                                          Number(val),
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-9 focus-visible:ring-indigo-500 bg-white w-full">
                                        <SelectValue
                                          placeholder={t("Select Bin...")}
                                        />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-[200px]">
                                        {binLocations.map((location) => (
                                          <SelectItem
                                            key={location.binId}
                                            value={location.binId.toString()}
                                          >
                                            {location.code}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <label className="text-[10px] uppercase text-slate-500 font-semibold ml-1">
                                      {t("Quantity")}{" "}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder="Qty..."
                                      className="h-9 focus-visible:ring-indigo-500 bg-white"
                                      value={bin.quantity}
                                      onChange={(e) =>
                                        handleBinChange(
                                          absoluteIdx,
                                          binIdx,
                                          "quantity",
                                          e.target.value === ""
                                            ? ""
                                            : Number(e.target.value),
                                        )
                                      }
                                    />
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-rose-400 hover:text-rose-600 hover:bg-rose-50 mt-[22px] shrink-0"
                                    onClick={() =>
                                      handleRemoveBin(absoluteIdx, binIdx)
                                    }
                                    disabled={item.binAllocations.length === 1}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>

                            <div
                              className={`mt-6 p-3 rounded-md flex items-center justify-between border ${
                                isQtyMatched
                                  ? "bg-emerald-50 border-emerald-200"
                                  : "bg-rose-50 border-rose-200"
                              }`}
                            >
                              <span
                                className={`text-sm font-medium ${isQtyMatched ? "text-emerald-800" : "text-rose-800"}`}
                              >
                                {t("Total Allocated")}:
                              </span>
                              <div className="flex items-center gap-2 font-bold text-lg">
                                <span
                                  className={
                                    isQtyMatched
                                      ? "text-emerald-600"
                                      : "text-rose-600"
                                  }
                                >
                                  {totalAllocated}
                                </span>
                                <span className="text-slate-400 font-medium text-sm">
                                  / {item.passQuantity}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Phân trang Footer */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm mt-6">
                  <span className="text-sm text-slate-500">
                    {t("Showing")}{" "}
                    <span className="font-semibold text-slate-800">
                      {startIndex + 1}
                    </span>{" "}
                    -{" "}
                    <span className="font-semibold text-slate-800">
                      {Math.min(startIndex + itemsPerPage, totalItems)}
                    </span>{" "}
                    {t("of")}{" "}
                    <span className="font-semibold text-slate-800">
                      {totalItems}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> {t("Prev")}
                    </Button>
                    <span className="text-sm font-medium text-slate-600 px-3 min-w-[70px] text-center">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="h-8 shadow-sm"
                    >
                      {t("Next")} <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
