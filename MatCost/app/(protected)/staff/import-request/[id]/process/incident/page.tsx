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
  staffReceiptApi,
  CreateIncidentReportDto,
  QCCheckDto,
  IncidentReportDto,
} from "@/services/receipt-service";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface IncidentItem {
  detailId: number;
  materialName: string;
  expectedQty: number;
  actualQty: string | number;
  issueType: string;
  incidentNotes: string;
  materialCode: string;
  unit?: string | null;
}

export default function StaffIncidentPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentItems, setIncidentItems] = useState<IncidentItem[]>([]);
  const [qcData, setQcData] = useState<QCCheckDto | null>(null);

  const [isHistoryView, setIsHistoryView] = useState(false);
  const [historicalIncidentData, setHistoricalIncidentData] =
    useState<IncidentReportDto | null>(null);

  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 5;

  useEffect(() => {
    const initData = async () => {
      try {
        setIsLoading(true);

        const [receiptRes, qcRes] = await Promise.all([
          staffReceiptApi.getInboundRequestDetail(id),
          staffReceiptApi.getQCCheck(id),
        ]);
        setQcData(qcRes.data);

        const failedQcDetailIds = qcRes.data.details
          .filter((q) => q.result === "Fail")
          .map((q) => q.receiptDetailId);

        let existingIncidentData: IncidentReportDto | null = null;
        try {
          const incRes = await staffReceiptApi.getIncidentReport(id);
          existingIncidentData = incRes.data;
          setIsHistoryView(true);
          setHistoricalIncidentData(existingIncidentData);
          setIncidentDescription(existingIncidentData.description || "");
        } catch (error: any) {
          // 404 means no Incident has been done yet.
          if (error.response?.status !== 404) {
            console.error("Error fetching Incident Report:", error);
          }
        }

        // 3. Initialize/Map items to report
        const itemsToReport = receiptRes.data.items
          .filter((i) => failedQcDetailIds.includes(i.detailId))
          .map((i) => {
            // Nếu có lịch sử, map dữ liệu cũ vào
            const historyDetail = existingIncidentData?.details.find(
              (d) => d.receiptDetailId === i.detailId,
            );

            return {
              detailId: i.detailId,
              materialName: i.materialName,
              expectedQty: i.quantity || 0,
              actualQty: historyDetail ? historyDetail.actualQuantity : "",
              issueType: historyDetail ? historyDetail.issueType : "",
              incidentNotes: historyDetail ? historyDetail.notes || "" : "",
              materialCode: i.materialCode,
              unit: i.unit,
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
  }, [id]);

  const updateItem = (index: number, field: keyof IncidentItem, value: any) => {
    if (isHistoryView) return; // Không cho phép sửa nếu đang xem lại

    const newItems = [...incidentItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setIncidentItems(newItems);
  };

  const handleSubmitIncident = async () => {
    if (!incidentDescription.trim())
      return toast.error(t("Please provide an overall incident description."));

    const invalidQty = incidentItems.filter((i) => i.actualQty === "");
    if (invalidQty.length > 0)
      return toast.error(t("Enter Actual Quantity for all failed items."));

    const missingIssue = incidentItems.filter((i) => !i.issueType);
    if (missingIssue.length > 0)
      return toast.error(t("Select Issue Type for all failed items."));

    setIsSubmitting(true);
    try {
      const payload: CreateIncidentReportDto = {
        description: incidentDescription,
        qcCheckId: qcData?.qcCheckId || null,
        details: incidentItems.map((i) => ({
          receiptDetailId: i.detailId,
          expectedQuantity: i.expectedQty,
          actualQuantity: Number(i.actualQty),
          issueType: i.issueType,
          notes: i.incidentNotes,
        })),
      };

      await staffReceiptApi.createIncidentReport(id, payload);
      toast.success(t("Incident Report created successfully!"));
      router.push(`/staff/import-request/${id}/process/confirm`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || t("Failed to create incident report"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedFromHistory = () => {
    router.push(`/staff/import-request/${id}/process/confirm`);
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
        <Header
          title={`${t("Incident Report - Receipt")} #${qcData?.receiptCode || id}`}
        />
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                onClick={() =>
                  router.push(`/staff/import-request/${id}/process`)
                }
                className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit -ml-2 mb-1 h-8"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back")}
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {isHistoryView
                    ? t("Incident Report Record")
                    : t("Create Incident Report")}
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
                    {t("Status")}: {historicalIncidentData.status}
                  </Badge>
                )}
              </div>
            </div>

            {!isHistoryView ? (
              <Button
                className="bg-red-600 hover:bg-red-700 text-white min-w-[150px]"
                onClick={handleSubmitIncident}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <FileWarning className="w-4 h-4 mr-2" />
                )}
                {t("Submit Incident")}
              </Button>
            ) : (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                onClick={handleProceedFromHistory}
              >
                {t("Proceed to Next Step")}{" "}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          {!isHistoryView && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">
                  {t("Incident Report Required")}
                </h3>
                <p className="text-xs mt-1">
                  {t(
                    "Some items did not pass the Quality Control check. Please fill out the incident details below before you can proceed to confirm the inbound receipt.",
                  )}
                </p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-md">
                {t("General Incident Description")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={t(
                  "Describe the overall issue (e.g., Delivery truck arrived with water damage...)",
                )}
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                className={`min-h-[100px] ${isHistoryView ? "bg-slate-50 cursor-not-allowed opacity-80" : ""}`}
                readOnly={isHistoryView}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col gap-0">
            <CardHeader className="bg-white border-b border-slate-100 py-4 shrink-0">
              <CardTitle className="text-md">
                {t("Failed Items Details")}
              </CardTitle>
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
                        {t("Expected")}
                      </TableHead>
                      <TableHead className="w-[15%] text-center">
                        {t("Actual Received")}
                      </TableHead>
                      <TableHead className="w-[20%] text-center">
                        {t("Issue Type")}
                      </TableHead>
                      <TableHead className="pr-6">
                        {t("Specific Notes")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Tính toán phân trang
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
                          {paginatedIncidentItems.map((item, relativeIndex) => {
                            const absoluteIdx = incidentItems.findIndex(
                              (i) => i.detailId === item.detailId,
                            );

                            return (
                              <TableRow key={item.detailId}>
                                <TableCell className="pl-6 font-medium text-sm">
                                  <div className="flex items-start gap-3">
                                    <div
                                      className={`mt-1 p-1.5 rounded-full shrink-0`}
                                    >
                                      <Box className="w-4 h-4 text-slate-400" />
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
                                          {item.unit || t("Unit")}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-slate-600 font-semibold">
                                  {item.expectedQty}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={item.actualQty}
                                    onChange={(e) =>
                                      updateItem(
                                        absoluteIdx,
                                        "actualQty",
                                        e.target.value,
                                      )
                                    }
                                    className={`text-center font-bold h-9 pl-6 ${isHistoryView ? "bg-slate-50 border-slate-200 opacity-80 pointer-events-none" : ""}`}
                                    readOnly={isHistoryView}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={item.issueType}
                                    onValueChange={(val) =>
                                      updateItem(absoluteIdx, "issueType", val)
                                    }
                                    disabled={isHistoryView}
                                  >
                                    <SelectTrigger
                                      className={`h-9 w-full border-slate-300 ${isHistoryView ? "bg-slate-50 opacity-80" : ""}`}
                                    >
                                      <SelectValue
                                        placeholder={t("Select type")}
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
                                <TableCell className="pr-6">
                                  <Input
                                    value={item.incidentNotes}
                                    onChange={(e) =>
                                      updateItem(
                                        absoluteIdx,
                                        "incidentNotes",
                                        e.target.value,
                                      )
                                    }
                                    className={`h-9 ${isHistoryView ? "bg-slate-50 border-slate-200 opacity-80 pointer-events-none" : ""}`}
                                    placeholder={t("Details...")}
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

              {/* FOOTER ĐIỀU HƯỚNG (Nằm dưới bảng) */}
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
