"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  FileWarning,
  ChevronRight,
  CheckCircle,
  ChevronLeft,
  X,
  Camera,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  staffReceiptsApi,
  CreateIncidentReportDto,
  QCCheckDto,
  IncidentReportDto,
  staffIncidentApi,
} from "@/services/import-service";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { showConfirmToast } from "@/hooks/confirm-toast";
import { formatPascalCase } from "@/lib/format-pascal-case";
import { ImageGallery } from "@/components/ui/custom/image-gallery";
import { IncidentExcelHandler } from "@/components/ui/custom/incident-xlxs";

interface IncidentItemInput {
  materialId: number;
  materialCode: string;
  materialName: string;
  unit: string;
  orderedQuantity: number;
  actualQuantity: number;
  passQuantity: number;
  failQuantity: number;
  issueType: string;
  notes: string;
  evidenceImages: string[];
  breakdown: {
    quantity: number;
    quality: number;
    damage: number;
  };
}

export default function StaffIncidentPage({
  role = "staff",
}: {
  role: string;
}) {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const rolePath = role === "manager" ? "manager" : "staff";

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentItems, setIncidentItems] = useState<IncidentItemInput[]>([]);
  const [qcData, setQcData] = useState<QCCheckDto | null>(null);

  const [isHistoryView, setIsHistoryView] = useState(false);
  const [historicalIncidentData, setHistoricalIncidentData] =
    useState<IncidentReportDto | null>(null);

  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 5;

  const [isSubmittingToManager, setIsSubmittingToManager] = useState(false);

  const initData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [receiptRes, qcRes] = await Promise.all([
        staffReceiptsApi.getReceiptDetails(id),
        staffReceiptsApi.getQCCheck(id),
      ]);
      setQcData(qcRes.data);

      const failedQcDetails = qcRes.data.details.filter(
        (q) => q.result === "Fail" || q.failQuantity > 0,
      );

      let existingIncidentData: IncidentReportDto | null = null;

      try {
        const incRes = await staffReceiptsApi.getIncidentReport(id);
        existingIncidentData = incRes.data;
        setIsHistoryView(true);
        setHistoricalIncidentData(existingIncidentData);
        setIncidentDescription(existingIncidentData.description || "");
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.error("Error fetching Incident Report:", error);
        } else {
          setIsHistoryView(false);
          setHistoricalIncidentData(null);
        }
      }

      const itemsToReport: IncidentItemInput[] = failedQcDetails.map(
        (qcItem) => {
          const receiptItem = receiptRes.data.items.find(
            (i) => i.materialId === qcItem.materialId,
          );

          const historyDetail = existingIncidentData?.details.find(
            (d) => d.materialId === qcItem.materialId,
          );

          return {
            materialId: qcItem.materialId || 0,
            materialCode: receiptItem?.materialCode || "",
            materialName: receiptItem?.materialName || "",
            unit: receiptItem?.unit || "Unit",
            orderedQuantity: receiptItem?.quantity || 0,
            actualQuantity: receiptItem?.actualQuantity || 0,
            passQuantity: qcItem.passQuantity,
            failQuantity: qcItem.failQuantity,
            issueType: historyDetail ? historyDetail.issueType : "",
            notes: historyDetail
              ? historyDetail.notes || ""
              : qcItem.failReason || "",
            evidenceImages: historyDetail?.evidenceImages || [],
            breakdown: historyDetail?.breakdown || {
              quantity: 0,
              quality: 0,
              damage: 0,
            },
          };
        },
      );

      setIncidentItems(itemsToReport);
    } catch (error) {
      toast.error(t("Failed to load data for incident report"));
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (id) initData();
  }, [initData, id]);

  useEffect(() => {
    const initData = async () => {
      try {
        setIsLoading(true);

        const [receiptRes, qcRes] = await Promise.all([
          staffReceiptsApi.getReceiptDetails(id),
          staffReceiptsApi.getQCCheck(id),
        ]);
        setQcData(qcRes.data);

        const failedQcDetails = qcRes.data.details.filter(
          (q) => q.result === "Fail" || q.failQuantity > 0,
        );

        let existingIncidentData: IncidentReportDto | null = null;

        try {
          const incRes = await staffReceiptsApi.getIncidentReport(id);
          existingIncidentData = incRes.data;
          setIsHistoryView(true);
          setHistoricalIncidentData(existingIncidentData);
          setIncidentDescription(existingIncidentData.description || "");
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.error("Error fetching Incident Report:", error);
          }
        }

        const itemsToReport: IncidentItemInput[] = failedQcDetails.map(
          (qcItem) => {
            const receiptItem = receiptRes.data.items.find(
              (i) => i.materialId === qcItem.materialId,
            );

            const historyDetail = existingIncidentData?.details.find(
              (d) => d.materialId === qcItem.materialId,
            );

            const orderedQty = receiptItem?.quantity || 0;
            const passQty = qcItem.passQuantity || 0;
            const failQty = qcItem.failQuantity || 0;

            const expectedQuantityShortage = Math.max(0, orderedQty - passQty);

            return {
              materialId: qcItem.materialId || 0,
              materialCode: receiptItem?.materialCode || "",
              materialName: receiptItem?.materialName || "",
              unit: receiptItem?.unit || "Unit",
              orderedQuantity: orderedQty,
              actualQuantity: receiptItem?.actualQuantity || 0,
              passQuantity: passQty,
              failQuantity: failQty,
              issueType: "",
              notes: historyDetail
                ? historyDetail.notes || ""
                : qcItem.failReason || "",
              evidenceImages: historyDetail?.evidenceImages || [],
              breakdown: historyDetail?.breakdown || {
                quantity: expectedQuantityShortage,
                quality: 0,
                damage: 0,
              },
            };
          },
        );

        setIncidentItems(itemsToReport);
      } catch (error) {
        toast.error(t("Failed to load data for incident report"));
      } finally {
        setIsLoading(false);
      }
    };
    if (id) initData();
  }, [id, t]);

  const updateItem = (
    index: number,
    field: keyof IncidentItemInput,
    value: any,
  ) => {
    if (isHistoryView) return;

    const newItems = [...incidentItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setIncidentItems(newItems);
  };

  const handleExcelImport = (updatedItems: any[]) => {
    setIncidentItems(updatedItems);
  };

  const handleSubmitIncident = async () => {
    if (!incidentDescription.trim())
      return toast.error(t("Please provide an overall incident description."));

    const invalidBreakdownItem = incidentItems.find((i) => {
      const sum = i.breakdown.quality + i.breakdown.damage;
      return Math.abs(sum - i.failQuantity) > 0.0001;
    });

    if (invalidBreakdownItem) {
      return toast.error(
        t(
          "Breakdown sum (Quality + Damage) for {{name}} must exactly equal its Failed Quantity ({{quantity}}).",
          {
            name: invalidBreakdownItem.materialName,
            quantity: invalidBreakdownItem.failQuantity,
          },
        ),
      );
    }
    const missingNotes = incidentItems.filter((i) => !i.notes.trim());
    if (missingNotes.length > 0)
      return toast.error(
        t("Please provide detailed notes for all failed items."),
      );

    const missingImages = incidentItems.filter(
      (i) => !i.evidenceImages || i.evidenceImages.length === 0,
    );
    if (missingImages.length > 0)
      return toast.error(
        t("Please add at least one evidence image for all failed items."),
      );

    showConfirmToast({
      title: t("Submit Incident Report?"),
      description: t(
        "This report will be sent to the Warehouse Manager for review. Stock will NOT be updated yet.",
      ),
      confirmLabel: t("Yes, Submit"),
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const payload: CreateIncidentReportDto = {
            description: incidentDescription.trim(),
            details: incidentItems.map((i) => {
              const currentBreakdown = i.breakdown;

              return {
                materialId: i.materialId,
                issueType: i.issueType,
                failQuantity: i.failQuantity,
                evidenceNote: i.notes.trim() || null,
                evidenceImages:
                  i.evidenceImages.length > 0 ? i.evidenceImages : null,
                breakdown: currentBreakdown,
              };
            }),
          };
          await staffReceiptsApi.createIncidentReport(id, payload);
          toast.success(t("Incident Report created successfully!"));
          await initData();
        } catch (error: any) {
          toast.error(
            error.response?.data?.message ||
              t("Failed to create incident report"),
          );
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const updateBreakdown = (
    index: number,
    field: "quality" | "damage",
    value: string,
  ) => {
    if (isHistoryView) return;
    const rawValue = Math.max(0, Number(value) || 0);

    setIncidentItems((prev) => {
      const newItems = [...prev];
      const item = newItems[index];

      const totalFail = item.failQuantity;

      const safeValue = Number(Math.min(rawValue, totalFail).toFixed(3));

      let newQuality = item.breakdown.quality;
      let newDamage = item.breakdown.damage;

      if (field === "quality") {
        newQuality = safeValue;
        newDamage = Number((totalFail - newQuality).toFixed(3));
      } else if (field === "damage") {
        newDamage = safeValue;
        newQuality = Number((totalFail - newDamage).toFixed(3));
      }

      const newQuantity = Number(
        (item.orderedQuantity - item.actualQuantity).toFixed(3),
      );

      newItems[index] = {
        ...item,
        breakdown: {
          ...item.breakdown,
          quantity: newQuantity,
          quality: newQuality,
          damage: newDamage,
        },
      };
      return newItems;
    });
  };

  const handleSubmitToManager = () => {
    if (!historicalIncidentData?.incidentId) return;

    showConfirmToast({
      title: t("Submit for Manager Review?"),
      description: t(
        "Are you sure you want to forward this incident report to the Warehouse Manager?",
      ),
      confirmLabel: t("Yes, Submit"),
      onConfirm: async () => {
        setIsSubmittingToManager(true);
        try {
          await staffIncidentApi.submitToManager(
            historicalIncidentData.incidentId,
          );
          toast.success(t("Report submitted to manager successfully!"));

          router.push(`/${rolePath}/incident-reports`);
        } catch (error: any) {
          toast.error(
            error.response?.data?.message || t("Failed to submit report"),
          );
        } finally {
          setIsSubmittingToManager(false);
        }
      },
    });
  };

  const handleImageUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const allFiles = Array.from(e.target.files);

    const imageFiles = allFiles.filter((file) =>
      file.type.startsWith("image/"),
    );

    if (imageFiles.length < allFiles.length) {
      toast.warning(
        t("Only image files are allowed. Non-image files were skipped."),
      );
    }

    if (imageFiles.length === 0) {
      e.target.value = "";
      return;
    }

    try {
      const base64Images = await Promise.all(
        imageFiles.map((file) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
          });
        }),
      );

      const newItems = [...incidentItems];
      const currentImages = newItems[index].evidenceImages || [];

      const uniqueNewImages = base64Images.filter(
        (base64) => !currentImages.includes(base64),
      );

      if (uniqueNewImages.length < base64Images.length) {
        toast.info(t("Duplicated images."));
      }

      newItems[index] = {
        ...newItems[index],
        evidenceImages: [...currentImages, ...uniqueNewImages],
      };

      setIncidentItems(newItems);
    } catch (error) {
      toast.error(t("Failed to process images."));
    } finally {
      e.target.value = "";
    }
  };

  const removeImage = (itemIndex: number, imgIndex: number) => {
    const newItems = [...incidentItems];
    newItems[itemIndex].evidenceImages.splice(imgIndex, 1);
    setIncidentItems(newItems);
  };

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" />
      </div>
    );

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header
          title={`${t("Incident Report")} #${qcData?.receiptCode || id}`}
        />
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit -ml-2 mb-1 h-8"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back")}
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {isHistoryView
                    ? t("Incident Record")
                    : t("Report Delivery Incident")}
                </h1>
                {isHistoryView && historicalIncidentData && (
                  <Badge
                    className={
                      historicalIncidentData.status === "Resolved"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-yellow-100 text-yellow-700"
                    }
                  >
                    {historicalIncidentData.status === "Resolved" ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 mr-1" />
                    )}
                    {t("Status")}:{" "}
                    {t(formatPascalCase(historicalIncidentData.status))}
                  </Badge>
                )}
              </div>
            </div>

            {!isHistoryView ? (
              <Button
                className="bg-red-600 hover:bg-red-700 text-white min-w-[150px] shadow-sm"
                onClick={handleSubmitIncident}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <FileWarning className="w-4 h-4 mr-2" />
                )}
                {t("Submit Report")}
              </Button>
            ) : isHistoryView && historicalIncidentData?.status === "Open" ? (
              <div className="flex flex-col gap-2 items-end">
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md min-w-[200px]"
                  onClick={handleSubmitToManager}
                  disabled={isSubmittingToManager}
                >
                  {isSubmittingToManager ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {t("Submit for Manager Review")}
                </Button>
                <span className="text-xs text-slate-500 italic">
                  {t(
                    "Note: The incident report will be sent to the manager for review and approval.",
                  )}
                </span>
              </div>
            ) : (
              <></>
            )}
          </div>

          {!isHistoryView && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">{t("Action Required")}</h3>
                <p className="text-xs mt-1">
                  {t(
                    "You are creating a report for items that failed QC. Please categorize the issue type and provide details. The inventory will NOT be updated until the Manager resolves this incident.",
                  )}
                </p>
              </div>
            </div>
          )}

          <Card className="border-slate-200 shadow-sm gap-0 pb-0">
            <CardHeader className="border-b border-slate-100 py-4">
              <CardTitle className="text-base">
                {t("Overall Description")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <Textarea
                placeholder={t(
                  "E.g., The delivery truck was delayed and several boxes arrived wet, causing damage to the items inside.",
                )}
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                className={`min-h-[100px] resize-none focus-visible:ring-indigo-600 ${isHistoryView ? "bg-slate-50 cursor-not-allowed opacity-80" : ""}`}
                readOnly={isHistoryView}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col gap-0">
            <CardHeader className="bg-white border-b border-slate-100 shrink-0 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base text-rose-700 flex items-center gap-2 py-4">
                  <AlertTriangle className="w-5 h-5" />
                  {t("Defective Materials")}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="bg-rose-50 text-rose-700 border-rose-200"
                >
                  {incidentItems.length} {t("Items")}
                </Badge>
              </div>

              <IncidentExcelHandler
                items={incidentItems}
                qcData={qcData && qcData}
                onImport={handleExcelImport}
                isHistoryView={isHistoryView}
              />
            </CardHeader>
            <CardContent className="p-0 flex flex-col flex-1">
              <div className="[&>div]:max-h-[350px] [&>div]:min-h-[350px] [&>div]:overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                    <TableRow>
                      <TableHead className="pl-6 w-[25%]">
                        {t("Material")}
                      </TableHead>
                      <TableHead className="w-[10%] text-center">
                        {t("Ordered")}
                      </TableHead>
                      <TableHead className="w-[10%] text-center">
                        {t("Actual")}
                      </TableHead>
                      <TableHead className="w-[10%] text-center text-emerald-700">
                        {t("Passed")}
                      </TableHead>
                      <TableHead className="w-[10%] text-center text-red-700 font-bold">
                        {t("Failed")}
                      </TableHead>
                      <TableHead className="w-[20%] text-center">
                        {t("Defect Breakdown")} *
                      </TableHead>
                      <TableHead className="pr-6 w-[25%]">
                        {t("Detailed Notes")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const totalTableItems = incidentItems.length;
                      const totalTablePages =
                        Math.ceil(totalTableItems / tableItemsPerPage) || 1;
                      const startTableIndex =
                        (tablePage - 1) * tableItemsPerPage;
                      const paginatedIncidentItems = incidentItems.slice(
                        startTableIndex,
                        startTableIndex + tableItemsPerPage,
                      );

                      return (
                        <>
                          {paginatedIncidentItems.map((item) => {
                            const absoluteIdx = incidentItems.findIndex(
                              (i) => i.materialId === item.materialId,
                            );

                            return (
                              <TableRow
                                key={item.materialId}
                                className="bg-red-50/10"
                              >
                                <TableCell className="pl-6 align-top py-4">
                                  <div className="flex flex-col">
                                    <p className="text-sm font-semibold text-slate-800">
                                      {item.materialName}
                                    </p>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                                      {item.materialCode}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center align-top py-4 font-medium text-slate-600">
                                  <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">
                                    {item.orderedQuantity} {item.unit}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center align-top py-4 font-medium text-slate-600">
                                  <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">
                                    {item.actualQuantity} {item.unit}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center align-top py-4 text-emerald-600 font-medium">
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                                    {item.passQuantity} {item.unit}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center align-top py-4">
                                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                                    {item.failQuantity} {item.unit}
                                  </Badge>
                                </TableCell>
                                <TableCell className="align-top pt-3">
                                  <div className="flex flex-col gap-2 bg-slate-50 p-2.5 rounded-md border border-slate-200 shadow-sm">
                                    <div className="flex items-center justify-between text-xs mb-1 border-b border-slate-200 pb-2">
                                      <span className="font-semibold text-slate-700">
                                        {t("Total Failed")}
                                      </span>
                                      <Badge className="bg-red-100 text-red-700 border-red-200 font-bold shadow-sm">
                                        {(
                                          item.failQuantity +
                                          (item.orderedQuantity -
                                            item.actualQuantity)
                                        ).toFixed(3)}
                                      </Badge>
                                    </div>

                                    <div className="flex items-center justify-between text-xs gap-2 mt-1">
                                      <span className="text-slate-500 font-medium">
                                        {t("Quantity")}
                                      </span>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={
                                          (
                                            item.orderedQuantity -
                                            item.actualQuantity
                                          ).toFixed(3) || ""
                                        }
                                        disabled={isHistoryView}
                                        readOnly
                                        className="h-7 w-16 text-center text-xs focus-visible:ring-indigo-600 px-1 font-medium bg-slate-100 min-w-[150px]"
                                      />
                                    </div>

                                    <div className="flex items-center justify-between text-xs gap-2">
                                      <span className="text-slate-500 font-medium">
                                        {t("Quality")}
                                      </span>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={item.breakdown.quality || ""}
                                        onChange={(e) =>
                                          updateBreakdown(
                                            absoluteIdx,
                                            "quality",
                                            e.target.value.slice(0, 9),
                                          )
                                        }
                                        disabled={isHistoryView}
                                        className="h-7 w-16 text-center text-xs focus-visible:ring-indigo-600 px-1 font-medium bg-white min-w-[150px]"
                                      />
                                    </div>

                                    <div className="flex items-center justify-between text-xs gap-2">
                                      <span className="text-slate-500 font-medium">
                                        {t("Damage")}
                                      </span>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={item.breakdown.damage || ""}
                                        onChange={(e) =>
                                          updateBreakdown(
                                            absoluteIdx,
                                            "damage",
                                            e.target.value.slice(0, 9),
                                          )
                                        }
                                        disabled={isHistoryView}
                                        className="h-7 w-16 text-center text-xs focus-visible:ring-indigo-600 px-1 font-medium bg-white min-w-[150px]"
                                      />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="pr-6 align-top pt-3">
                                  <div className="flex flex-col gap-2">
                                    <Input
                                      value={item.notes}
                                      onChange={(e) =>
                                        updateItem(
                                          absoluteIdx,
                                          "notes",
                                          e.target.value,
                                        )
                                      }
                                      className={`h-9 focus-visible:ring-indigo-600 ${isHistoryView ? "bg-slate-50 border-slate-200 opacity-80 pointer-events-none" : ""}`}
                                      placeholder={t("Additional details...")}
                                      readOnly={isHistoryView}
                                    />

                                    {!isHistoryView && (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="file"
                                          multiple
                                          accept="image/*"
                                          className="hidden"
                                          id={`upload-img-${item.materialId}`}
                                          onChange={(e) =>
                                            handleImageUpload(absoluteIdx, e)
                                          }
                                        />
                                        <label
                                          htmlFor={`upload-img-${item.materialId}`}
                                          className="cursor-pointer flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1.5 rounded-md border border-indigo-100 transition-colors w-fit"
                                        >
                                          <Camera className="w-3.5 h-3.5" />
                                          {t("Add Evidence")}
                                        </label>
                                        {item.evidenceImages.length > 0 && (
                                          <span className="text-xs text-slate-500 font-medium">
                                            {item.evidenceImages.length}{" "}
                                            {t("images")}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Thumbnail Preview (Tối đa 5 ảnh) */}
                                    {item.evidenceImages.length > 0 && (
                                      <ImageGallery
                                        images={item.evidenceImages}
                                        isReadOnly={isHistoryView}
                                        onRemove={(imgIdx) =>
                                          removeImage(absoluteIdx, imgIdx)
                                        }
                                      />
                                    )}
                                  </div>
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

              {/* FOOTER ĐIỀU HƯỚNG */}
              {(() => {
                const totalTablePages =
                  Math.ceil(incidentItems.length / tableItemsPerPage) || 1;
                const startTableIndex = (tablePage - 1) * tableItemsPerPage;

                return totalTablePages > 1 ? (
                  <div className="px-6 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50/50 shrink-0 mt-auto">
                    <span className="text-xs text-slate-500">
                      {t("Showing")} {startTableIndex + 1}-
                      {Math.min(
                        startTableIndex + tableItemsPerPage,
                        incidentItems.length,
                      )}{" "}
                      {t("of")} {incidentItems.length}
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
