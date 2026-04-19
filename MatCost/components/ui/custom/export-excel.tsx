"use client";

import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

interface ExportExcelProps {
  data: any[];
  filename?: string;
  columns?: { header: string; key: string | ((item: any) => any) }[];
}

export function ExportExcelButton({
  data,
  filename = "Export",
  columns,
}: ExportExcelProps) {
  const handleExport = () => {
    let sheetData = data;

    // If columns mapping is provided, map the data first
    if (columns && columns.length > 0) {
      sheetData = data.map((item) => {
        const row: any = {};
        columns.forEach((col) => {
          if (typeof col.key === "function") {
            row[col.header] = col.key(item);
          } else {
            row[col.header] = item[col.key];
          }
        });
        return row;
      });
    }

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Export-Data");

    // Auto fit columns
    if (sheetData.length > 0) {
      const colWidths = Object.keys(sheetData[0]).map((key) => {
        // Find max length of cell contents
        const maxContentLength = sheetData.reduce((max, row) => {
          const content = row[key] ? row[key].toString() : "";
          return Math.max(max, content.length);
        }, key.length);
        return {
          wch: Math.min(Math.max(key.length, maxContentLength) + 2, 50),
        };
      });
      ws["!cols"] = colWidths;
    }

    XLSX.writeFile(wb, `${filename}_${new Date().toDateString()}.xlsx`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 shadow-sm transition-colors"
      onClick={handleExport}
      disabled={!data || data.length === 0}
    >
      <FileSpreadsheet className="mr-2 h-4 w-4" />
      Excel
    </Button>
  );
}
