"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  Box,
  MapPin,
  Loader2,
  Calendar as CalendarIcon,
  QrCode,
  Image as ImageIcon,
  Trash2,
  Truck,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BinLocationDto,
  GetInboundRequestListDto,
  staffReceiptApi,
} from "@/services/receipt-service";
import { toast } from "sonner";
import { showConfirmToast } from "@/hooks/confirm-toast";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ConfirmItem {
  detailId: number;
  materialCode: string;
  materialName: string;
  unit: string;
  supplierName: string;
  expectedQty: number;
  actualQty: number | "";
  binLocationId: string;
  batchCode: string;
  mfgDate: string;
  certificateImage: string;
}

export default function StaffConfirmInboundPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [receipt, setReceipt] = useState<GetInboundRequestListDto | null>(null);
  const [binLocations, setBinLocations] = useState<BinLocationDto[]>([]);
  const [confirmItems, setConfirmItems] = useState<ConfirmItem[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [hasIncident, setHasIncident] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 5;

  useEffect(() => {
    const initData = async () => {
      try {
        setIsLoading(true);
        const [receiptRes, binRes] = await Promise.all([
          staffReceiptApi.getInboundRequestDetail(id),
          staffReceiptApi.getAllBinLocation(),
        ]);

        setReceipt(receiptRes.data);
        setBinLocations(binRes.data || []);

        let incidentData = null;
        try {
          const incRes = await staffReceiptApi.getIncidentReport(id);
          incidentData = incRes.data;
          setHasIncident(true);
        } catch (e) {}

        const initConfirmItems: ConfirmItem[] = receiptRes.data.items.map(
          (item) => {
            const incidentDetail = incidentData?.details.find(
              (inc: any) => inc.receiptDetailId === item.detailId,
            );

            let defaultActualQty: number | "" = "";

            if (incidentDetail) {
              defaultActualQty = incidentDetail.actualQuantity;
            } else if (incidentData) {
              defaultActualQty = item.quantity || 0;
            } else {
              defaultActualQty = item.quantity || 0;
            }

            return {
              detailId: item.detailId,
              materialCode: item.materialCode,
              materialName: item.materialName,
              unit: item.unit || "Unit",
              supplierName: item.supplierName,
              expectedQty: item.quantity || 0,
              actualQty: defaultActualQty,
              binLocationId: "",
              batchCode: "",
              mfgDate: "",
              certificateImage: "",
            };
          },
        );

        setConfirmItems(initConfirmItems);
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) initData();
  }, [id]);

  const updateConfirmItem = (
    index: number,
    field: keyof ConfirmItem,
    value: any,
  ) => {
    const newItems = [...confirmItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setConfirmItems(newItems);
  };

  const handleImageUpload = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateConfirmItem(index, "certificateImage", reader.result as string);
        toast.success("Image attached");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinalConfirm = async () => {
    const invalidQty = confirmItems.filter((i) => i.actualQty === "");
    if (invalidQty.length > 0)
      return toast.error(`Enter Actual Quantity for all items.`);

    const missingBin = confirmItems.filter((i) => !i.binLocationId);
    if (missingBin.length > 0)
      return toast.error(`Select Bin Location for all items.`);

    const missingBatch = confirmItems.filter((i) => !i.batchCode);
    if (missingBatch.length > 0)
      return toast.error(`Select Batch Code for all items.`);

    showConfirmToast({
      title: t("Confirm Inbound Completion?"),
      description: t(
        "Inventory will be updated. Ensure physical count is correct.",
      ),
      confirmLabel: t("Yes, Confirm"),
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const payload = {
            items: confirmItems.map((i) => ({
              detailId: i.detailId,
              actualQuantity: Number(i.actualQty),
              binLocationId: Number(i.binLocationId),
              batchCode: i.batchCode || null,
              mfgDate: i.mfgDate ? new Date(i.mfgDate).toISOString() : null,
              certificateImage: i.certificateImage || null,
            })),
            notes: generalNotes,
          };

          await staffReceiptApi.confirmGoodsReceipt(id, payload);
          toast.success(t("Inbound confirmed successfully!"));
          router.push("/staff/import-request");
        } catch (error: any) {
          toast.error(
            error.response?.data?.message || t("Failed to confirm inbound"),
          );
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Final Confirm")} - #${receipt?.receiptCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                onClick={() => router.push(`/staff/import-request/${id}`)}
                className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit -ml-2 mb-1 h-8"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to detail")}
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {t("Final Confirm Inbound")}
                </h1>
                {receipt?.warehouseName && (
                  <Badge
                    variant="secondary"
                    className="bg-indigo-50 text-indigo-700 border-indigo-200 px-2.5 py-1 text-xs"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    {receipt.warehouseName}
                  </Badge>
                )}
              </div>
            </div>

            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px]"
              onClick={handleFinalConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {t("Confirm Inbound")}
            </Button>
          </div>

          <div
            className={`border p-4 rounded-lg flex items-start gap-3 ${hasIncident ? "bg-yellow-50 border-yellow-200 text-yellow-800" : "bg-indigo-50 border-indigo-200 text-indigo-800"}`}
          >
            <CheckCircle
              className={`w-5 h-5 shrink-0 mt-0.5 ${hasIncident ? "text-yellow-600" : "text-indigo-600"}`}
            />
            <div>
              <h3 className="font-bold text-sm">
                {hasIncident
                  ? t("Incident Report Logged")
                  : t("Ready for Storage")}
              </h3>
              <p className="text-xs mt-1">
                {t(
                  "Please enter the actual quantities you are taking into the warehouse and assign Bin/Batch locations.",
                )}
              </p>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden pt-0 pb-0 gap-0 flex flex-col">
            <CardContent className="p-0 flex flex-col flex-1">
              <div className="[&>div]:max-h-[450px] [&>div]:min-h-[450px] [&>div]:overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                    <TableRow>
                      <TableHead className="w-[20%] pl-6">
                        {t("Material Info")}
                      </TableHead>
                      <TableHead className="w-[15%] text-center">
                        {t("Supplier")}
                      </TableHead>
                      <TableHead className="w-[10%] text-center">
                        {t("Required")}
                      </TableHead>
                      <TableHead className="w-[10%] text-center">
                        {t("Actual")}
                      </TableHead>
                      <TableHead className="w-[15%] text-center">
                        {t("Bin Location")}
                      </TableHead>
                      <TableHead className="w-[15%] text-center">
                        {t("Batch Info")}
                      </TableHead>
                      <TableHead className="text-center">
                        {t("Image")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Tính toán phân trang
                      const totalTableItems = confirmItems.length;
                      const totalTablePages =
                        Math.ceil(totalTableItems / tableItemsPerPage) || 1;
                      const startTableIndex =
                        (tablePage - 1) * tableItemsPerPage;
                      const paginatedConfirmItems = confirmItems.slice(
                        startTableIndex,
                        startTableIndex + tableItemsPerPage,
                      );

                      return (
                        <>
                          {paginatedConfirmItems.map((item, relativeIndex) => {
                            // TÌM INDEX GỐC TRONG MẢNG `confirmItems` ĐỂ CẬP NHẬT ĐÚNG DÒNG
                            const absoluteIdx = confirmItems.findIndex(
                              (i) => i.detailId === item.detailId,
                            );

                            const actual = Number(item.actualQty);
                            const isFilled = item.actualQty !== "";
                            const isMatch =
                              isFilled && actual === item.expectedQty;
                            const isShort =
                              isFilled && actual < item.expectedQty;
                            const isOver =
                              isFilled && actual > item.expectedQty;

                            return (
                              <TableRow
                                key={item.detailId}
                                className={
                                  isMatch
                                    ? "bg-emerald-50/40"
                                    : "bg-yellow-50/30"
                                }
                              >
                                <TableCell className="pl-6 py-4 align-middle">
                                  <div className="flex items-start gap-3">
                                    <div
                                      className={`mt-1 p-1.5 rounded-full shrink-0 ${isMatch ? "bg-emerald-100 text-emerald-600" : isShort || isOver ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"}`}
                                    >
                                      <Box className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-slate-800">
                                        {item.materialName}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-1.5 py-0 border-slate-200 bg-white font-mono text-slate-500"
                                        >
                                          {item.materialCode}
                                        </Badge>
                                        <span className="text-xs text-slate-400">
                                          {item.unit}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell className="text-center pt-5 align-baseline">
                                  <div className="flex items-center justify-center gap-2">
                                    <Truck className="w-3 h-3 text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded text-center">
                                      {item.supplierName || t("N/A")}
                                    </span>
                                  </div>
                                </TableCell>

                                <TableCell className="text-center align-top pt-5 align-baseline">
                                  <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                    {item.expectedQty}
                                  </span>
                                </TableCell>

                                <TableCell className="align-top pt-3 align-baseline">
                                  <div className="flex flex-col gap-1">
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        min={0}
                                        className={`text-center font-bold h-9 pl-6 ${item.actualQty === "" ? "border-red-300 bg-red-50" : isShort ? "border-amber-400 text-amber-700 bg-amber-50" : isOver ? "border-red-400 text-red-700 bg-red-50" : "border-emerald-400 text-emerald-700 bg-emerald-50"}`}
                                        placeholder="0"
                                        value={item.actualQty}
                                        onChange={(e) => {
                                          if (
                                            e.target.value.length <= 5 &&
                                            Number(e.target.value) >= 0
                                          ) {
                                            updateConfirmItem(
                                              absoluteIdx,
                                              "actualQty",
                                              e.target.value,
                                            );
                                          }
                                        }}
                                      />
                                      {isShort && (
                                        <AlertTriangle className="w-3 h-3 text-amber-500 absolute left-2 top-3" />
                                      )}
                                    </div>
                                    {(isShort || isOver) && (
                                      <p className="text-[10px] text-center font-medium text-slate-500">
                                        {t("Diff")}: {actual - item.expectedQty}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>

                                <TableCell className="align-top pt-3 align-baseline">
                                  <Select
                                    value={item.binLocationId}
                                    onValueChange={(val) =>
                                      updateConfirmItem(
                                        absoluteIdx,
                                        "binLocationId",
                                        val,
                                      )
                                    }
                                  >
                                    <SelectTrigger
                                      className={`h-9 text-md w-full ${!item.binLocationId ? "border-red-300 bg-red-50" : "border-slate-300"}`}
                                    >
                                      <SelectValue
                                        placeholder={t("Select Bin")}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {binLocations.map((bin) => (
                                        <SelectItem
                                          key={bin.binId}
                                          value={bin.binId.toString()}
                                        >
                                          {bin.warehouse?.name} - {bin.code}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                <TableCell className="align-top pt-3 pb-4 align-baseline">
                                  <div className="flex flex-col gap-2">
                                    <div className="relative">
                                      <QrCode
                                        className={`w-4 h-4 absolute left-1 top-2.5 ml-2 text-slate-500 ${!item.batchCode ? "text-red-400" : "text-slate-400"}`}
                                      />
                                      <Input
                                        className={`h-9 text-xs pl-10 w-full ${!item.batchCode ? "border-red-300 bg-red-50" : "border-slate-300"}`}
                                        placeholder={t("Batch Code")}
                                        value={item.batchCode}
                                        onChange={(e) =>
                                          updateConfirmItem(
                                            absoluteIdx,
                                            "batchCode",
                                            e.target.value,
                                          )
                                        }
                                      />
                                    </div>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant={"outline"}
                                          className={cn(
                                            "h-9 w-full justify-start text-left text-md pl-2 font-normal gap-1 bg-white hover:bg-white",
                                            !item.mfgDate
                                              ? "border-red-200 text-muted-foreground bg-red-50"
                                              : "border-slate-300",
                                          )}
                                        >
                                          <CalendarIcon className="mr-2 h-3 w-3 text-slate-500" />
                                          <span className="text-gray-600">
                                            {item.mfgDate
                                              ? format(
                                                  new Date(item.mfgDate),
                                                  "dd/MM/yyyy",
                                                )
                                              : t("MFG date")}
                                          </span>
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                      >
                                        <Calendar
                                          mode="single"
                                          selected={
                                            item.mfgDate
                                              ? new Date(item.mfgDate)
                                              : undefined
                                          }
                                          disabled={(date) => date > new Date()}
                                          onSelect={(date) => {
                                            if (date) {
                                              const dString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                                              updateConfirmItem(
                                                absoluteIdx,
                                                "mfgDate",
                                                dString,
                                              );
                                            } else {
                                              updateConfirmItem(
                                                absoluteIdx,
                                                "mfgDate",
                                                "",
                                              );
                                            }
                                          }}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                </TableCell>

                                <TableCell className="align-top pt-3 text-center">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-9 w-9 rounded-full ${item.certificateImage ? "text-indigo-600 bg-indigo-50 border-indigo-100" : "text-slate-400 hover:bg-slate-100 hover:text-indigo-600"}`}
                                      >
                                        <ImageIcon className="w-4 h-4" />
                                      </Button>
                                    </DialogTrigger>
                                    {item.certificateImage ? (
                                      <div className="text-emerald-600 mt-1 text-xs font-semibold">
                                        {t("Attached")}
                                      </div>
                                    ) : (
                                      <div className="text-red-500 mt-1 text-xs font-semibold">
                                        {t("No Image")}
                                      </div>
                                    )}
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          {t("Certificate Image")}
                                        </DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <Input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) =>
                                            handleImageUpload(absoluteIdx, e)
                                          }
                                        />
                                        {item.certificateImage && (
                                          <div className="border rounded-md p-2 bg-slate-50 flex flex-col gap-2">
                                            <div className="flex justify-center bg-white rounded border border-slate-100 py-2">
                                              <img
                                                src={item.certificateImage}
                                                alt="Cert"
                                                className="max-h-[400px] object-contain"
                                              />
                                            </div>
                                            <Button
                                              variant="destructive"
                                              onClick={() =>
                                                updateConfirmItem(
                                                  absoluteIdx,
                                                  "certificateImage",
                                                  "",
                                                )
                                              }
                                            >
                                              <Trash2 className="w-4 h-4 mr-2" />{" "}
                                              {t("Remove Image")}
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>

              {(() => {
                const totalTablePages =
                  Math.ceil(confirmItems.length / tableItemsPerPage) || 1;
                const startTableIndex = (tablePage - 1) * tableItemsPerPage;

                return totalTablePages > 1 ? (
                  <div className="px-6 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50/50 shrink-0 mt-auto">
                    <span className="text-xs text-slate-500">
                      {t("Showing")} {startTableIndex + 1}-
                      {Math.min(
                        startTableIndex + tableItemsPerPage,
                        confirmItems.length,
                      )}{" "}
                      {t("of")} {confirmItems.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => setTablePage((p) => Math.max(1, p - 1))}
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
                          setTablePage((p) => Math.min(totalTablePages, p + 1))
                        }
                        disabled={tablePage === totalTablePages}
                      >
                        {t("Next")} <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ) : null;
              })()}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
