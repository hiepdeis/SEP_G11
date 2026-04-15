"use client";

import React, { useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ReceiptItem {
  materialId: number;
  materialCode: string;
  materialName: string;
  orderedQuantity: number;
  actualQuantity: number;
  passQuantity: number;
  failQuantity: number;
  failReason: string;
  unit: string;
  isDecimalUnit: boolean;
}

interface Order {
  poCode: string;
}

interface ReceiptExcelHandlerProps {
  items: ReceiptItem[];
  order: Order;
  onImport: (updatedItems: ReceiptItem[]) => void;
}

export function QCReceiptExcelHandler({
  items,
  order,
  onImport,
}: ReceiptExcelHandlerProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    if (items.length === 0) {
      toast.warning(t("No items available to export."));
      return;
    }

    const exportData = items.map((item) => ({
      "Material ID": item.materialId, // ID dùng làm key đối chiếu
      "Material Code": item.materialCode,
      "Material Name": item.materialName,
      "Ordered Qty": item.orderedQuantity,
      "Actual Qty *": item.actualQuantity,
      "Pass Qty *": item.passQuantity,
      "Fail Reason": item.failReason,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Chỉnh độ rộng cột cho đẹp
    worksheet["!cols"] = [
      { wch: 12 }, // ID
      { wch: 15 }, // Code
      { wch: 35 }, // Name
      { wch: 12 }, // Ordered
      { wch: 12 }, // Actual
      { wch: 12 }, // Pass
      { wch: 30 }, // Reason
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Receipt_QC");
    XLSX.writeFile(workbook, `${order.poCode}_QC_Template.xlsx`);
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

        const updatedItems = items.map((item) => {
          // Tìm row tương ứng dựa trên Material ID
          const row: any = data.find(
            (r: any) => r["Material ID"] === item.materialId,
          );

          if (row) {
            const actual = Math.max(0, Number(row["Actual Qty *"]) || 0);
            // Pass Qty * không được lớn hơn Actual
            const pass = Math.min(
              actual,
              Math.max(0, Number(row["Pass Qty *"]) || 0),
            );

            // Tính lại Fail Qty y như logic C# của bạn
            const targetQuantity = Math.min(item.orderedQuantity, actual);
            const fail = Math.max(0, targetQuantity - pass);

            return {
              ...item,
              actualQuantity: actual,
              passQuantity: pass,
              failQuantity: fail,
              failReason: row["Fail Reason"] ? String(row["Fail Reason"]) : "",
            };
          }
          return item; // Giữ nguyên nếu không tìm thấy row
        });

        onImport(updatedItems);
        toast.success(t("Imported successfully!"));
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
      </div>
      <span className="text-[11px] text-slate-500 italic pr-1">
        {t("Only fill in columns marked with '*'")}
      </span>
    </div>
  );
}
