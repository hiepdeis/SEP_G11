"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import {
  FileBarChart,
  FileSpreadsheet,
  FileWarning,
  ArrowRight,
  Download,
  Printer,
  Bell,
  User,
  Loader2,
  X,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { staffReceiptsApi } from "@/services/import-service";
import { exportToExcel } from "@/lib/excel-utils";
import { endOfDay, format, isWithinInterval, startOfDay } from "date-fns";
import { formatDateTime } from "@/lib/format-date";
import { warehouseApi } from "@/services/warehouse-service";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const REPORTS_CONFIG = [
  {
    id: "RPT-001",
    titleKey: "reports.list.stock_title",
    descKey: "reports.list.stock_desc",
    icon: FileBarChart,
    color: "text-blue-600",
    bg: "bg-blue-100",
    url: "",
  },
  {
    id: "RPT-002",
    titleKey: "reports.list.history_title",
    descKey: "reports.list.history_desc",
    icon: FileSpreadsheet,
    color: "text-green-600",
    bg: "bg-green-100",
    url: "reports/import-export",
  },
  {
    id: "RPT-003",
    titleKey: "reports.list.quality_title",
    descKey: "reports.list.quality_desc",
    icon: FileWarning,
    color: "text-red-600",
    bg: "bg-red-100",
    url: "",
  },
  {
    id: "RPT-004",
    titleKey: "reports.list.audit_title",
    descKey: "reports.list.audit_desc",
    icon: FileBarChart,
    color: "text-orange-600",
    bg: "bg-orange-100",
    url: "",
  },
];

