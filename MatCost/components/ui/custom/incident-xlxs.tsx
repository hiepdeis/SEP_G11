"use client";

import React, { useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface IncidentExcelItem {
  materialId: number;
  materialCode: string;
  materialName: string;
  orderedQuantity: number;
  actualQuantity: number;
  failQuantity: number; // Tổng Fail cố định từ QC
  breakdown: {
    quantity: number; // Cố định
    quality: number;
    damage: number;
  };
  notes: string;
}

interface QCData {
  receiptCode?: string | undefined;
}

interface IncidentExcelHandlerProps {
  items: IncidentExcelItem[];
  qcData: QCData | null;
  onImport: (updatedItems: IncidentExcelItem[]) => void;
  isHistoryView?: boolean;
}

export function IncidentExcelHandler({
  items,
  qcData,
  onImport,
  isHistoryView,
}: IncidentExcelHandlerProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    if (items.length === 0) {
      toast.warning(t("No items available to export."));
      return;
    }

    const exportData = items.map((item) => ({
      "Material ID": item.materialId, // Khóa chính
      "Material Code": item.materialCode,
      "Material Name": item.materialName,
      "Total Failed": item.failQuantity,
      Quantity: item.breakdown.quantity,
      "Quality *": item.breakdown.quality || 0,
      "Damage *": item.breakdown.damage || 0,
      "Detailed Notes *": item.notes,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    worksheet["!cols"] = [
      { wch: 12 }, // ID
      { wch: 15 }, // Code
      { wch: 35 }, // Name
      { wch: 12 }, // Failed
      { wch: 15 }, // Shortage
      { wch: 15 }, // Quality
      { wch: 15 }, // Damaged
      { wch: 40 }, // Notes
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Incident_Breakdown");
    XLSX.writeFile(workbook, `${qcData?.receiptCode}_Incident_Template.xlsx`);
  };

  // NHẬP EXCEL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let hasError = false;

        const updatedItems = items.map((item) => {
          const row: any = data.find(
            (r: any) => r["Material ID"] === item.materialId,
          );

          if (row) {
            const parsedQuality = Math.max(0, Number(row["Quality *"]) || 0);
            const parsedDamage = Math.max(0, Number(row["Damage *"]) || 0);

            // Logic bù trừ 2 chiều để bảo vệ (Giống hệt hàm updateBreakdown)
            const totalFail = item.failQuantity;
            const safeQuality = Math.min(parsedQuality, totalFail);
            const finalDamage = Math.min(parsedDamage, totalFail - safeQuality);
            const finalQuality = totalFail - finalDamage; // Cân bằng phần dư còn lại

            // Nếu dữ liệu trong Excel tổng cộng lại không bằng Total Failed, bật flag cảnh báo
            if (parsedQuality + parsedDamage !== totalFail) {
              hasError = true;
            }

            return {
              ...item,
              breakdown: {
                ...item.breakdown, // Giữ nguyên Shortage
                quality: finalQuality,
                damage: finalDamage,
              },
              notes: row["Detailed Notes *"]
                ? String(row["Detailed Notes *"])
                : "",
            };
          }
          return item;
        });

        onImport(updatedItems);

        if (hasError) {
          toast.warning(
            t(
              "Imported with auto-corrections. Some totals did not match and were adjusted.",
            ),
          );
        } else {
          toast.success(t("Imported successfully!"));
        }
      } catch (error) {
        console.error("Error importing excel:", error);
        toast.error(t("Failed to parse Excel file."));
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 shadow-sm hover:text-indigo-700"
          onClick={handleDownloadTemplate}
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          {t("Template")}
        </Button>

        {!isHistoryView && (
          <>
            <input
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 shadow-sm hover:text-emerald-700"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              {t("Import Data")}
            </Button>
          </>
        )}
      </div>
      <span className="text-[11px] text-slate-500 italic pr-1">
        {t("Only fill in columns marked with '*'")}
      </span>
    </div>
  );
}
