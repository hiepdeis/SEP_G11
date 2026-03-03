"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  Search,
  Box,
  MapPin,
  FileSpreadsheet,
  Loader2,
  Calendar as CalendarIcon,
  QrCode,
  Image as ImageIcon,
  Upload,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  BinLocationDto,
  GetInboundRequestListDto,
  staffReceiptApi,
} from "@/services/receipt-service";
import { toast } from "sonner";
import { showConfirmToast } from "@/hooks/confirm-toast";
import * as XLSX from "xlsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface InboundProcessItem {
  detailId: number;
  materialCode: string;
  materialName: string;
  unit: string;
  expectedQty: number;
  actualQty: number | "";
  binLocationId: string;
  batchCode: string;
  mfgDate: string;
  certificateImage: string;
  note: string;
}

export default function StaffInboundProcessPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<InboundProcessItem[]>([]);
  const [receipt, setReceipt] = useState<GetInboundRequestListDto | null>(null);
  const [receiptCode, setReceiptCode] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [binLocations, setBinLocations] = useState<BinLocationDto[]>([]);

  useEffect(() => {
    const initData = async () => {
      try {
        setIsLoading(true);

        const [receiptRes, binRes] = await Promise.all([
          staffReceiptApi.getInboundRequestDetail(id),
          staffReceiptApi.getAllBinLocation(),
        ]);

        setReceipt(receiptRes.data);
        setReceiptCode(receiptRes.data.receiptCode);

        setBinLocations(binRes.data || []);

        const processItems: InboundProcessItem[] = receiptRes.data.items.map(
          (i) => ({
            detailId: i.detailId,
            materialCode: i.materialCode,
            materialName: i.materialName,
            unit: i.unit || "Unit",
            expectedQty: i.quantity || 0,
            actualQty: "",
            binLocationId: "",
            batchCode: "",
            mfgDate: "",
            certificateImage: "",
            note: "",
          }),
        );

        setItems(processItems);
      } catch (error) {
        console.error("Error loading init data:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) initData();
  }, [id]);

  const handleImageUpload = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateItem(index, "certificateImage", reader.result as string);
        toast.success("Certificate image attached");
      };
      reader.readAsDataURL(file);
    }
  };

  const excelDateToInputDate = (input: any): string => {
    if (!input) return "";

    let date: Date;

    if (typeof input === "number") {
      date = new Date(Math.round((input - 25569) * 86400 * 1000));
    }
    else if (input instanceof Date) {
      date = input;
    }
    else if (
      typeof input === "string" &&
      /^\d{1,2}[/\\-]\d{1,2}[/\\-]\d{4}$/.test(input)
    ) {
      const parts = input.split(/[\/\\-]/);
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];

      return `${year}-${month}-${day}`;
    }
    else {
      const d = new Date(input);
      if (!isNaN(d.getTime())) {
        date = d;
      } else {
        return "";
      }
    }

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const wsName = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws, { header: "A" });

        const newItems = [...items];
        let updatedCount = 0;

        data.forEach((row: any, index) => {
          if (index === 0) return;

          const matCode = row["B"]?.toString().trim();
          if (!matCode) return;

          const itemIndex = newItems.findIndex(
            (i) => i.materialCode === matCode,
          );
          if (itemIndex > -1) {
            const actualQty = row["G"];
            const binCode = row["H"];
            const batch = row["I"];
            const mfg = row["J"];
            const note = row["K"];

            if (actualQty !== undefined) {
              newItems[itemIndex].actualQty = Number(actualQty);
              const foundBin = binLocations.find((b) => b.code === binCode);
              if (foundBin)
                newItems[itemIndex].binLocationId = foundBin.binId.toString();
              if (batch) newItems[itemIndex].batchCode = batch.toString();
              if (mfg) {
                console.log(mfg);

                const formattedDate = excelDateToInputDate(mfg);

                if (formattedDate) {
                  const parsedDate = new Date(formattedDate);
                  const today = new Date();

                  today.setHours(0, 0, 0, 0);

                  if (parsedDate > today) {
                    toast.error(
                      `Row ${itemIndex + 1}: MFG Date cannot be in the future.`,
                    );
                    newItems[itemIndex].mfgDate = "";
                  } else {
                    newItems[itemIndex].mfgDate = formattedDate;
                  }
                }
              }
              if (note) newItems[itemIndex].note = note.toString();
              updatedCount++;
            }
          }
        });

        setItems(newItems);
        toast.success(`Updated ${updatedCount} items from Excel`);
      } catch (error) {
        console.error(error);
        toast.error("Error parsing Excel file");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const updateItem = (
    index: number,
    field: keyof InboundProcessItem,
    value: any,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async () => {
    const invalidQty = items.filter((i) => i.actualQty === "");
    if (invalidQty.length > 0)
      return toast.error(`Enter Actual Quantity for all items.`);

    const missingBin = items.filter((i) => !i.binLocationId);
    if (missingBin.length > 0)
      return toast.error(`Select Bin Location for all items.`);

    const missingBatch = items.filter((i) => !i.batchCode);
    if (missingBatch.length > 0)
      return toast.error(`Select Batch Code for all items.`);

    const missingMfgDate = items.filter((i) => !i.mfgDate);
    if (missingMfgDate.length > 0)
      return toast.error(`Select Manufacturing Date (MFG Date) for all items.`);

    const missingImage = items.filter((i) => !i.certificateImage);
    if (missingImage.length > 0)
      return toast.error(`Select Certificate Image for all items.`);

    showConfirmToast({
      title: "Confirm Inbound Completion?",
      description:
        "Inventory will be updated. Ensure physical count is correct.",
      confirmLabel: "Yes, Confirm",
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const payload = {
            items: items.map((i) => ({
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

          toast.success("Inbound confirmed successfully!");
          router.push("/staff/import-request");
        } catch (error: any) {
          toast.error(
            error.response?.data?.message || "Failed to confirm inbound",
          );
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const filledCount = items.filter((i) => i.actualQty !== "").length;
  const progressPercent =
    items.length > 0 ? (filledCount / items.length) * 100 : 0;

  const filteredItems = items.filter(
    (i) =>
      i.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.materialName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
        <Header title={`Processing Inbound #${receiptCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          {/* Top Control Bar */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => router.push(`/staff/import-request/` + id)}
                className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Cancel & Back
              </Button>

              <div className="flex gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={handleExcelUpload}
                />
                <Button
                  variant="outline"
                  className="bg-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Import Excel
                </Button>

                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Confirm Inbound
                </Button>
              </div>
            </div>

            {/* Progress & Search */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 w-full space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      Checking Progress
                    </span>
                    <span className="text-slate-500">
                      {filledCount} / {items.length} items
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                <div className="w-full md:w-1/3 relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Find material..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Input Table */}
          <Card className="border-slate-200 shadow-sm overflow-hidden min-h-[400px] pt-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/75">
                  <TableRow>
                    <TableHead className="w-[25%] pl-6">
                      Material Info
                    </TableHead>
                    <TableHead className="w-[15%] text-center">
                      Warehouse
                    </TableHead>
                    <TableHead className="w-[10%] text-center">
                      Required
                    </TableHead>
                    <TableHead className="w-[10%] text-center">
                      Actual
                    </TableHead>
                    <TableHead className="w-[15%] text-center">
                      Bin Location
                    </TableHead>
                    <TableHead className="w-[25%] text-center">
                      Batch Info (Code/Date)
                    </TableHead>
                    <TableHead className="text-center">Image</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, index) => {
                    const actual = Number(item.actualQty);
                    const isFilled = item.actualQty !== "";
                    const isMatch = isFilled && actual === item.expectedQty;
                    const isShort = isFilled && actual < item.expectedQty;
                    const isOver = isFilled && actual > item.expectedQty;

                    return (
                      <TableRow
                        key={item.detailId}
                        className={
                          isMatch
                            ? "bg-emerald-50/40 hover:bg-emerald-50/60"
                            : "hover:bg-slate-50"
                        }
                      >
                        {/* 1. Material Info */}
                        <TableCell className="pl-6 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-1 p-1.5 rounded-full shrink-0 ${
                                isMatch
                                  ? "bg-emerald-100 text-emerald-600"
                                  : isShort || isOver
                                    ? "bg-amber-100 text-amber-600"
                                    : "bg-slate-100 text-slate-400"
                              }`}
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

                        <TableCell className="text-center align-top pt-5">
                          <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            {receipt?.warehouseName}
                          </span>
                        </TableCell>

                        {/* 2. Expected */}
                        <TableCell className="text-center align-top pt-5">
                          <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            {item.expectedQty}
                          </span>
                        </TableCell>

                        {/* 3. Actual Qty */}
                        <TableCell className="align-top pt-3">
                          <div className="flex flex-col gap-1">
                            <div className="relative">
                              <Input
                                type="number"
                                min={0}
                                className={`text-center font-bold h-9 pl-6 ${
                                  item.actualQty === ""
                                    ? "border-red-300 bg-red-50 focus-visible:ring-red-400 placeholder:text-red-300/70"
                                    : isShort
                                      ? "border-amber-400 text-amber-700 bg-amber-50"
                                      : isOver
                                        ? "border-red-400 text-red-700 bg-red-50"
                                        : isMatch
                                          ? "border-emerald-400 text-emerald-700 bg-emerald-50"
                                          : ""
                                }`}
                                placeholder="0"
                                value={item.actualQty}
                                onChange={(e) => {
                                  if (
                                    e.target.value.length <= 5 &&
                                    Number(e.target.value) >= 0
                                  ) {
                                    updateItem(
                                      index,
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
                                Diff: {actual - item.expectedQty}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* 4. Bin Location */}
                        <TableCell className="align-top pt-3">
                          <Select
                            value={item.binLocationId}
                            onValueChange={(val) =>
                              updateItem(index, "binLocationId", val)
                            }
                          >
                            <SelectTrigger
                              className={`h-9 text-md w-full ${
                                !item.binLocationId
                                  ? "border-red-300 bg-red-50 focus:ring-red-400"
                                  : "border-slate-300"
                              }`}
                            >
                              <SelectValue placeholder="Select Bin" />
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

                        {/* 5. Batch & Date */}
                        <TableCell className="align-top pt-3">
                          <div className="flex flex-col gap-2">
                            <div className="relative">
                              <QrCode
                                className={`w-3 h-3 absolute left-2 top-3 ml-2 ${
                                  !item.batchCode
                                    ? "text-red-400"
                                    : "text-slate-400"
                                }`}
                              />
                              <Input
                                className={`h-9 text-xs pl-10 w-full ${
                                  !item.batchCode
                                    ? "border-red-300 bg-red-50 focus-visible:ring-red-400 placeholder:text-red-300/70"
                                    : "border-slate-300"
                                }`}
                                placeholder="Batch Code"
                                value={item.batchCode}
                                onChange={(e) =>
                                  updateItem(index, "batchCode", e.target.value)
                                }
                              />
                            </div>
                            <div className="relative">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "h-9 w-full justify-start text-left text-xs pl-2 font-normal gap-1 bg-transparent hover:bg-transparent hover:text-black",
                                      !item.mfgDate
                                        ? "text-muted-foreground border-red-200 hover:bg-red-50 hover:text-red-600"
                                        : "border-slate-300",
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-3 w-3 opacity-50" />
                                    <span className="text-sm">
                                      {item.mfgDate ? (
                                        format(
                                          new Date(item.mfgDate),
                                          "dd/MM/yyyy",
                                        )
                                      ) : (
                                        <span className="text-sm">
                                          Pick date
                                        </span>
                                      )}
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
                                        const year = date.getFullYear();
                                        const month = String(
                                          date.getMonth() + 1,
                                        ).padStart(2, "0");
                                        const day = String(
                                          date.getDate(),
                                        ).padStart(2, "0");
                                        const dateString = `${year}-${month}-${day}`;

                                        updateItem(
                                          index,
                                          "mfgDate",
                                          dateString,
                                        );
                                      } else {
                                        updateItem(index, "mfgDate", "");
                                      }
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </TableCell>

                        {/* 6. Certificate Image */}
                        <TableCell className="align-top pt-3 text-center">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-9 w-9 rounded-full transition-all ${
                                  item.certificateImage
                                    ? "text-indigo-600 bg-indigo-50 border border-indigo-100 shadow-sm"
                                    : "text-slate-400 hover:bg-primary"
                                }`}
                              >
                                <ImageIcon className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  Certificate for {item.materialName}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(index, e)}
                                  className="cursor-pointer"
                                />
                                {item.certificateImage && (
                                  <div className="border rounded-md p-2 bg-slate-50 flex flex-col gap-2">
                                    <div className="flex justify-center bg-white rounded border border-slate-100 py-2">
                                      <img
                                        src={item.certificateImage}
                                        alt="Cert"
                                        className="max-h-[400px] object-contain shadow-sm"
                                      />
                                    </div>

                                    <Button
                                      variant="destructive"
                                      className="w-full flex items-center justify-center gap-2"
                                      onClick={() =>
                                        updateItem(
                                          index,
                                          "certificateImage",
                                          "",
                                        )
                                      }
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Remove Image
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          <div className="pt-2 font-bold">
                            {item.certificateImage ? (
                              "Image attached"
                            ) : (
                              <span className="text-red-500">
                                No image attached
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <Search className="w-6 h-6 mb-1 text-slate-300" />
                          <p>No items found matching "{searchTerm}"</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className="border-slate-200 shadow-sm gap-0">
            <CardHeader className="py-3 bg-slate-50 border-b border-slate-100 bg-white">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-700">
                  General Notes / Remarks
                </span>
                <span
                  className={`text-xs ${
                    generalNotes.length > 500
                      ? "text-red-500"
                      : "text-slate-400"
                  }`}
                >
                  {generalNotes.length}/500
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <textarea
                className={`w-full min-h-[80px] p-3 rounded-md border text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 ${
                  generalNotes.length > 500
                    ? "border-red-500 focus-visible:ring-red-500"
                    : "border-slate-200 focus-visible:ring-indigo-500"
                }`}
                placeholder="Add any overall note about this inbound receipt..."
                value={generalNotes}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setGeneralNotes(e.target.value);
                  }
                }}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
