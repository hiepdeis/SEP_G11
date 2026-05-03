"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { AccountantReceiptDetailDto } from "@/services/import-service";

interface ExportReceiptPdfProps {
  receipt: AccountantReceiptDetailDto;
  disabled?: boolean;
}

// Hàm format tiền tệ VNĐ
const formatVND = (amount: number | undefined | null) => {
  if (amount == null) return "";
  return new Intl.NumberFormat("vi-VN").format(amount);
};

// Hàm đọc số tiền thành chữ (Tiếng Việt)
function readVietnameseNumber(number: number): string {
  if (number === 0) return "Không đồng";
  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  const digits = [
    "không",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];

  function readGroup(n: number, full: boolean): string {
    let result = "";
    const hundred = Math.floor(n / 100);
    const ten = Math.floor((n % 100) / 10);
    const unit = n % 10;

    if (full || hundred > 0) result += digits[hundred] + " trăm ";
    if (ten === 0 && unit > 0 && (full || hundred > 0)) result += "lẻ ";
    if (ten === 1) result += "mười ";
    if (ten > 1) result += digits[ten] + " mươi ";
    if (unit === 1 && ten > 1) result += "mốt ";
    else if (unit === 5 && ten > 0) result += "lăm ";
    else if (unit > 0) result += digits[unit] + " ";
    return result.trim();
  }

  let result = "";
  let unitIndex = 0;
  let tempNumber = Math.abs(number);

  while (tempNumber > 0) {
    const group = tempNumber % 1000;
    if (group > 0) {
      const groupText = readGroup(group, tempNumber > 1000);
      result = groupText + " " + units[unitIndex] + " " + result;
    }
    tempNumber = Math.floor(tempNumber / 1000);
    unitIndex++;
  }

  result = result.trim().replace(/\s+/g, " ");
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return result + " đồng chẵn.";
}

