"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Loader2,
  FileWarning,
  CalendarDays,
  Receipt,
  ChevronLeft,
  ChevronRight,
  FileText,
  PackageX,
  MessageSquare,
  ArrowRight,
  User,
  PackagePlus,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  purchasingIncidentApi,
  PurchasingIncidentDetailDto,
} from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { formatPascalCase } from "@/lib/format-pascal-case";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/custom/date-time-picker";
import { ImageGallery } from "@/components/ui/custom/image-gallery";

export default function PurchasingIncidentDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [incident, setIncident] = useState<PurchasingIncidentDetailDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 5;

  // States: Modal Yêu cầu đền bù
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<
    Date | undefined
  >(undefined);
  const [supplierNote, setSupplierNote] = useState("");
  const [supplementaryItems, setSupplementaryItems] = useState<
    {
      materialId: number;
      name: string;
      supplementaryQuantity: number;
    }[]
  >([]);

  useEffect(() => {
    const fetchIncidentDetail = async () => {
      setIsLoading(true);
      try {
        const res = await purchasingIncidentApi.getIncidentDetail(id);
        setIncident(res.data);
      } catch (error: any) {
        console.error("Failed to fetch purchasing incident detail", error);
        toast.error(
          error.response?.data?.message || t("Incident report not found."),
        );
        router.push("/purchasing/incident-reports");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchIncidentDetail();
  }, [id, router, t]);

  const handleOpenProcessModal = () => {
    const details = incident?.items || [];
    const itemsToReplace = details
      .filter((item: any) => {
        const shortage = Math.max(
          0,
          (item.orderedQuantity || 0) - (item.actualQuantity || 0),
        );
        return item.failQuantity > 0 || shortage > 0;
      })
      .map((item: any) => {
        const shortage = Math.max(
          0,
          (item.orderedQuantity || 0) - (item.actualQuantity || 0),
        );
        const totalToSupplement = (item.failQuantity || 0) + shortage;

        return {
          materialId: item.materialId,
          name: item.materialName || `Item #${item.materialId}`,
          supplementaryQuantity: totalToSupplement,
        };
      });

    setSupplementaryItems(itemsToReplace);
    setExpectedDeliveryDate(undefined);
    setSupplierNote("");
    setIsProcessModalOpen(true);
  };

  const handleSubmitProcess = async () => {
    if (!expectedDeliveryDate)
      return toast.error(t("Please select an expected delivery date."));
    if (!supplierNote.trim())
      return toast.error(
        t("Please provide a supplier note detailing the replacement request."),
      );
    if (!supplementaryItems || supplementaryItems.length === 0)
      return toast.error(t("There are no items to request for replacement."));

    const invalidItems = supplementaryItems.filter(
      (i) => !i.supplementaryQuantity || Number(i.supplementaryQuantity) <= 0,
    );
    if (invalidItems.length > 0)
      return toast.error(
        t("Replacement quantity must be greater than 0 for all items."),
      );

    setIsProcessing(true);
    try {
      const payload = {
        supplierNote: supplierNote.trim(),
        expectedDeliveryDate: expectedDeliveryDate.toISOString(),
        items: supplementaryItems.map((i) => ({
          materialId: i.materialId,
          supplementaryQuantity: Number(i.supplementaryQuantity.toFixed(3)),
        })),
      };

      await purchasingIncidentApi.createSupplementaryReceipt(id, payload);
      toast.success(t("Supplementary receipt created successfully."));
      setIsProcessModalOpen(false);
      router.push("/purchasing/incident-reports");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
          t("Failed to create supplementary receipt."),
      );
    } finally {
      setIsProcessing(false);
    }
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

  if (isLoading || !incident) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">
            {t("Loading incident details...")}
          </p>
        </div>
      </div>
    );
  }

  const isPurchasingPending = incident.status === "PendingPurchasingAction";

  const totalTableItems = incident.items.length;
  const totalTablePages = Math.ceil(totalTableItems / tableItemsPerPage) || 1;
  const startTableIndex = (tablePage - 1) * tableItemsPerPage;
  const paginatedItems = incident.items.slice(
    startTableIndex,
    startTableIndex + tableItemsPerPage,
  );

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Incident Details")} #${incident.incidentCode}`} />

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
              <div className="hidden md:flex items-center gap-3 border-l border-slate-200 pl-4">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {t("Incident Report")}
                </h1>
                <Badge
                  className={
                    isPurchasingPending || incident.status.includes("Pending")
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                      : "bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
                  }
                >
                  {isPurchasingPending
                    ? t("Pending Action")
                    : t(formatPascalCase(incident.status))}
                </Badge>
              </div>
            </div>

            {/* PURCHASING ACTIONS */}
            {isPurchasingPending && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                onClick={handleOpenProcessModal}
              >
                {t("Handle Incident")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* CỘT TRÁI: THÔNG TIN CHUNG */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white gap-0 pb-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    {t("General Information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Incident Code")}
                    </span>
                    <div className="flex items-center gap-2 text-amber-700 font-medium bg-amber-50 w-fit px-2 py-1 rounded border border-amber-100">
                      <FileWarning className="w-4 h-4 text-amber-500" />
                      {incident.incidentCode}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Related Receipt")}
                    </span>
                    <div className="flex items-center gap-2 text-indigo-700 font-medium bg-indigo-50 w-fit px-2 py-1 rounded border border-indigo-100">
                      <Receipt className="w-4 h-4 text-indigo-500" />
                      {incident.receiptCode || `#${incident.receiptId}`}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Reported By")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <User className="w-4 h-4 text-slate-400" />
                      {incident.qcCheck?.checkedByName ||
                        `ID: ${incident.qcCheck?.checkedBy}`}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Reported At")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-700 text-md">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      {formatDateTime(incident.createdAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm gap-0 pb-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-amber-600" />
                    {t("Staff Description")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                    "
                    {incident.description ||
                      t("No general description provided.")}
                    "
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* CỘT PHẢI: DANH SÁCH VẬT TƯ LỖI TỪ KHO */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white flex flex-col min-h-[500px] gap-0">
                <CardHeader className="border-b border-slate-100 py-4 flex flex-row items-center justify-between shrink-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pb-3">
                    <PackageX className="w-5 h-5 text-rose-600" />
                    {t("Defective Materials List")}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 text-slate-700"
                  >
                    {totalTableItems} {t("Items")}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
                  <div className="[&>div]:max-h-[500px] [&>div]:min-h-[500px] [&>div]:overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[20%] pl-6">
                            {t("Material")}
                          </TableHead>

                          <TableHead className="w-[10%] text-center text-slate-700">
                            <div className="flex flex-col text-xs font-semibold">
                              <span>{t("Ordered")}</span>
                              <span className="text-[10px] text-slate-400 font-normal uppercase">
                                {t("Contracted")}
                              </span>
                            </div>
                          </TableHead>
                          <TableHead className="w-[10%] text-center text-slate-700">
                            <div className="flex flex-col text-xs font-semibold">
                              <span>{t("Actual")}</span>
                              <span className="text-[10px] text-slate-400 font-normal uppercase">
                                {t("Received")}
                              </span>
                            </div>
                          </TableHead>
                          <TableHead className="w-[10%] text-center text-emerald-700">
                            <div className="flex flex-col text-xs font-semibold">
                              <span>{t("Passed")}</span>
                              <span className="text-[10px] text-emerald-600/70 font-normal uppercase">
                                {t("QC OK")}
                              </span>
                            </div>
                          </TableHead>

                          <TableHead className="w-[10%] text-center text-amber-700">
                            <div className="flex flex-col text-xs font-semibold">
                              <span>{t("Defect Breakdown")}</span>
                              <span className="text-[10px] text-amber-600 font-normal uppercase">
                                {t("Quality & Damage")}
                              </span>
                            </div>
                          </TableHead>

                          <TableHead className="w-[10%] text-center text-rose-700 font-bold">
                            {t("Total Failed")}
                          </TableHead>
                          <TableHead className="w-[20%] pr-6">
                            {t("Staff Reason & Evidence")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedItems.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="h-32 text-center text-slate-500"
                            >
                              {t("No items found.")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedItems.map((item, idx) => (
                            <TableRow key={idx} className="hover:bg-slate-50">
                              <TableCell className="pl-6 py-4 align-top">
                                <div className="flex flex-col">
                                  <p className="text-sm font-semibold text-slate-800">
                                    {item.materialName ||
                                      `Item #${item.materialId}`}
                                  </p>
                                </div>
                              </TableCell>

                              <TableCell className="text-center align-top pt-4">
                                <span className="font-medium text-slate-700">
                                  {item.orderedQuantity}
                                </span>
                              </TableCell>

                              <TableCell className="text-center align-top pt-4">
                                <span className="font-medium text-slate-700">
                                  {item.actualQuantity}
                                </span>
                              </TableCell>

                              <TableCell className="text-center align-top pt-4">
                                <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                  {item.passQuantity}
                                </span>
                              </TableCell>

                              <TableCell className="align-top pt-3 text-center">
                                <div className="inline-flex divide-x divide-slate-200 border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                                  <div className="flex flex-col items-center px-3 py-1.5 min-w-[70px] hover:bg-slate-50 transition-colors">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                                      {t("Quality")}
                                    </span>
                                    <span className="text-sm font-bold text-amber-600">
                                      {item.failQuantityQuality || 0}
                                    </span>
                                  </div>

                                  <div className="flex flex-col items-center px-3 py-1.5 min-w-[70px] hover:bg-slate-50 transition-colors">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                                      {t("Damage")}
                                    </span>
                                    <span className="text-sm font-bold text-amber-600">
                                      {item.failQuantityDamage || 0}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="text-center align-top pt-4">
                                <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200 shadow-sm">
                                  {item.failQuantity}
                                </Badge>
                              </TableCell>

                              <TableCell className="pr-6 align-top pt-4">
                                <div className="flex flex-col gap-2">
                                  <p className="text-sm text-slate-600 italic bg-slate-50 p-2 rounded-md border border-slate-100">
                                    "
                                    {item.failReason ||
                                      t("No specific reason provided")}
                                    "
                                  </p>
                                  {item.evidenceImages !== null &&
                                    item.evidenceImages.length > 0 && (
                                      <div className="mt-1">
                                        <ImageGallery
                                          images={item.evidenceImages}
                                          isReadOnly={true}
                                          maxVisible={3}
                                        />
                                      </div>
                                    )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {totalTablePages > 1 && (
                    <div className="px-6 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50/50 shrink-0 mt-auto">
                      <span className="text-xs text-slate-500">
                        {t("Showing")} {startTableIndex + 1}-
                        {Math.min(
                          startTableIndex + tableItemsPerPage,
                          totalTableItems,
                        )}{" "}
                        {t("of")} {totalTableItems}
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
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL YÊU CẦU ĐỀN BÙ / BỔ SUNG */}
      <Dialog
        open={isProcessModalOpen}
        onOpenChange={(open) => {
          if (!open) setIsProcessModalOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-[800px] p-0 gap-0 overflow-hidden border-0 shadow-lg bg-white">
          <DialogHeader className="pt-5 pb-4 px-6 border-b border-slate-100 bg-white">
            <DialogTitle className="text-indigo-700 flex items-center gap-2 text-lg">
              <PackagePlus className="w-5 h-5" />
              {t("Create Supplementary Receipt")}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5 bg-white max-h-[65vh] overflow-y-auto">
            <p className="text-sm text-slate-700">
              {t(
                "Request replacement items from the supplier to resolve this incident.",
              )}
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {t("Expected Delivery Date")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <DateTimePicker
                value={expectedDeliveryDate}
                onChange={setExpectedDeliveryDate}
                placeholder={t("Select date and time...")}
                disablePastDates
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {t("Supplier Note")} <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder={t(
                  "Enter any notes for the supplier regarding this replacement...",
                )}
                className="min-h-[80px] resize-none focus-visible:ring-indigo-500 bg-white"
                value={supplierNote}
                onChange={(e) => setSupplierNote(e.target.value)}
              />
            </div>
            <div className="space-y-3 pt-2">
              <label className="text-sm font-medium text-slate-700">
                {t("Replacement Items & Quantities")}
              </label>
              <Table className="border border-slate-100 rounded-md">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[45%] pl-4">
                      {t("Material")}
                    </TableHead>
                    <TableHead className="w-[15%] text-center text-amber-600">
                      {t("Shortage")}
                    </TableHead>
                    <TableHead className="w-[15%] text-center text-rose-600">
                      {t("Failed")}
                    </TableHead>
                    <TableHead className="w-[25%] text-center">
                      {t("Request Quantity")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplementaryItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-6 text-slate-500"
                      >
                        {t("No items to replace or supplement.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    supplementaryItems.map((item, idx) => {
                      // Tìm lại thông tin gốc để hiển thị
                      const originalItem = incident?.items.find(
                        (i: any) => i.materialId === item.materialId,
                      );
                      const shortage = Math.max(
                        0,
                        (originalItem?.orderedQuantity || 0) -
                          (originalItem?.actualQuantity || 0),
                      );
                      const failed = originalItem?.failQuantity || 0;

                      return (
                        <TableRow key={item.materialId}>
                          <TableCell className="font-medium text-slate-700 py-3 pl-4">
                            {item.name}
                          </TableCell>

                          <TableCell className="text-center font-bold text-amber-600">
                            {Number(shortage.toFixed(3))}
                          </TableCell>

                          <TableCell className="text-center font-bold text-rose-600">
                            {Number(failed.toFixed(3))}
                          </TableCell>
                          <TableCell className="text-center font-bold text-green-600">
                            {Number(item.supplementaryQuantity.toFixed(3))}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsProcessModalOpen(false)}
              className="text-slate-600 hover:bg-slate-100 hover:text-slate-600"
              disabled={isProcessing}
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleSubmitProcess}
              disabled={isProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {t("Confirm & Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
