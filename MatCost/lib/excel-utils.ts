import * as XLSX from "xlsx";

export function exportToExcel({
  data,
  filename,
  sheetName = "Sheet1",
  columnsWidth,
}: {
  data: any[];
  filename: string;
  sheetName?: string;
  columnsWidth?: { wch: number }[];
}) {
  const worksheet = XLSX.utils.json_to_sheet(data);

  if (columnsWidth) {
    worksheet["!cols"] = columnsWidth;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
