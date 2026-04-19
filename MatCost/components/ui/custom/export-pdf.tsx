"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ColumnDef {
  header: string;
  key: string | ((item: any) => any);
}

interface ExportPdfProps {
  data: any[];
  columns: ColumnDef[];
  title?: string;
  disabled?: boolean;
}

export function ExportPdfButton({
  data,
  columns,
  title = "BẢNG BÁO GIÁ",
  disabled = false,
}: ExportPdfProps) {
  const handleExport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Vui lòng cho phép popup để in PDF!");
      return;
    }

    const ths = columns.map((c) => `<th>${c.header}</th>`).join("");

    const trs = data
      .map((item, index) => {
        const tds = columns
          .map((c) => {
            const val =
              typeof c.key === "function" ? c.key(item) : item[c.key as string];
            return `<td>${val !== null && val !== undefined ? val : ""}</td>`;
          })
          .join("");
        return `<tr><td style="text-align: center; width: 40px;">${index + 1}</td>${tds}</tr>`;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          /* Cấu hình trang in: Chuyển sang Landscape (ngang) */
          @media print {
            @page { margin: 15mm; size: A4 landscape; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          
          /* CSS rút gọn, lấp đầy không gian ngang */
          body { 
            font-family: "Times New Roman", Times, serif; 
            color: #000; 
            line-height: 1.5; 
            font-size: 14px; 
            padding: 0; 
            margin: 0;
          }
          .title { 
            text-align: center; 
            font-size: 24px; 
            font-weight: bold; 
            margin: 20px 0; 
            text-transform: uppercase; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 10px; 
          }
          th, td { 
            border: 1px solid #000; 
            padding: 8px 6px; 
          }
          th { 
            background-color: #DFDFDF !important; 
            color: #000; 
            font-weight: bold; 
            text-align: center; 
            text-transform: uppercase;
            font-size: 13px;
          }
          td { 
            text-align: center; 
            font-size: 13px;
          }
          .text-left { 
            text-align: left; 
          }
        </style>
      </head>
      <body>
        <div class="title">${title}</div>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              ${ths}
            </tr>
          </thead>
          <tbody>
            ${trs}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.addEventListener("afterprint", () => printWindow.close());
    }, 500);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || data.length === 0}
      className="h-9 bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 hover:text-rose-700 shadow-sm transition-colors"
      onClick={handleExport}
    >
      <FileText className="mr-2 h-4 w-4" />
      PDF
    </Button>
  );
}
