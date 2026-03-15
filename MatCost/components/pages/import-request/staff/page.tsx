"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  FileSpreadsheet,
  MapPin,
  Package,
  Truck,
  ArrowRight,
  Building2,
  Loader2,
  CheckCircle2,
  LoaderPinwheel,
  ChevronLeft,
  ChevronRight,
  FileWarning,
  ListCheck,
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
  staffReceiptApi,
  GetInboundRequestListDto,
} from "@/services/receipt-service";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { userApi } from "@/services/user-service";
import { useTranslation } from "react-i18next";

interface Props {
  role?: "staff" | "manager";
}

export default function StaffInboundDetailPage({ role = "staff" }) {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [request, setRequest] = useState<GetInboundRequestListDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [qcData, setQcData] = useState<any | null>(null);
  const [incidentData, setIncidentData] = useState<any | null>(null);

  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await staffReceiptApi.getInboundRequestDetail(id);
        const requestData = res.data;

        setRequest(requestData);
        if (
          requestData.status === "Completed" ||
          requestData.status === "GoodsArrived"
        ) {
          try {
            const qcRes = await staffReceiptApi.getQCCheck(id);
            setQcData(qcRes.data);

            // Chỉ thử fetch Incident nếu QC là Fail
            if (qcRes.data.overallResult === "Fail") {
              const incRes = await staffReceiptApi.getIncidentReport(id);
              setIncidentData(incRes.data);
            }
          } catch (error: any) {
            // Bỏ qua lỗi 404 vì đơn giản là chưa có dữ liệu
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

    if (id) fetchData();
  }, [id]);

  const handleDownloadTemplate = async () => {
    if (!request) return;
    setIsDownloading(true);

    try {
      // 1. Định nghĩa Header
      const headers = [
        "No.", // A
        "Material Code", // B
        "Material Name", // C
        "Unit", // D
        "Warehouse Name", // E
        "Required Quantity", // E
        "Actual Quantity", // F (Nhập liệu)
        "Bin Code", // G (Nhập liệu)
        "Batch Code", // H (Nhập liệu)
        "MFG Date", // I (Nhập liệu - Format: YYYY-MM-DD)
      ];

      // 2. Map dữ liệu (Lưu ý: Phải đủ số lượng phần tử tương ứng với Header)
      const dataRows = request.items.map((item, index) => [
        index + 1, // No.
        item.materialCode, // Material Code
        item.materialName, // Material Name
        item.unit || "Unit", // Unit (fallback nếu null)
        request.warehouseName || "N/A", // Unit (fallback nếu null)
        item.quantity, // Required Quantity
        "", // Actual Quantity (Empty)
        "", // Bin Code (Empty)
        "", // Batch Code (Empty)
        "dd/mm/yyyy", // MFG Date (Empty)
      ]);

      // 3. Tạo Sheet
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

      for (let row = 1; row <= range.e.r; row++) {
        const colIndex = 8;

        const cellRef = XLSX.utils.encode_cell({ r: row, c: colIndex });

        if (!worksheet[cellRef]) {
          worksheet[cellRef] = { t: "s", v: "" };
        }

        worksheet[cellRef].z = "dd/mm/yyyy";
      }

      // 4. Cấu hình độ rộng cột
      worksheet["!cols"] = [
        { wch: 5 }, // A: No.
        { wch: 15 }, // B: Mat Code
        { wch: 30 }, // C: Mat Name
        { wch: 10 }, // D: Unit
        { wch: 30 },
        { wch: 15 }, // E: Req Qty
        { wch: 15 }, // F: Act Qty
        { wch: 30 }, // G: Bin Code
        { wch: 20 }, // H: Batch Code
        { wch: 15 }, // I: MFG Date
      ];

      // 5. Xuất file
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "INBOUND_CHECK");
      XLSX.writeFile(workbook, `Inbound_${request.receiptCode}.xlsx`);

      toast.success(t("Template downloaded successfully!"), {
        description: t(
          "Please fill in Actual Qantity, Bin Code, and Batch info.",
        ),
      });
    } catch (error) {
      console.error("Download error:", error);
      toast.error(t("Failed to download template"));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleProcess = () => {
    toast.info(t("Proceeding to QC check"));
    router.push(`${id}/process`);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN", {
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
              onClick={() => router.push(role === 'manager' ? '/manager/import-request' : '/staff/import-request')}
              className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to List")}
            </Button>

            <div className="flex gap-3">
              {role == "staff" && <Button
                variant="outline"
                className="bg-white border-green-600 text-green-700 hover:bg-green-50 hover:text-green-700"
                onClick={handleDownloadTemplate}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                )}
                {t("Download Template")}
              </Button>}

              {(request.status == "Approved" ||
                request.status == "GoodsArrived") && role == "staff" && (
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                  onClick={handleProcess}
                >
                  {qcData ? t("Continue Processing") : t("Start Processing")}{" "}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column: General Info */}
            <div className="lg:col-span-3 space-y-6">
              {/* Warehouse & Supplier Info Card */}
              <Card className="border-slate-200 shadow-sm gap-0">
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
                    {request.status === "Completed" ? (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1" />
                        <div>
                          <p className="font-medium text-slate-800">
                            {t("Completed")}
                          </p>
                          <p className="text-xs text-slate-500">
                            {t("By Staff Team")} - Them
                          </p>
                        </div>
                      </div>
                    ) : request.status === "Approved" ? (
                      <div className="flex items-start gap-2">
                        <LoaderPinwheel className="w-4 h-4 text-emerald-500 mt-1" />
                        <div>
                          <p className="font-medium text-slate-800">
                            {t("Approved - Ready for QC Check")}
                          </p>
                          <p className="text-xs text-slate-500">
                            {t("Date")}:{" "}
                            {formatDate(request.receiptApprovalDate)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <LoaderPinwheel className="w-4 h-4 text-emerald-500 mt-1" />
                        <div>
                          <p className="font-medium text-slate-800">
                            {t("QC Check Completed - Ready for Import")}
                          </p>
                          <p className="text-xs text-slate-500">
                            {t("Date")}:{" "}
                            {formatDate(request.receiptApprovalDate)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Items Table */}
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
                          <TableHead className="w-[25%]">
                            {t("Material")}
                          </TableHead>
                          <TableHead className="w-[20%]">
                            {t("Supplier")}
                          </TableHead>
                          <TableHead className="text-center w-[10%]">
                            {t("Expected Quantity")}
                          </TableHead>
                          {request.status === "Completed" && (
                            <TableHead className="text-center w-[10%]">
                              {t("Actual Quantity")}
                            </TableHead>
                          )}
                          {request.status === "Completed" ? (
                            <>
                              <TableHead className="text-center w-[15%]">
                                {t("Bin Code")}
                              </TableHead>
                              <TableHead className="text-center w-[15%]">
                                {t("Batch Code")}
                              </TableHead>
                              <TableHead className="text-center w-[25%] pr-6">
                                {t("MFG Date")}
                              </TableHead>
                            </>
                          ) : (
                            <TableHead className="text-center w-[15%] pr-6">
                              {t("Status")}
                            </TableHead>
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
                            {request.status === "Completed" && (
                              <TableCell className="text-center w-[15%]">
                                <span
                                  className={`font-bold ${
                                    item.actualQuantity === item.quantity
                                      ? "text-green-600"
                                      : "text-yellow-500"
                                  }`}
                                >
                                  {item.actualQuantity?.toLocaleString("vi-VN")}
                                </span>
                              </TableCell>
                            )}
                            {request.status === "Completed" ? (
                              <>
                                <TableCell className="text-center pr-6">
                                  <Badge
                                    variant="outline"
                                    className="border-slate-200 text-slate-500 font-normal text-xs"
                                  >
                                    {item.binCode}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center pr-6">
                                  <Badge
                                    variant="outline"
                                    className="border-slate-200 text-slate-500 font-normal text-xs"
                                  >
                                    {item.batchCode}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center pr-6">
                                  <span className="text-slate-800">
                                    {item.mfgDate
                                      ? new Date(
                                          item.mfgDate,
                                        ).toLocaleDateString("vi-VN")
                                      : t("N/A")}
                                  </span>
                                </TableCell>
                              </>
                            ) : (
                              <TableCell className="text-center pr-6">
                                <Badge
                                  variant="outline"
                                  className="border-slate-200 text-slate-500 font-normal text-xs"
                                >
                                  {t("Pending")}
                                </Badge>
                              </TableCell>
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
                <Card className="border-slate-200 shadow-sm mt-6 gap-0">
                  <CardHeader className="bg-white border-b border-slate-100 py-4">
                    <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-slate-500" />
                      {t("Quality Control & Inspection Results")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
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

                    {/* KHỐI TÓM TẮT INCIDENT (NẾU CÓ) */}
                    {incidentData && (
                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-3 mb-3">
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

                        <div className="text-sm text-slate-600 space-y-2">
                          <p>
                            <span className="font-medium text-slate-700">
                              {t("General Description")}:
                            </span>{" "}
                            {incidentData.description}
                          </p>

                          <div className="mt-3">
                            <p className="font-medium text-slate-700 mb-1">
                              {t("Reported Issues")}:
                            </p>
                            <Table>
                              <TableHeader className="bg-slate-50">
                                <TableRow>
                                  <TableHead className="h-8">
                                    {t("Material")}
                                  </TableHead>
                                  <TableHead className="h-8 text-center">
                                    {t("Expected")}
                                  </TableHead>
                                  <TableHead className="h-8 text-center">
                                    {t("Actual")}
                                  </TableHead>
                                  <TableHead className="h-8">
                                    {t("Issue Type")}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {incidentData.details.map(
                                  (inc: any, idx: number) => (
                                    <TableRow key={idx}>
                                      <TableCell className="py-2 text-xs font-medium">
                                        {inc.materialName}
                                      </TableCell>
                                      <TableCell className="py-2 text-xs text-center">
                                        {inc.expectedQuantity}
                                      </TableCell>
                                      <TableCell className="py-2 text-xs text-center font-bold text-red-500">
                                        {inc.actualQuantity}
                                      </TableCell>
                                      <TableCell className="py-2 text-xs">
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

            {/* Right Column: Summary Stats */}
            <div className="space-y-6">
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 uppercase">
                    {t("Receipt Summary")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-200 pb-3">
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

                  <div className="pt-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-800">
                      <strong>{t("Instructions")}:</strong>
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                        <li>
                          {t("Download the template to verify items offline.")}
                        </li>
                        <li>
                          {t(
                            'Click "Start Processing" to input actual received quantities.',
                          )}
                        </li>
                        <li>
                          {t("Ensure physical count matches the system.")}
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
