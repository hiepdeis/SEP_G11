"use client";

import React, { useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface PutawayExcelHandlerProps {
  items: any[];
  binLocations: any[];
  receipt: any;
  onImport: (updatedItems: any[]) => void;
}

export function PutawayExcelHandler({
  items,
  binLocations,
  receipt,
  onImport,
}: PutawayExcelHandlerProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // XUẤT TEMPLATE
  const handleDownloadTemplate = () => {
    if (items.length === 0) {
      toast.warning(t("No items available to export."));
      return;
    }

    const exportData: any[] = [];

    items.forEach((item) => {
      const allocations =
        item.binAllocations?.length > 0 ? item.binAllocations : [null];

      allocations.forEach((bin: any) => {
        const binCode = bin
          ? binLocations.find((b) => b.binId === bin.binId)?.code || ""
          : "";

        exportData.push({
          "Material ID": item.materialId,
          "Material Code": item.materialCode,
          "Material Name": item.materialName,
          "Target Qty": item.passQuantity,
          "Batch Code *": item.batch.batchCode || "",
          "Mfg Date *": item.batch.mfgDate
            ? item.batch.mfgDate.split("T")[0]
            : "",
          "Expiry Date *": item.batch.expiryDate
            ? item.batch.expiryDate.split("T")[0]
            : "",
          "Bin Code *": binCode,
          "Bin Qty *": bin ? bin.quantity : item.passQuantity,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    const instructions = [
      ["💡 HƯỚNG DẪN CHIA 1 MẶT HÀNG VÀO NHIỀU KỆ (BIN):"],
      ["1. Tìm dòng vật tư bạn muốn chia (VD: Gạch men)."],
      [
        "2. Copy dòng đó và chèn (Insert) xuống dưới thành nhiều dòng giống hệt nhau.",
      ],
      ["3. Dòng 1: Cột Bin Code gõ kệ A, Bin Qty gõ 60."],
      ["4. Dòng 2: Cột Bin Code gõ kệ B, Bin Qty gõ 40."],
      ["5. Lưu file & Import -> Hệ thống sẽ tự đẻ ra 2 ô kệ cho Gạch men!"],
      ["Lưu ý: Lô và Ngày tháng chỉ để dòng đầu tiên của từng sản phẩm!"],
    ];

    XLSX.utils.sheet_add_aoa(worksheet, instructions, { origin: "K2" });

    const range = { s: { c: 10, r: 1 }, e: { c: 10, r: 6 } }; // K2 đến K7
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellRef = XLSX.utils.encode_cell({ c: 10, r: R });
      if (!worksheet[cellRef]) continue;

      worksheet[cellRef].s = {
        fill: { fgColor: { rgb: "FFF2CC" } },
        font: {
          color: { rgb: "9F6000" },
          bold: R === 1,
          italic: R > 1,
        },
        border: {
          top: { style: "thin", color: { rgb: "D6B656" } },
          bottom: { style: "thin", color: { rgb: "D6B656" } },
          left: { style: "thin", color: { rgb: "D6B656" } },
          right: { style: "thin", color: { rgb: "D6B656" } },
        },
      };
    }

    worksheet["!cols"] = [
      { wch: 12 }, // A: ID
      { wch: 15 }, // B: Code
      { wch: 35 }, // C: Name
      { wch: 12 }, // D: Target Qty
      { wch: 20 }, // E: Batch
      { wch: 22 }, // F: Mfg Date
      { wch: 22 }, // G: Expiry Date
      { wch: 15 }, // H: Bin Code *
      { wch: 12 }, // I: Bin Qty *
      { wch: 2 }, // J: Cột khoảng trắng (Separator)
      { wch: 75 }, // K: Cột chứa chữ Hướng dẫn (Rộng ra để text không bị khuất)
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Putaway_Data");
    XLSX.writeFile(workbook, `${receipt.receiptCode}_Putaway_Template.xlsx`);
  };

  const parseDateString = (dateStr: any) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "" : d.toISOString();
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
        const data = XLSX.utils.sheet_to_json(ws, { raw: false });

        let hasWarning = false;

        // 1. Gom nhóm (Group by) các dòng Excel theo Material ID
        const groupedExcelData: Record<string, any> = {};

        data.forEach((row: any) => {
          const matId = String(row["Material ID"]);
          if (!matId || matId === "undefined") return;

          // Nếu chưa tồn tại trong object, khởi tạo thông tin Batch
          if (!groupedExcelData[matId]) {
            groupedExcelData[matId] = {
              batchCode: row["Batch Code *"],
              mfgDate: row["Mfg Date *"],
              expiryDate: row["Expiry Date *"],
              bins: [], // Mảng chứa các bins
            };
          }

          // Trích xuất thông tin Bin của dòng này đẩy vào mảng bins
          const binCode = row["Bin Code *"]
            ? String(row["Bin Code *"]).trim()
            : "";
          const binQty = Math.max(0, Number(row["Bin Qty *"]) || 0);

          if (binCode && binQty > 0) {
            groupedExcelData[matId].bins.push({ binCode, binQty });
          }
        });

        // 2. Cập nhật dữ liệu vào items
        const updatedItems = items.map((item) => {
          const excelGroup = groupedExcelData[String(item.materialId)];

          if (excelGroup) {
            // Lấy thông tin Lô hàng (Lấy từ dòng Excel đầu tiên của Material này)
            const batchCode = excelGroup.batchCode
              ? String(excelGroup.batchCode)
              : item.batch.batchCode;
            const mfgDate =
              parseDateString(excelGroup.mfgDate) || item.batch.mfgDate;
            const expiryDate =
              parseDateString(excelGroup.expiryDate) || item.batch.expiryDate;

            // Xử lý danh sách Bin
            let newAllocations: any[] = [];

            if (excelGroup.bins.length > 0) {
              excelGroup.bins.forEach((b: any) => {
                const matchedBin = binLocations.find(
                  (loc) => loc.code.toLowerCase() === b.binCode.toLowerCase(),
                );

                if (matchedBin) {
                  newAllocations.push({
                    id: crypto.randomUUID(),
                    binId: matchedBin.binId,
                    quantity: b.binQty,
                  });
                } else {
                  hasWarning = true; // Báo lỗi nếu gõ sai tên Bin
                }
              });
            }

            // Fallback: Nếu Excel không có bin nào hợp lệ, giữ nguyên bin trống trên UI
            if (newAllocations.length === 0) {
              newAllocations = [...item.binAllocations];
            }

            return {
              ...item,
              batch: {
                ...item.batch,
                batchCode,
                mfgDate,
                expiryDate,
              },
              binAllocations: newAllocations,
            };
          }

          return item; // Nếu Material này không có trong Excel thì bỏ qua
        });

        onImport(updatedItems);

        if (hasWarning) {
          toast.warning(
            t(
              "Imported with warnings. Some Bin Code *s were invalid or not found.",
            ),
          );
        } else {
          toast.success(t("Imported successfully!"));
        }
      } catch (error) {
        console.error("Error importing excel:", error);
        toast.error(t("Failed to parse Excel file."));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
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
          className="h-9 text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 shadow-sm hover:text-indigo-700"
          onClick={handleDownloadTemplate}
        >
          <Download className="w-4 h-4 mr-2" />
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
          className="h-9 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 shadow-sm hover:text-emerald-700"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          {t("Import Data")}
        </Button>
      </div>

      <span className="text-[11px] text-slate-500 italic pr-1">
        {t("Only fill in columns marked with '*'")}
      </span>
    </div>
  );
}
