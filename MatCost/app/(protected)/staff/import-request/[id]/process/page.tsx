"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { ArrowLeft, Save, Search, MapPin, Loader2, ChevronRight, ChevronLeft, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GetInboundRequestListDto, staffReceiptApi, SubmitQCCheckDto, QCCheckDto } from "@/services/receipt-service";
import { toast } from "sonner";
import { showConfirmToast } from "@/hooks/confirm-toast";
import { useTranslation } from "react-i18next";

interface QCItem {
  detailId: number;
  materialCode: string;
  materialName: string;
  unit: string;
  expectedQty: number;
  result: "Pass" | "Fail" | "";
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
  
  const [qcItems, setQcItems] = useState<QCItem[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 5;

  const [isHistoryView, setIsHistoryView] = useState(false);
  const [historicalQcData, setHistoricalQcData] = useState<QCCheckDto | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        setIsLoading(true);
        // 1. Fetch the receipt details
        const receiptRes = await staffReceiptApi.getInboundRequestDetail(id);
        const receiptData = receiptRes.data;
        setReceipt(receiptData);
        
        let existingQcData: QCCheckDto | null = null;
        
        // 2. Try to fetch existing QC check history
        try {
           const qcRes = await staffReceiptApi.getQCCheck(id);
           existingQcData = qcRes.data;
           setIsHistoryView(true);
           setHistoricalQcData(existingQcData);
           if(existingQcData.notes) setGeneralNotes(existingQcData.notes);
        } catch (error: any) {
           // 404 means no QC has been done yet, which is expected for new processes.
           if (error.response?.status !== 404) {
               console.error("Error fetching QC Check:", error);
           }
        }

        // 3. Initialize QC items
        const initQcItems: QCItem[] = receiptData.items.map((i) => {
          // If history exists, find the matching detail
          const historyDetail = existingQcData?.details.find(q => q.receiptDetailId === i.detailId);

          return {
            detailId: i.detailId,
            materialCode: i.materialCode,
            materialName: i.materialName,
            unit: i.unit || "Unit",
            expectedQty: i.quantity || 0,
            result: (historyDetail?.result as "Pass" | "Fail" | "") || "",
            failReason: historyDetail?.failReason || "",
          };
        });
        
        setQcItems(initQcItems);
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) initData();
  }, [id]);

  useEffect(() => {
    setTablePage(1);
  }, [searchTerm]);

  const updateQcItem = (index: number, field: keyof QCItem, value: any) => {
    if (isHistoryView) return; // Prevent updating if in history mode
    
    const newItems = [...qcItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "result" && value === "Pass") {
      newItems[index].failReason = "";
    }
    setQcItems(newItems);
  };

  const handleSubmitQc = async () => {
    const unChecked = qcItems.filter((i) => i.result === "");
    if (unChecked.length > 0) return toast.error("Please complete QC check for all items.");
    
    const missingReason = qcItems.filter((i) => i.result === "Fail" && !i.failReason.trim());
    if (missingReason.length > 0) return toast.error("Please provide a Fail Reason for all failed items.");

    const hasFail = qcItems.some((i) => i.result === "Fail");
    const overall = hasFail ? "Fail" : "Pass";

    showConfirmToast({
      title: `Submit QC Check as ${overall}?`,
      description: hasFail 
        ? "Some items failed QC. You will need to create an Incident Report next."
        : "All items passed QC. You can proceed to confirm the inbound receipt.",
      confirmLabel: "Yes, Submit QC",
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const payload: SubmitQCCheckDto = {
            overallResult: overall,
            notes: generalNotes,
            details: qcItems.map((i) => ({
              receiptDetailId: i.detailId,
              result: i.result,
              failReason: i.result === "Fail" ? i.failReason : null,
            })),
          };

          await staffReceiptApi.submitQCCheck(id, payload);
          toast.success("QC Check submitted successfully");

          if (overall === "Fail") {
            router.push(`/staff/import-request/${id}/process/incident`);
          } else {
            router.push(`/staff/import-request/${id}/process/confirm`);
          }
        } catch (error: any) {
          toast.error(error.response?.data?.message || "Failed to submit QC Check");
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  // Helper function to proceed to the next step when viewing history
  const handleProceedFromHistory = () => {
    if (historicalQcData?.overallResult === "Fail") {
        router.push(`/staff/import-request/${id}/process/incident`);
    } else {
        router.push(`/staff/import-request/${id}/process/confirm`);
    }
  };

  const filteredQcItems = qcItems.filter((i) =>
      i.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.materialName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalTablePages = Math.ceil(filteredQcItems.length / tableItemsPerPage) || 1;
  const startTableIndex = (tablePage - 1) * tableItemsPerPage;
  const paginatedQcItems = filteredQcItems.slice(startTableIndex, startTableIndex + tableItemsPerPage);
  const qcCheckedCount = qcItems.filter((i) => i.result !== "").length;
  const qcProgressPercent = qcItems.length > 0 ? (qcCheckedCount / qcItems.length) * 100 : 0;

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("QC Check - Receipt")} #${receipt?.receiptCode}`} />
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Button variant="ghost" onClick={() => router.push(`/staff/import-request/${id}`)} className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit -ml-2 mb-1 h-8">
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to detail")}
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                    {isHistoryView ? t("Quality Control Check Record") : t("Quality Control Check")}
                </h1>
                {/* Show overall result badge if in history mode */}
                {isHistoryView && historicalQcData && (
                      <Badge className={historicalQcData.overallResult === "Pass" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                          {historicalQcData.overallResult === "Pass" ? <CheckCircle className="w-3 h-3 mr-1"/> : <XCircle className="w-3 h-3 mr-1"/>}
                          {t("Overall")}: {t(historicalQcData.overallResult)}
                      </Badge>
                )}
              </div>
            </div>
            
            {/* Toggle buttons based on mode */}
            {!isHistoryView ? (
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]" onClick={handleSubmitQc} disabled={isSubmitting || qcCheckedCount < qcItems.length}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {t("Submit QC Check")}
                </Button>
            ) : (
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md" onClick={handleProceedFromHistory}>
                  {t("Proceed to Next Step")} <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
            )}
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1 w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{t("QC Progress")}</span>
                  <span className="text-slate-500">{qcCheckedCount} / {qcItems.length} {t("checked")}</span>
                </div>
                <Progress value={qcProgressPercent} className="h-2" />
              </div>
              <div className="w-full md:w-1/3 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder={t("Find material...")} className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden pt-0 pb-0 gap-0 flex flex-col">
            <CardContent className="p-0 flex flex-col flex-1">
              <div className="[&>div]:max-h-[450px] [&>div]:min-h-[450px] [&>div]:overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                    <TableRow>
                      <TableHead className="w-[30%] pl-6">{t("Material Info")}</TableHead>
                      <TableHead className="w-[15%] text-center">{t("Expected Qty")}</TableHead>
                      <TableHead className="w-[20%] text-center">{t("QC Result")}</TableHead>
                      <TableHead className="w-[35%]">{t("Fail Reason")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedQcItems.map((item) => {
                      const absoluteIdx = qcItems.findIndex((i) => i.detailId === item.detailId);
                      return (
                        <TableRow key={item.detailId} className={item.result === "Pass" ? "bg-emerald-50/30" : item.result === "Fail" ? "bg-red-50/30" : ""}>
                          <TableCell className="pl-6 py-4">
                            <p className="text-sm font-medium text-slate-800">{item.materialName}</p>
                            <p className="text-xs text-slate-500 mt-1 font-mono">{item.materialCode}</p>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-slate-700">{item.expectedQty} {item.unit}</TableCell>
                          <TableCell className="text-center">
                            <Select value={item.result} onValueChange={(val: "Pass" | "Fail") => updateQcItem(absoluteIdx, "result", val)} disabled={isHistoryView}>
                              <SelectTrigger className={`mx-auto w-[120px] ${item.result === "Pass" ? "text-emerald-700 bg-emerald-100 border-emerald-200 opacity-100" : item.result === "Fail" ? "text-red-700 bg-red-100 border-red-200 opacity-100" : ""}`}>
                                <SelectValue placeholder={t("Select...")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pass" className="text-emerald-600 font-medium">{t("Pass")}</SelectItem>
                                <SelectItem value="Fail" className="text-red-600 font-medium">{t("Fail")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="pr-6">
                            {item.result === "Fail" ? (
                              <Input 
                                placeholder={t("Enter reason for failure...")} 
                                value={item.failReason} 
                                onChange={(e) => updateQcItem(absoluteIdx, "failReason", e.target.value)} 
                                className={`border-red-300 focus-visible:ring-red-400 ${isHistoryView ? "opacity-100 bg-white" : ""}`}
                                readOnly={isHistoryView}
                              />
                            ) : (
                              <span className="text-xs text-slate-400 italic">{t("Not required")}</span>
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
                  <span className="text-xs text-slate-500">{t("Showing")} {startTableIndex + 1}-{Math.min(startTableIndex + tableItemsPerPage, filteredQcItems.length)} {t("of")} {filteredQcItems.length}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setTablePage(p => Math.max(1, p - 1))} disabled={tablePage === 1}><ChevronLeft className="w-3 h-3" /></Button>
                    <span className="text-xs font-medium w-8 text-center">{tablePage}/{totalTablePages}</span>
                    <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))} disabled={tablePage === totalTablePages}><ChevronRight className="w-3 h-3" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}