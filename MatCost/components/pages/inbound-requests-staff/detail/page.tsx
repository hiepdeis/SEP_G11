"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  MapPin,
  Package,
  Truck,
  Building2,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileWarning,
  ListCheck,
  Check,
  Send,
  Receipt,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
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
  staffReceiptsApi,
  staffIncidentApi,
  GetInboundRequestListDto,
} from "@/services/import-service";
import { toast } from "sonner";
import { showConfirmToast } from "@/hooks/confirm-toast";
import { useTranslation } from "react-i18next";
import { formatPascalCase } from "@/lib/format-pascal-case";

export default function StaffInboundDetailPage({
  role = "staff",
}: {
  role: string;
}) {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const rolePath = role === "manager" ? "manager" : "staff";

  const [request, setRequest] = useState<GetInboundRequestListDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingToManager, setIsSubmittingToManager] = useState(false);
  const [qcData, setQcData] = useState<any | null>(null);
  const [incidentData, setIncidentData] = useState<any | null>(null);

  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 5;

  const fetchData = async () => {
    try {
      const res = await staffReceiptsApi.getReceiptDetails(id);
      const requestData = res.data;

      setRequest(requestData);

      if (
        requestData.status === "Completed" ||
        requestData.status === "GoodsArrived" ||
        requestData.status === "PendingManagerReview"
      ) {
        try {
          const qcRes = await staffReceiptsApi.getQCCheck(id);
          setQcData(qcRes.data);

          if (qcRes.data.overallResult === "Fail") {
            const incRes = await staffReceiptsApi.getIncidentReport(id);
            setIncidentData(incRes.data);
          }
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.error("Error fetching QC/Incident", error);
          }
        }
      }
    } catch (error) {
      console.error("Error loading receipt detail", error);
      toast.error(t("Failed to load receipt details"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id, t]);

  const handleSubmitToManager = () => {
    if (!incidentData?.incidentId) return;

    showConfirmToast({
      title: t("Submit Incident to Manager?"),
      description: t(
        "Are you sure you want to submit this incident report? The manager will be notified for review.",
      ),
      confirmLabel: t("Yes, Submit"),
      onConfirm: async () => {
        setIsSubmittingToManager(true);
        try {
          await staffIncidentApi.submitToManager(incidentData.incidentId);
          toast.success(t("Incident submitted to Manager successfully!"));
          await fetchData(); // Tải lại trang để cập nhật status mới nhất
        } catch (error: any) {
          console.error(error);
          toast.error(
            error.response?.data?.message || t("Failed to submit incident."),
          );
        } finally {
          setIsSubmittingToManager(false);
        }
      },
    });
  };

  const formatDate = (dateString?: string | null) => {
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

  const totalTableItems = request?.items?.length || 0;
  const totalTablePages = Math.ceil(totalTableItems / tableItemsPerPage) || 1;
  const startTableIndex = (tablePage - 1) * tableItemsPerPage;
  const paginatedTableItems =
    request?.items?.slice(
      startTableIndex,
      startTableIndex + tableItemsPerPage,
    ) || [];

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
      </div>
    );

  if (!request)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <h2 className="text-xl font-semibold text-slate-700">
          Request Not Found
        </h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Inbound Request")} #${request.receiptCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back")}
            </Button>

            {(request.status === "PartiallyPutaway" ||
              request.status === "ReadyForStamp" ||
              request.status === "Stamped" ||
              request.status === "Closed") && (
              <Button
                variant="outline"
                onClick={() => {
                  if (role == "staff")
                    router.push(`/${rolePath}/inbound-requests/${id}/detail`);
                  else if (role == "manager")
                    router.push(
                      `/${rolePath}/inbound-requests/staff-portal/${id}/detail`,
                    );
                }}
                className="text-indigo-600 border-indigo-200 hover:text-indigo-700 hover:bg-indigo-50 shadow-sm"
              >
                <Eye className="w-4 h-4 mr-2" /> {t("View Putaway Detail")}
              </Button>
            )}
          </div>

          <Card className="border-slate-200 shadow-sm bg-white mb-6">
            <CardContent>
              <div className="relative mx-auto px-4">
                {request.status === "PartiallyPutaway" ? (
                  <>
                    <div className="absolute left-[25%] right-[25%] top-5 h-1 bg-slate-200 z-10 rounded-full " />
                    <div
                      className="absolute left-[25%] top-5 h-1 rounded-full z-10 transition-all duration-500 overflow-hidden bg-amber-500 "
                      style={{ width: "50%" }}
                    >
                      {" "}
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/70 to-transparent animate-shimmer-slide" />
                    </div>

                    <div className="flex justify-between w-full">
                      <div className="flex flex-col items-center relative z-10 w-1/2">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors bg-indigo-600 text-white">
                          <Check className="w-5 h-5" />
                        </div>
                        <div className="text-center mt-3 bg-white px-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {t("Created")}
                          </p>
                          {request.createdDate && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {formatDate(request.createdDate)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-center relative z-10 w-1/2">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors bg-amber-500 text-white">
                          <Check className="w-5 h-5" />
                        </div>
                        <div className="text-center mt-3 bg-white px-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {t("Partially Putaway")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute left-[12.5%] right-[12.5%] top-5 h-1 bg-slate-200 z-10 rounded-full" />
                    <div
                      className="absolute left-[12.5%] top-5 h-1 rounded-full z-10 transition-all duration-500 overflow-hidden bg-indigo-600"
                      style={{
                        width:
                          request.status === "Closed"
                            ? "75%"
                            : request.status === "Stamped" ||
                                request.status === "Completed"
                              ? "50%"
                              : request.status === "ReadyForStamp"
                                ? "25%"
                                : "0%",
                      }}
                    >
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/70 to-transparent animate-shimmer-slide" />
                    </div>

                    <div className="flex justify-between w-full">
                      <div className="flex flex-col items-center relative z-10 w-1/4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors bg-indigo-600 text-white">
                          <Check className="w-5 h-5" />
                        </div>
                        <div className="text-center mt-3 bg-white px-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {t("Created")}
                          </p>
                          {request.createdDate && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {formatDate(request.createdDate)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-center relative z-10 w-1/4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors ${
                            [
                              "ReadyForStamp",
                              "Stamped",
                              "Completed",
                              "Closed",
                            ].includes(request.status)
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          <Check className="w-5 h-5" />
                        </div>
                        <div className="text-center mt-3 bg-white px-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {t("Ready For Stamp")}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-center relative z-10 w-1/4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors ${
                            ["Stamped", "Completed", "Closed"].includes(
                              request.status,
                            )
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          <Check className="w-5 h-5" />
                        </div>
                        <div className="text-center mt-3 bg-white px-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {t("Stamped")}
                          </p>
                          {request.stampedByName && (
                            <p className="text-xs font-medium text-slate-600 mt-0.5">
                              {request.stampedByName}
                            </p>
                          )}
                          {request.stampedAt && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {formatDate(request.stampedAt)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Step 4: Closed */}
                      <div className="flex flex-col items-center relative z-10 w-1/4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors ${
                            request.status === "Closed"
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          <Check className="w-5 h-5" />
                        </div>
                        <div className="text-center mt-3 bg-white px-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {t("Closed")}
                          </p>
                          {request.closedByName && (
                            <p className="text-xs font-medium text-slate-600 mt-0.5">
                              {request.closedByName}
                            </p>
                          )}
                          {request.closedAt && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {formatDate(request.closedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="">
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 mb-6">
              <div className="lg:col-span-4 space-y-6 flex">
                <Card className="border-slate-200 shadow-sm gap-0 flex-1">
                  <CardHeader className="border-b border-slate-100 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                      <CardTitle className="text-base font-semibold text-slate-800">
                        {t("Destination & Logistics")}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {t("Target Warehouse")}
                      </span>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-500 mt-1" />
                        <div>
                          <p className="font-medium text-slate-800">
                            {request.warehouseName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {t("Main Facility")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {t("Receipt Status")}
                      </span>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1" />
                        <div>
                          <p className="font-medium text-slate-800">
                            {request.status != null &&
                              t(formatPascalCase(request.status))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2 space-y-6 flex">
                <Card className="border-slate-200 flex-1">
                  <CardHeader className="border-b border-slate-100 py-4">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-indigo-600" />
                      <CardTitle className="text-base font-semibold text-slate-800">
                        {t("Receipt Summary")}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-end border-b border-slate-200 pt-4 pb-3">
                      <span className="text-sm text-slate-600">
                        {t("Total Materials")}
                      </span>
                      <span className="text-lg font-semibold text-slate-900">
                        {request.items.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-slate-600">
                        {t("Total Quantity")}
                      </span>
                      <span className="text-2xl font-bold text-indigo-600">
                        {request.totalQuantity.toLocaleString("vi-VN")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <Card className="border-slate-200 shadow-sm overflow-hidden gap-0 pb-0 flex flex-col">
                <CardHeader className="bg-white border-b border-slate-100 py-4 shrink-0">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <Package className="w-5 h-5 text-slate-500" />
                      {t("Expected Items")}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 text-slate-700"
                    >
                      {totalTableItems} {t("materials")}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-0 flex flex-col flex-1">
                  <div className="[&>div]:max-h-[300px] [&>div]:min-h-[300px] [&>div]:overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                        <TableRow className="bg-slate-50/50">
                          <TableHead className="w-[5%] pl-6">#</TableHead>
                          <TableHead className="w-[30%]">
                            {t("Material")}
                          </TableHead>
                          <TableHead className="w-[25%]">
                            {t("Supplier")}
                          </TableHead>
                          <TableHead className="text-center w-[10%]">
                            {t("Expected")}
                          </TableHead>
                          <TableHead className="text-center w-[10%]">
                            {t("Actual")}
                          </TableHead>
                          <TableHead className="text-center w-[10%]">
                            {t("Passed")}
                          </TableHead>
                          <TableHead className="text-center w-[10%]">
                            {t("Failed")}
                          </TableHead>
                          {request.status === "QCPassed" ||
                          request.status === "ReadyForPutaway" ? (
                            <TableHead className="text-center w-[15%] pr-6">
                              {t("Status")}
                            </TableHead>
                          ) : (
                            <></>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTableItems.map((item, index) => (
                          <TableRow
                            key={item.detailId}
                            className="hover:bg-slate-50"
                          >
                            <TableCell className="text-slate-500 text-sm pl-6">
                              {startTableIndex + index + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-700 text-sm">
                                  {item.materialName}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 border-slate-200 bg-white font-mono text-slate-500"
                                  >
                                    {item.materialCode}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Truck className="w-3 h-3 text-slate-400" />
                                <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                  {item.supplierName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-medium">
                                {item.quantity}
                              </span>
                              <span className="text-xs text-slate-400 ml-1">
                                {item.unit}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`font-bold ${
                                  item.actualQuantity === item.quantity
                                    ? "text-emerald-600"
                                    : "text-amber-500"
                                }`}
                              >
                                {item.actualQuantity?.toLocaleString("vi-VN")}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-bold text-emerald-600`}>
                                {item.passQuantity?.toLocaleString("vi-VN")}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-bold text-rose-600`}>
                                {item.failQuantity?.toLocaleString("vi-VN")}
                              </span>
                            </TableCell>
                            {request.status === "QCPassed" ||
                            request.status === "ReadyForPutaway" ? (
                              <TableCell className="text-center pr-6">
                                <Badge
                                  variant="outline"
                                  className="border-slate-200 text-slate-500 font-normal text-xs"
                                >
                                  {t("Pending")}
                                </Badge>
                              </TableCell>
                            ) : (
                              <></>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalTablePages > 1 && (
                    <div className="px-6 py-3 flex items-center justify-between border-t border-slate-100 bg-white shrink-0 mt-auto">
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

              {qcData && (
                <Card className="border-slate-200 shadow-sm mt-6 gap-0 flex flex-col">
                  <CardHeader className="bg-white border-b border-slate-100 py-4">
                    <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-slate-500" />
                      {t("Quality Control & Inspection Results")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6 flex-1 flex flex-col">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                          <ListCheck
                            className={
                              qcData.overallResult === "Pass"
                                ? " text-emerald-700 w-4 h-4"
                                : "text-red-700 w-4 h-4 "
                            }
                          />{" "}
                          {t("QC Overall Result")}:
                        </h4>
                        <Badge
                          className={
                            qcData.overallResult === "Pass"
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : "bg-red-100 text-red-700 hover:bg-red-100"
                          }
                        >
                          {t(qcData.overallResult)}
                        </Badge>
                      </div>

                      {qcData.overallResult === "Fail" && (
                        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-200">
                          <p className="font-medium mb-1">
                            {t("Failed Items Summary")}:
                          </p>
                          <ul className="list-disc pl-5 space-y-1">
                            {qcData.details
                              .filter((d: any) => d.result === "Fail")
                              .map((item: any, idx: number) => (
                                <li key={idx}>
                                  <span className="font-semibold">
                                    {item.materialName || item.materialCode}
                                  </span>
                                  <span className="text-slate-500 ml-2">
                                    {t("Reason")}: {item.failReason}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* KHỐI INCIDENT REPORT */}
                    {incidentData && (
                      <div className="pt-4 border-t border-slate-100 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                              <FileWarning className="w-4 h-4 text-amber-500" />{" "}
                              {t("Incident Report")}
                            </h4>
                            <Badge
                              variant="outline"
                              className="text-slate-500 font-normal"
                            >
                              {incidentData.incidentCode}
                            </Badge>
                            <Badge
                              className={
                                incidentData.status === "Resolved"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-amber-50 text-amber-600"
                              }
                            >
                              {t(incidentData.status)}
                            </Badge>
                          </div>

                          {/* NÚT SUBMIT TO MANAGER (HIỂN THỊ NẾU ĐANG PENDING) */}
                          {request.status === "PendingManagerReview" &&
                            incidentData.status === "Open" && (
                              <Button
                                onClick={handleSubmitToManager}
                                disabled={isSubmittingToManager}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                              >
                                {isSubmittingToManager ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <Send className="w-4 h-4 mr-2" />
                                )}
                                {t("Submit to Manager")}
                              </Button>
                            )}
                        </div>

                        <div className="text-sm text-slate-600 space-y-2 flex-1 flex flex-col">
                          <p>
                            <span className="font-medium text-slate-700">
                              {t("General Description")}:
                            </span>{" "}
                            {incidentData.description}
                          </p>

                          <div className="mt-3 flex-1">
                            <p className="font-medium text-slate-700 mb-1">
                              {t("Reported Issues")}:
                            </p>
                            <Table className="border border-slate-100 rounded-md">
                              <TableHeader className="bg-slate-50">
                                <TableRow>
                                  <TableHead className="h-8 pl-4">
                                    {t("Material")}
                                  </TableHead>
                                  <TableHead className="h-8 text-center">
                                    {t("Expected")}
                                  </TableHead>
                                  <TableHead className="h-8 text-center">
                                    {t("Actual")}
                                  </TableHead>
                                  <TableHead className="h-8 text-center">
                                    {t("Issue Type")}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {incidentData.details.map(
                                  (inc: any, idx: number) => (
                                    <TableRow key={idx}>
                                      <TableCell className="py-2 text-xs font-medium pl-4">
                                        {inc.materialName}
                                      </TableCell>
                                      <TableCell className="py-2 text-xs text-center">
                                        {inc.expectedQuantity}
                                      </TableCell>
                                      <TableCell className="py-2 text-xs text-center font-bold text-red-500">
                                        {inc.actualQuantity}
                                      </TableCell>
                                      <TableCell className="py-2 text-xs text-center pr-4">
                                        <Badge
                                          variant="secondary"
                                          className="font-normal text-xs"
                                        >
                                          {inc.issueType}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ),
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
