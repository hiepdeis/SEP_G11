"use client";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IncidentItemInput {
  materialId: number;
  materialCode: string;
  materialName: string;
  unit: string;
  orderedQuantity: number;
  passQuantity: number;
  failQuantity: number;
  issueType: string;
  notes: string;
  evidenceImages: string[];
}

export default function StaffIncidentPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

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

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number>(0);

  const [isSubmittingToManager, setIsSubmittingToManager] = useState(false);

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

            return {
              materialId: qcItem.materialId || 0,
              materialCode: receiptItem?.materialCode || "",
              materialName: receiptItem?.materialName || "",
              unit: receiptItem?.unit || "Unit",
              orderedQuantity: receiptItem?.quantity || 0,
              passQuantity: qcItem.passQuantity,
              failQuantity: qcItem.failQuantity,
              issueType: historyDetail ? historyDetail.issueType : "",
              notes: historyDetail
                ? historyDetail.notes || ""
                : qcItem.failReason || "",
              evidenceImages: historyDetail?.evidenceImages || [],
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isViewerOpen || viewerImages.length <= 1) return;

      if (e.key === "ArrowLeft") {
        setViewerIndex((prev) =>
          prev > 0 ? prev - 1 : viewerImages.length - 1,
        );
      } else if (e.key === "ArrowRight") {
        setViewerIndex((prev) =>
          prev < viewerImages.length - 1 ? prev + 1 : 0,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isViewerOpen, viewerImages.length]);

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

  const handleSubmitIncident = async () => {
    if (!incidentDescription.trim())
      return toast.error(t("Please provide an overall incident description."));

    const missingIssue = incidentItems.filter((i) => !i.issueType);
    if (missingIssue.length > 0)
      return toast.error(
        t("Please select an Issue Type for all failed items."),
      );

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
            details: incidentItems.map((i) => ({
              materialId: i.materialId,
              issueType: i.issueType,
              evidenceNote: i.notes.trim(),
              evidenceImages: i.evidenceImages,
            })),
          };

          await staffReceiptsApi.createIncidentReport(id, payload);
          toast.success(t("Incident Report created successfully!"));
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

          router.push(`/staff/inbound-requests`);
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
    const files = Array.from(e.target.files);

    try {
      const base64Images = await Promise.all(
        files.map((file) => {
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
        toast.info(t("Duplicate images"));
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
                onClick={() => router.push(`/staff/inbound-requests`)}
                className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit -ml-2 mb-1 h-8"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to List")}
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
                    {t("Status")}: {t(historicalIncidentData.status)}
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
                      <TableHead className="w-[10%] text-center text-emerald-700">
                        {t("Passed")}
                      </TableHead>
                      <TableHead className="w-[10%] text-center text-red-700 font-bold">
                        {t("Failed")}
                      </TableHead>
                      <TableHead className="w-[20%] text-center">
                        {t("Issue Type")} *
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
                                  <Select
                                    value={item.issueType}
                                    onValueChange={(val) =>
                                      updateItem(absoluteIdx, "issueType", val)
                                    }
                                    disabled={isHistoryView}
                                  >
                                    <SelectTrigger
                                      className={`h-9 w-full ${!item.issueType && !isHistoryView ? "border-rose-300 ring-1 ring-rose-100" : "border-slate-300"} ${isHistoryView ? "bg-slate-50 opacity-80" : ""}`}
                                    >
                                      <SelectValue
                                        placeholder={t("Select type...")}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Quantity">
                                        {t("Quantity")}
                                      </SelectItem>
                                      <SelectItem value="Quality">
                                        {t("Quality")}
                                      </SelectItem>
                                      <SelectItem value="Damage">
                                        {t("Damage")}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
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

                                    {/* Thumbnail Preview */}
                                    {/* Thumbnail Preview (Tối đa 5 ảnh) */}
                                    {item.evidenceImages.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {item.evidenceImages
                                          .slice(0, 5)
                                          .map((img, imgIdx) => {
                                            const isLastVisible = imgIdx === 4;
                                            const remainingCount =
                                              item.evidenceImages.length - 5;
                                            const showOverlay =
                                              isLastVisible &&
                                              remainingCount > 0;

                                            return (
                                              <div
                                                key={imgIdx}
                                                className="relative group cursor-pointer"
                                                onClick={() => {
                                                  setViewerImages(
                                                    item.evidenceImages,
                                                  );
                                                  setViewerIndex(imgIdx);
                                                  setIsViewerOpen(true);
                                                }}
                                              >
                                                <img
                                                  src={img}
                                                  alt="evidence"
                                                  className="w-10 h-10 object-cover rounded border border-slate-200 shadow-sm"
                                                />

                                                {/* Overlay "+ X" */}
                                                {showOverlay && (
                                                  <div className="absolute inset-0 bg-slate-900/60 rounded flex items-center justify-center text-white text-xs font-bold backdrop-blur-[1px]">
                                                    +{remainingCount}
                                                  </div>
                                                )}

                                                {!isHistoryView && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      removeImage(
                                                        absoluteIdx,
                                                        imgIdx,
                                                      );
                                                    }}
                                                    className="absolute -top-1.5 -right-1.5 bg-slate-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-600 shadow-sm z-10"
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          })}
                                      </div>
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
        {/* DIALOG XEM ẢNH PHÓNG TO (LIGHTBOX) */}
        <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
          <DialogContent className="sm:max-w-4xl bg-transparent border-0 shadow-none p-0 flex flex-col items-center justify-center">
            <DialogHeader className="">
              <DialogTitle className=""></DialogTitle>
            </DialogHeader>
            {viewerImages.length > 0 && (
              <div className="relative w-full flex flex-col items-center gap-4">
                <div className="relative group flex items-center justify-center w-full">
                  <img
                    src={viewerImages[viewerIndex]}
                    alt="Enlarged evidence"
                    className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
                  />

                  {viewerImages.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-0 sm:-left-12 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md transition-all opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewerIndex((prev) =>
                            prev > 0 ? prev - 1 : viewerImages.length - 1,
                          );
                        }}
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-0 sm:-right-12 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md transition-all opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewerIndex((prev) =>
                            prev < viewerImages.length - 1 ? prev + 1 : 0,
                          );
                        }}
                      >
                        <ChevronRight className="w-6 h-6" />
                      </Button>
                    </>
                  )}
                </div>

                {viewerImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto max-w-full pb-2 px-2 snap-x">
                    {viewerImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`thumb-${idx}`}
                        onClick={() => setViewerIndex(idx)}
                        className={`w-14 h-14 object-cover rounded-md cursor-pointer border-2 shrink-0 snap-center transition-all ${
                          idx === viewerIndex
                            ? "border-indigo-500 opacity-100 scale-105"
                            : "border-transparent opacity-50 hover:opacity-100"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