export function ExportReceiptPdfButton({
  receipt,
  disabled = false,
}: ExportReceiptPdfProps) {
  const handleExport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Vui lòng cho phép popup để in phiếu!");
      return;
    }

    // Xử lý ngày tháng chứng từ
    const receiptDate = receipt.receiptDate
      ? new Date(receipt.receiptDate)
      : new Date();
    const day = format(receiptDate, "dd");
    const month = format(receiptDate, "MM");
    const year = format(receiptDate, "yyyy");

    const printDate = new Date();
    const printDay = format(printDate, "dd");
    const printMonth = format(printDate, "MM");
    const printYear = format(printDate, "yyyy");

    // Lấy dữ liệu từ ReceiptDetails (Có chứa Giá và Thành tiền)
    const items = receipt.receiptDetails || [];

    let totalQuantity = 0;
    let actualTotalQuantity = 0;
    let grandTotalAmount = 0;

    const trs = items
      .map((item, index) => {
        const qty = item.actualQuantity || 0;
        actualTotalQuantity += qty;
        const lineTotal = item.lineTotal || 0;
        totalQuantity += item.quantity || 0;
        grandTotalAmount += lineTotal;

        return `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td class="text-left">
              <strong>${item.materialName || ""}</strong>
            </td>
            <td style="text-align: center;">${item.materialCode || ""}</td>
            <td style="text-align: center;">${item.materialUnit || "Cái"}</td>
            <!-- Số lượng theo chứng từ (tạm lấy bằng thực nhập) -->
            <td style="text-align: right;">${formatVND(item.quantity)}</td>
            <!-- Số lượng thực nhập -->
            <td style="text-align: right; font-weight: bold;">${formatVND(qty)}</td>
            <!-- Đơn giá -->
            <td style="text-align: right;">${formatVND(item.unitPrice)}</td>
            <!-- Thành tiền -->
            <td style="text-align: right; font-weight: bold;">${formatVND(lineTotal)}</td>
          </tr>
        `;
      })
      .join("");

    // HTML Template dạng Mẫu 01-VT
    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Phiếu Nhập Kho - ${receipt.receiptCode}</title>
        <style>
          /* In Landscape để cột rộng rãi, dễ nhìn số tiền */
          @media print {
            @page { margin: 15mm; size: A4 landscape; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          
          body { 
            font-family: "Times New Roman", Times, serif; 
            color: #000; 
            line-height: 1.5; 
            font-size: 14px; 
            padding: 0; 
            margin: 0;
          }
          
          .header-container {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .header-left { font-weight: bold; font-size: 15px; }
          .header-right { text-align: center; }
          
          .title-container {
            text-align: center;
            margin-bottom: 20px;
          }
          .title { 
            font-size: 24px; 
            font-weight: bold; 
            text-transform: uppercase; 
            margin-bottom: 5px;
          }
          .subtitle { font-style: italic; font-size: 15px; }
          
          .info-row { margin-bottom: 6px; font-size: 15px; }
          .info-label { display: inline-block; width: 180px; }
          .dots { border-bottom: 1px dotted #000; display: inline-block; width: calc(100% - 185px); font-weight: bold; }
          .dots-short { border-bottom: 1px dotted #000; display: inline-block; width: 300px; font-weight: bold;}
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px;
            margin-bottom: 15px; 
          }
          th, td { 
            border: 1px solid #000; 
            padding: 8px 6px; 
          }
          th { 
            background-color: #f2f2f2 !important; 
            color: #000; 
            font-weight: bold; 
            text-align: center; 
            font-size: 14px;
          }
          td { font-size: 14px; }
          .text-left { text-align: left; }
          
          .signature-container {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            text-align: center;
          }
          .sig-box { width: 25%; }
          .sig-title { font-weight: bold; margin-bottom: 3px; font-size: 15px; }
          .sig-sub { font-style: italic; font-size: 13px; }
          .sig-name { margin-top: 70px; font-weight: bold; font-size: 15px;}
        </style>
      </head>
      <body>
        
        <div class="header-container">
          <div class="header-left">
            <div>Đơn vị: CÔNG TY TNHH VILA 16</div>
            <div>Bộ phận: Kho Trung Tâm</div>
          </div>
          <div class="header-right">
            <div style="font-weight: bold; font-size: 15px;">Mẫu số: 01 - VT</div>
            <div style="font-style: italic; font-size: 13px;">(Ban hành theo Thông tư số 200/2014/TT-BTC<br/>của Bộ Tài chính)</div>
          </div>
        </div>

        <div class="title-container">
          <div class="title">PHIẾU NHẬP KHO</div>
          <div class="subtitle">Ngày ${day} tháng ${month} năm ${year}</div>
          <div style="margin-top: 5px; font-size: 15px;">Số: <strong>${receipt.receiptCode}</strong></div>
        </div>

        <div style="margin-bottom: 15px;">
          <!-- <div class="info-row" style="display: flex;">
            <span style="white-space: nowrap; width: 170px;">- Họ, tên người giao:</span> 
            <span style="border-bottom: 1px dotted #000; flex-grow: 1;">&nbsp;</span>
          </div>-->
          <div class="info-row" style="display: flex;">
            <span style="white-space: nowrap; width: 170px;">- Theo Đơn đặt hàng số:</span>
            <span style="border-bottom: 1px dotted #000; width: 220px; font-weight: bold;">
              ${receipt.purchaseOrder?.purchaseOrderCode || ""}
            </span>
            <span style="white-space: nowrap; margin-left: 15px; margin-right: 5px;">Của ĐV:</span>
            <span style="border-bottom: 1px dotted #000; flex-grow: 1; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${receipt.purchaseOrder?.supplierName || ""}
            </span>
          </div>
          <div class="info-row" style="display: flex;">
            <span style="white-space: nowrap; width: 170px;">- Nhập tại kho:</span>
            <span style="border-bottom: 1px dotted #000; flex-grow: 1; font-weight: bold;">
              Kho Trung Tâm - Công ty TNHH VILA 16
            </span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width: 50px;">STT</th>
              <th rowspan="2">Tên, nhãn hiệu, quy cách vật tư, dụng cụ, sản phẩm, hàng hóa</th>
              <th rowspan="2" style="width: 120px;">Mã số</th>
              <th rowspan="2" style="width: 80px;">Đơn vị tính</th>
              <th colspan="2">Số lượng</th>
              <th rowspan="2" style="width: 120px;">Đơn giá</th>
              <th rowspan="2" style="width: 140px;">Thành tiền</th>
            </tr>
            <tr>
              <th style="width: 90px;">Theo chứng từ</th>
              <th style="width: 90px;">Thực nhập</th>
            </tr>
          </thead>
          <tbody>
            ${trs}
            <!-- Dòng tổng cộng -->
            <tr style="background-color: #fafafa !important;">
              <td colspan="4" style="text-align: center; font-weight: bold; font-size: 15px;">Cộng</td>
              <td style="text-align: right; font-weight: bold;">${formatVND(totalQuantity)}</td>
              <td style="text-align: right; font-weight: bold;">${formatVND(actualTotalQuantity)}</td>
              <td></td>
              <td style="text-align: right; font-weight: bold;">${formatVND(grandTotalAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="info-row" style="margin-top: 15px;">
          <span>- Tổng số tiền (viết bằng chữ): <strong>${readVietnameseNumber(grandTotalAmount)}</strong></span>
        </div>
        <!-- <div class="info-row">
          <span>- Số chứng từ gốc kèm theo: ................................................................................................................................................................................</span>
        </div> -->

        <div style="text-align: right; margin-top: 20px; font-style: italic; font-size: 15px;">
          Ngày ${printDay} tháng ${printMonth} năm ${printYear}
        </div>

        <div class="signature-container">
          <div class="sig-box">
            <div class="sig-title">Người lập phiếu</div>
            <div class="sig-sub">(Ký, họ tên)</div>
            <div class="sig-name"></div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Người giao hàng</div>
            <div class="sig-sub">(Ký, họ tên)</div>
            <div class="sig-name"></div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Thủ kho</div>
            <div class="sig-sub">(Ký, họ tên)</div>
            <div class="sig-name"></div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Kế toán trưởng</div>
            <div class="sig-sub">(Ký, họ tên)</div>
            <div class="sig-name">${receipt.stampedByName || ""}</div>
          </div>
        </div>

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
      disabled={disabled || !receipt}
      className="bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-700 border-slate-200 shadow-sm"
      onClick={handleExport}
    >
      <Download className="mr-2 h-4 w-4" />
      In Phiếu Nhập
    </Button>
  );
}
