"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Save,
  Search,
  Loader2,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  XCircle,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GetInboundRequestListDto,
  staffReceiptsApi,
  SubmitQCCheckDto,
  QCCheckDto,
} from "@/services/import-service";
import { toast } from "sonner";
import { showConfirmToast } from "@/hooks/confirm-toast";
import { useTranslation } from "react-i18next";

interface QCItemInput {
  materialId: number;
  materialCode: string;
  materialName: string;
  unit: string;
  actualQuantity: number; // Tổng số lượng nhận được (từ Receipt)
  passQuantity: string;
  failQuantity: string;
  result: "Pass" | "Fail" | ""; // Tính toán tự động hoặc set tay nếu history
  failReason: string;
}

export default function StaffQCCheckPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [receipt, setReceipt] = useState<GetInboundRequestListDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [qcItems, setQcItems] = useState<QCItemInput[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 5;

  const [isHistoryView, setIsHistoryView] = useState(false);
  const [historicalQcData, setHistoricalQcData] = useState<QCCheckDto | null>(
    null,
  );

  useEffect(() => {
    const initData = async () => {
      try {
        setIsLoading(true);
        // 1. Lấy chi tiết Receipt
        const receiptRes = await staffReceiptsApi.getReceiptDetails(id);
        const receiptData = receiptRes.data;
        setReceipt(receiptData);

        let existingQcData: QCCheckDto | null = null;

        // 2. Thử lấy lịch sử QC (nếu có)
        try {
          const qcRes = await staffReceiptsApi.getQCCheck(id);
          existingQcData = qcRes.data;
          setIsHistoryView(true);
          setHistoricalQcData(existingQcData);
          if (existingQcData.notes) setGeneralNotes(existingQcData.notes);
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.error("Error fetching QC Check:", error);
          }
        }

        // 3. Khởi tạo dữ liệu QC Items
        const initQcItems: QCItemInput[] = receiptData.items.map((i) => {
          const historyDetail = existingQcData?.details.find(
            (q) => q.materialId === i.materialId,
          );

          return {
            materialId: i.materialId || 0,
            materialCode: i.materialCode,
            materialName: i.materialName,
            unit: i.unit || "Unit",
            actualQuantity: i.actualQuantity || 0,
            passQuantity: historyDetail
              ? historyDetail.passQuantity.toString()
              : (i.actualQuantity || 0).toString(), // Mặc định pass hết
            failQuantity: historyDetail
              ? historyDetail.failQuantity.toString()
              : "0",
            result: (historyDetail?.result as "Pass" | "Fail" | "") || "",
            failReason: historyDetail?.failReason || "",
          };
        });

        setQcItems(initQcItems);
      } catch (error) {
        toast.error(t("Failed to load data"));
      } finally {
        setIsLoading(false);
      }
    };
    if (id) initData();
  }, [id, t]);

  useEffect(() => {
    setTablePage(1);
  }, [searchTerm]);

  // Xử lý khi thay đổi Pass/Fail Quantity
  const handleQuantityChange = (
    index: number,
    field: "passQuantity" | "failQuantity",
    value: string,
  ) => {
    if (isHistoryView) return;

    setQcItems((prev) => {
      const newItems = [...prev];
      const currentItem = newItems[index];

      let numVal = Number(value) < 0 ? 0 : Number(value);

      if (field === "passQuantity") {
        if (numVal > currentItem.actualQuantity)
          numVal = currentItem.actualQuantity;
        currentItem.passQuantity = numVal.toString();
        currentItem.failQuantity = (
          currentItem.actualQuantity - numVal
        ).toString();
      } else {
        if (numVal > currentItem.actualQuantity)
          numVal = currentItem.actualQuantity;
        currentItem.failQuantity = numVal.toString();
        currentItem.passQuantity = (
          currentItem.actualQuantity - numVal
        ).toString();
      }

      // Tự động tính Result dựa trên Quantity
      if (Number(currentItem.failQuantity) > 0) {
        currentItem.result = "Fail";
      } else {
        currentItem.result = "Pass";
        currentItem.failReason = ""; // Clear reason if fully passed
      }

      return newItems;
    });
  };

  const handleReasonChange = (index: number, value: string) => {
    if (isHistoryView) return;
    setQcItems((prev) => {
      const newItems = [...prev];
      newItems[index].failReason = value;
      return newItems;
    });
  };

  const handleSubmitQc = () => {
    const missingReason = qcItems.filter(
      (i) => i.result === "Fail" && !i.failReason.trim(),
    );
    if (missingReason.length > 0)
      return toast.error(
        t("Please provide a Fail Reason for all items with failed quantity."),
      );

    const hasFail = qcItems.some((i) => i.result === "Fail");
    const overall = hasFail ? "Fail" : "Pass";

    showConfirmToast({
      title: t("Submit QC Check as {{overall}}?", { overall }),
      description: hasFail
        ? t(
            "Some items failed QC. You will need to create an Incident Report next.",
          )
        : t("All items passed QC. Inventory will be updated automatically."),
      confirmLabel: t("Yes, Submit QC"),
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const payload: SubmitQCCheckDto = {
            notes: generalNotes.trim() || undefined,
            details: qcItems.map((i) => ({
              materialId: i.materialId,
              actualQuantity: i.actualQuantity,
              passQuantity: Number(i.passQuantity),
              failQuantity: Number(i.failQuantity),
              result: i.result || "Pass",
              failReason: i.result === "Fail" ? i.failReason : undefined,
            })),
          };

          const res = await staffReceiptsApi.submitQCCheck(id, payload);
          toast.success(t("QC Check submitted successfully"));

          if (res.data.nextStep?.includes("incident-report")) {
            router.push(`/staff/receipts/${id}/incident-report`);
          } else {
            router.push(`/staff/receipts/inbound-requests`);
          }
        } catch (error: any) {
          toast.error(
            error.response?.data?.message || t("Failed to submit QC Check"),
          );
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  // Helper cho lịch sử
  const handleProceedFromHistory = () => {
    if (historicalQcData?.overallResult === "Fail") {
      router.push(`/staff/inbound-requests/${id}/process/incident`);
    } else {
      router.push(`/staff/receipts/inbound-requests`);
    }
  };

  const filteredQcItems = qcItems.filter(
    (i) =>
      i.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.materialName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalTablePages =
    Math.ceil(filteredQcItems.length / tableItemsPerPage) || 1;
  const startTableIndex = (tablePage - 1) * tableItemsPerPage;
  const paginatedQcItems = filteredQcItems.slice(
    startTableIndex,
    startTableIndex + tableItemsPerPage,
  );

  // Tính Progress: đếm số item có trạng thái rõ ràng (đã chia xong Pass/Fail và ghi chú đủ)
  const qcCheckedCount = useMemo(() => {
    return qcItems.filter((i) => {
      if (i.result === "Pass") return true;
      if (i.result === "Fail" && i.failReason.trim() !== "") return true;
      return false;
    }).length;
  }, [qcItems]);

  const qcProgressPercent =
    qcItems.length > 0 ? (qcCheckedCount / qcItems.length) * 100 : 0;

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
        <Header title={`${t("QC Check")} #${receipt?.receiptCode}`} />
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                onClick={() => router.push("/staff/receipts/inbound-requests")}
                className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit -ml-2 mb-1 h-8"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to List")}
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-indigo-600" />
                  {isHistoryView
                    ? t("Quality Control Record")
                    : t("Quality Control Inspection")}
                </h1>

                {isHistoryView && historicalQcData && (
                  <Badge
                    className={
                      historicalQcData.overallResult === "Pass"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {historicalQcData.overallResult === "Pass" ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-1" />
                    )}
                    {t("Overall")}: {t(historicalQcData.overallResult)}
                  </Badge>
                )}
              </div>
            </div>

            {!isHistoryView ? (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px] shadow-sm"
                onClick={handleSubmitQc}
                disabled={isSubmitting || qcCheckedCount < qcItems.length}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {t("Submit QC Result")}
              </Button>
            ) : (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                onClick={handleProceedFromHistory}
              >
                {historicalQcData?.overallResult === "Fail"
                  ? t("View Incident Report")
                  : t("Back to List")}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4 pt-2">
                  <CardTitle className="text-base font-semibold text-slate-800">
                    {t("Inspection Progress")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {t("Items Checked")}
                      </span>
                      <span className="text-slate-500 font-bold">
                        {qcCheckedCount} / {qcItems.length}
                      </span>
                    </div>
                    <Progress value={qcProgressPercent} className="h-2.5" />
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <label className="text-sm font-medium text-slate-700">
                      {t("General Notes")}
                    </label>
                    <Textarea
                      placeholder={
                        isHistoryView
                          ? t("No notes")
                          : t("Enter overall observations...")
                      }
                      className="min-h-[120px] resize-none focus-visible:ring-indigo-600 bg-white"
                      value={generalNotes}
                      onChange={(e) => setGeneralNotes(e.target.value)}
                      readOnly={isHistoryView}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3 space-y-6">
              <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[550px] gap-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-base font-semibold text-slate-800">
                      {t("Material Inspection List")}
                    </CardTitle>
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder={t("Search material...")}
                        className="pl-9 h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0 flex flex-col flex-1">
                  <div className="[&>div]:max-h-[500px] [&>div]:min-h-[500px] [&>div]:overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                        <TableRow>
                          <TableHead className="w-[30%] pl-6">
                            {t("Material")}
                          </TableHead>
                          <TableHead className="w-[15%] text-center">
                            {t("Total Received")}
                          </TableHead>
                          <TableHead className="w-[15%] text-center text-emerald-700 bg-emerald-50/50">
                            {t("Pass Qty")}
                          </TableHead>
                          <TableHead className="w-[15%] text-center text-red-700 bg-red-50/50">
                            {t("Fail Qty")}
                          </TableHead>
                          <TableHead className="w-[25%] pr-6">
                            {t("Fail Reason")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedQcItems.map((item) => {
                          const absoluteIdx = qcItems.findIndex(
                            (i) => i.materialId === item.materialId,
                          );
                          const isFailed = item.result === "Fail";

                          return (
                            <TableRow
                              key={item.materialId}
                              className={isFailed ? "bg-red-50/30" : ""}
                            >
                              <TableCell className="pl-6 py-4 align-top">
                                <div className="flex flex-col">
                                  <p className="text-sm font-semibold text-slate-800">
                                    {item.materialName}
                                  </p>
                                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                                    {item.materialCode}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center align-top pt-5">
                                <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                  {item.actualQuantity}
                                </span>
                              </TableCell>

                              <TableCell className="text-center align-top pt-4">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.passQuantity}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      absoluteIdx,
                                      "passQuantity",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full text-center font-bold text-emerald-700 bg-emerald-50 border-emerald-200 focus-visible:ring-emerald-500"
                                  readOnly={isHistoryView}
                                />
                              </TableCell>

                              <TableCell className="text-center align-top pt-4">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.failQuantity}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      absoluteIdx,
                                      "failQuantity",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full text-center font-bold text-red-700 bg-red-50 border-red-200 focus-visible:ring-red-500"
                                  readOnly={isHistoryView}
                                />
                              </TableCell>

                              <TableCell className="pr-6 align-top pt-4">
                                {isFailed ? (
                                  <div className="space-y-1">
                                    <Input
                                      placeholder={t("Required reason...")}
                                      value={item.failReason}
                                      onChange={(e) =>
                                        handleReasonChange(
                                          absoluteIdx,
                                          e.target.value,
                                        )
                                      }
                                      className={`border-red-300 focus-visible:ring-red-400 ${!item.failReason.trim() && !isHistoryView ? "ring-2 ring-red-200" : ""}`}
                                      readOnly={isHistoryView}
                                    />
                                    {!item.failReason.trim() &&
                                      !isHistoryView && (
                                        <span className="text-[10px] text-red-500 flex items-center">
                                          <AlertTriangle className="w-3 h-3 mr-1" />{" "}
                                          {t("Reason is required")}
                                        </span>
                                      )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 italic block mt-2 text-center">
                                    {t("Not required")}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {totalTablePages > 1 && (
                    <div className="px-6 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50/50 mt-auto">
                      <span className="text-xs text-slate-500">
                        {t("Showing")} {startTableIndex + 1}-
                        {Math.min(
                          startTableIndex + tableItemsPerPage,
                          filteredQcItems.length,
                        )}{" "}
                        {t("of")} {filteredQcItems.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() =>
                            setTablePage((p) => Math.max(1, p - 1))
                          }
                          disabled={tablePage === 1}
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </Button>
                        <span className="text-xs font-medium w-8 text-center">
                          {tablePage}/{totalTablePages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() =>
                            setTablePage((p) =>
                              Math.min(totalTablePages, p + 1),
                            )
                          }
                          disabled={tablePage === totalTablePages}
                        >
                          <ChevronRight className="w-3 h-3" />
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
    </div>
  );
}