export default function ReportCenterPage({ role }: { role: string }) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [warehouse, setWarehouse] = useState("all");

  const [warehouseList, setWarehouseList] = useState<any[]>([]);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res = await warehouseApi.getAll();
        setWarehouseList(res.data);
      } catch (error) {
        console.error("Failed to fetch warehouses", error);
      }
    };
    fetchWarehouses();
  }, []);

  const handleExport = async (type: "pdf" | "excel", reportId: string) => {
    setIsExporting(true);

    try {
      if (type === "excel") {
        if (reportId === "RPT-001") {
        } else if (reportId === "RPT-002") {
          const res = await staffReceiptsApi.getWarehouseCards({});
          let dataToExport = res.data;

          if (warehouse !== "all") {
            dataToExport = dataToExport.filter(
              // So sánh ID (nếu res trả về warehouseId) hoặc so sánh Tên Kho
              (item: any) =>
                item.warehouseId?.toString() === warehouse ||
                item.warehouseName === warehouse,
            );
          }

          if (dateRange.from || dateRange.to) {
            dataToExport = dataToExport.filter((item: any) => {
              if (!item.transactionDate) return false;

              const itemDate = new Date(item.transactionDate);
              const fromDate = dateRange.from
                ? startOfDay(dateRange.from)
                : new Date(2000, 0, 1);
              const toDate = dateRange.to
                ? endOfDay(dateRange.to)
                : new Date(2100, 0, 1);

              return isWithinInterval(itemDate, {
                start: fromDate,
                end: toDate,
              });
            });
          }

          if (dataToExport.length === 0) {
            toast.warning(t("Không có dữ liệu để xuất với bộ lọc hiện tại."));
            return;
          }

          const formattedData = dataToExport.map((item: any) => ({
            "Mã giao dịch": item.cardCode,
            "Ngày thực hiện": formatDateTime(item.transactionDate),
            "Loại giao dịch": item.transactionType.toUpperCase(),
            "Chứng từ gốc": `${item.referenceType} #${item.referenceId}`,
            "Mã VT": item.materialCode,
            "Tên VT": item.materialName,
            "Lô (Batch)": item.batchCode || "N/A",
            "Kệ (Bin)": item.binCode || "N/A",
            Kho: item.warehouseName,
            "Tồn đầu kỳ": item.quantityBefore,
            "Phát sinh":
              item.transactionType.toLowerCase() === "import"
                ? `+${item.quantity}`
                : `-${item.quantity}`,
            "Tồn cuối kỳ": item.quantityAfter,
            "Đơn vị tính": item.materialUnit,
            "Người thực hiện": item.createdByName || `ID: ${item.createdBy}`,
          }));

          exportToExcel({
            data: formattedData,
            filename: `Lich_Su_Nhap_Xuat_${format(new Date(), "yyyyMMdd_HHmmss")}`,
            columnsWidth: [
              { wch: 18 }, // Mã Giao Dịch
              { wch: 20 }, // Ngày Thực Hiện
              { wch: 15 }, // Loại Giao Dịch
              { wch: 20 }, // Chứng từ gốc
              { wch: 15 }, // Mã VT
              { wch: 35 }, // Tên VT
              { wch: 20 }, // Lô
              { wch: 15 }, // Kệ
              { wch: 25 }, // Kho
              { wch: 15 }, // Tồn Đầu Kỳ
              { wch: 12 }, // Phát Sinh
              { wch: 15 }, // Tồn Cuối Kỳ
              { wch: 12 }, // Đơn Vị Tính
              { wch: 25 }, // Người Thực Hiện
            ],
          });
          toast.success(t("Tải báo cáo Excel thành công!"));
        }
      } else if (type === "pdf") {
        toast.info(t("Tính năng xuất PDF đang được phát triển."));
      }
    } catch (error) {
      console.error("Export Error:", error);
      toast.error(t("Có lỗi xảy ra khi tải báo cáo."));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {t("reports.center_title")}
            </h2>
            <div className="flex items-center gap-4 ml-auto">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
                <Bell className="w-5 h-5" />
              </button>
              <UserDropdown
                align="end"
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                }
              />
            </div>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t("reports.available_reports")}
            </h1>
            <p className="text-sm text-slate-500">{t("reports.select_desc")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {REPORTS_CONFIG.map((rpt) => (
              <Card
                key={rpt.id}
                className="hover:shadow-md transition-shadow border-slate-200"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 rounded-xl ${rpt.bg} ${rpt.color}`}>
                      <rpt.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">
                        {t(rpt.titleKey)}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                        {t(rpt.descKey)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="text-slate-600">
                          {t("reports.view_options")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {t("reports.export_options")}: {t(rpt.titleKey)}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              {t("reports.date_range")}
                            </label>
                            <div className="flex items-center gap-2">
                              {/* Lịch Từ Ngày */}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={`justify-start text-left font-normal ${!dateRange.from && "text-slate-500"}`}
                                  >
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    {dateRange.from
                                      ? format(dateRange.from, "dd/MM/yyyy")
                                      : t("Từ ngày")}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={dateRange.from}
                                    onSelect={(date) =>
                                      setDateRange((prev) => ({
                                        ...prev,
                                        from: date,
                                      }))
                                    }
                                  />
                                </PopoverContent>
                              </Popover>

                              <span>-</span>

                              {/* Lịch Đến Ngày */}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={`justify-start text-left font-normal ${!dateRange.to && "text-slate-500"}`}
                                  >
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    {dateRange.to
                                      ? format(dateRange.to, "dd/MM/yyyy")
                                      : t("Đến ngày")}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={dateRange.to}
                                    onSelect={(date) =>
                                      setDateRange((prev) => ({
                                        ...prev,
                                        to: date,
                                      }))
                                    }
                                    disabled={(date) =>
                                      dateRange.from
                                        ? date < dateRange.from
                                        : false
                                    }
                                  />
                                </PopoverContent>
                              </Popover>

                              {/* Nút xóa bộ lọc ngày */}
                              {(dateRange.from || dateRange.to) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs text-slate-500 px-2"
                                  onClick={() =>
                                    setDateRange({
                                      from: undefined,
                                      to: undefined,
                                    })
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              {t("Warehouse")}
                            </label>
                            <Select
                              value={warehouse}
                              onValueChange={(val) => setWarehouse(val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("All Warehouse")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  {t("All Warehouse")}
                                </SelectItem>
                                {warehouseList.map((wh) => (
                                  <SelectItem
                                    key={wh.warehouseId}
                                    value={wh.warehouseId.toString()}
                                  >
                                    {wh.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter className="gap-2">
                          {/* <Button
                            variant="outline"
                            onClick={() => handleExport("pdf", rpt.id)} // Truyền rpt.id vào đây
                            disabled={isExporting}
                          >
                            {isExporting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Printer className="w-4 h-4 mr-2" />
                            )}
                            PDF
                          </Button> */}
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleExport("excel", rpt.id)} // Truyền rpt.id vào đây
                            disabled={isExporting}
                          >
                            {isExporting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileSpreadsheet className="w-4 h-4 mr-2" />
                            )}
                            Export Excel
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                      onClick={() => router.push(rpt.url)}
                    >
                      {t("reports.view_report")}{" "}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
