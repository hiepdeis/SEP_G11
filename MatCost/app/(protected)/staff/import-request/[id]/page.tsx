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

export default function StaffInboundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [request, setRequest] = useState<GetInboundRequestListDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await staffReceiptApi.getInboundRequestDetail(id);
        setRequest(res.data);
      } catch (error) {
        console.error("Error loading receipt detail", error);
        toast.error("Failed to load receipt details");
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

      toast.success("Template downloaded successfully!", {
        description: "Please fill in Actual Qantity, Bin Code, and Batch info.",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download template");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleProcess = () => {
    toast.info("Proceeding to QC check");
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
        <Header title={`Inbound Request #${request.receiptCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/staff/import-request")}
              className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </Button>

            <div className="flex gap-3">
              <Button
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
                Download Template
              </Button>

              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                onClick={handleProcess}
              >
                Start Processing <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: General Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Warehouse & Supplier Info Card */}
              <Card className="border-slate-200 shadow-sm gap-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <CardTitle className="text-base font-semibold text-slate-800">
                      Destination & Logistics
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      Target Warehouse
                    </span>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-500 mt-1" />
                      <div>
                        <p className="font-medium text-slate-800">
                          {request.warehouseName}
                        </p>
                        <p className="text-xs text-slate-500">Main Facility</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      Approval Info
                    </span>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1" />
                      <div>
                        <p className="font-medium text-slate-800">
                          Approved for Inbound
                        </p>
                        <p className="text-xs text-slate-500">
                          Date: {formatDate(request.receiptApprovalDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items Table */}
              <Card className="border-slate-200 shadow-sm overflow-hidden gap-0">
                <CardHeader className="bg-white border-b border-slate-100 py-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <Package className="w-5 h-5 text-slate-500" />
                      Expected Items
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 text-slate-700"
                    >
                      {request.items.length} materials
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="w-[50px] text-center pl-6">
                          #
                        </TableHead>
                        <TableHead className="w-[35%]">Material</TableHead>
                        <TableHead className="w-[30%]">Supplier</TableHead>
                        <TableHead className="text-center w-[15%]">
                          Expected Quantity
                        </TableHead>
                        <TableHead className="text-center w-[15%] pr-6">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {request.items.map((item, index) => (
                        <TableRow
                          key={item.detailId}
                          className="hover:bg-slate-50"
                        >
                          <TableCell className="text-center text-slate-500 text-sm pl-6">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700 text-sm">
                                {item.materialName}
                              </span>
                              <span className="text-xs font-mono text-slate-500 bg-slate-100 w-fit px-1 rounded mt-0.5">
                                {item.materialCode}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Truck className="w-3 h-3 text-slate-400" />
                              <span className="text-sm text-slate-600">
                                {item.supplierName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-slate-800">
                              {item.quantity?.toLocaleString("vi-VN")}
                            </span>
                          </TableCell>
                          <TableCell className="text-center pr-6">
                            <Badge
                              variant="outline"
                              className="border-slate-200 text-slate-500 font-normal text-xs"
                            >
                              Pending Check
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Summary Stats */}
            <div className="space-y-6">
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 uppercase">
                    Receipt Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-200 pb-3">
                    <span className="text-sm text-slate-600">
                      Total Materials
                    </span>
                    <span className="text-lg font-semibold text-slate-900">
                      {request.items.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-slate-600">
                      Total Quantity
                    </span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {request.totalQuantity.toLocaleString("vi-VN")}
                    </span>
                  </div>

                  <div className="pt-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-800">
                      <strong>Instructions:</strong>
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                        <li>Download the template to verify items offline.</li>
                        <li>
                          Click "Start Processing" to input actual received
                          quantities.
                        </li>
                        <li>Ensure physical count matches the system.</li>
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
