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
  Box,
  ChevronRight,
  CheckCircle,
  XCircle,
  ChevronLeft,
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
} from "@/services/import-service";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { showConfirmToast } from "@/hooks/confirm-toast";

interface IncidentItemInput {
  materialId: number;
  materialCode: string;
  materialName: string;
  unit: string;
  orderedQuantity: number; // Theo DTO
  passQuantity: number;    // Theo DTO
  failQuantity: number;    // Theo DTO
  issueType: string;
  notes: string;
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
  const [historicalIncidentData, setHistoricalIncidentData] = useState<IncidentReportDto | null>(null);

  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 5;

  useEffect(() => {
    const initData = async () => {
      try {
        setIsLoading(true);

        // 1. Fetch dữ liệu Receipt & QC Check
        const [receiptRes, qcRes] = await Promise.all([
          staffReceiptsApi.getReceiptDetails(id),
          staffReceiptsApi.getQCCheck(id),
        ]);
        setQcData(qcRes.data);

        // Chỉ lấy những vật tư bị Fail từ QC
        const failedQcDetails = qcRes.data.details.filter(
          (q) => q.result === "Fail" || q.failQuantity > 0
        );

        let existingIncidentData: IncidentReportDto | null = null;
        
        // 2. Kiểm tra xem đã có Incident nào tạo trước đó chưa
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

        // 3. Map Items để hiển thị
        const itemsToReport: IncidentItemInput[] = failedQcDetails.map((qcItem) => {
          // Lấy thông tin từ Receipt để có tên và code
          const receiptItem = receiptRes.data.items.find(i => i.materialId === qcItem.materialId);
          
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
            notes: historyDetail ? historyDetail.notes || "" : (qcItem.failReason || ""), // Lấy reason từ QC làm note mặc định
          };
        });

        setIncidentItems(itemsToReport);
      } catch (error) {
        toast.error(t("Failed to load data for incident report"));
      } finally {
        setIsLoading(false);
      }
    };
    if (id) initData();
  }, [id, t]);

  const updateItem = (index: number, field: keyof IncidentItemInput, value: any) => {
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
      return toast.error(t("Please select an Issue Type for all failed items."));

    showConfirmToast({
      title: t("Submit Incident Report?"),
      description: t("This report will be sent to the Warehouse Manager for review. Stock will NOT be updated yet."),
      confirmLabel: t("Yes, Submit"),
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const payload: CreateIncidentReportDto = {
            description: incidentDescription.trim(),
            details: incidentItems.map((i) => ({
              materialId: i.materialId,
              orderedQuantity: i.orderedQuantity,
              passQuantity: i.passQuantity,
              failQuantity: i.failQuantity,
              issueType: i.issueType,
              notes: i.notes.trim() || undefined,
            })),
          };

          await staffReceiptsApi.createIncidentReport(id, payload);
          toast.success(t("Incident Report created successfully!"));
          
          router.push(`/staff/inbound-requests`);
        } catch (error: any) {
          toast.error(
            error.response?.data?.message || t("Failed to create incident report"),
          );
        } finally {
          setIsSubmitting(false);
        }
      }
    });
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
                onClick={() =>
                  router.push(`/staff/inbound-requests`)
                }
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
            ) : (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                onClick={() => router.push(`/staff/inbound-requests`)}
              >
                {t("Return to List")} <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          {!isHistoryView && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">
                  {t("Action Required")}
                </h3>
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
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
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
                              <TableRow key={item.materialId} className="bg-red-50/10">
                                <TableCell className="pl-6 align-top pt-4">
                                  <div className="flex flex-col">
                                    <p className="text-sm font-semibold text-slate-800">
                                      {item.materialName}
                                    </p>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                                      {item.materialCode}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center align-top pt-4 font-medium text-slate-600">
                                 <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">
                                    {item.orderedQuantity} {item.unit}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center align-top pt-4 text-emerald-600 font-medium">
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                                    {item.passQuantity} {item.unit}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center align-top pt-4">
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