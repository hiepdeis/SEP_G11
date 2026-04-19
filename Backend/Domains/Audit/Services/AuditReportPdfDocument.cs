using Backend.Domains.Audit.DTOs.Accountants;

using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Backend.Domains.Audit.Services;

public sealed class AuditReportPdfDocument : IDocument
{
    private readonly AuditReportDto _model;
    private const int FirstPageRowLimit = 6;

    public AuditReportPdfDocument(AuditReportDto model)
    {
        _model = model;
    }

    public DocumentMetadata GetMetadata() => new()
    {
        Title = $"Bien ban kiem ke #{_model.StockTakeId}",
        Author = "Warehouse Management System",
        Subject = "Bien ban kiem ke vat tu, cong cu, san pham, hang hoa"
    };

    public void Compose(IDocumentContainer container)
    {
        var firstPageRows = _model.Details.Take(FirstPageRowLimit).ToList();
        var appendixRows = _model.Details.Skip(FirstPageRowLimit).ToList();

        container.Page(page =>
        {
            page.Size(PageSizes.A4.Landscape());
            page.Margin(12);
            page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Times New Roman"));

            page.Content()
                .Border(2)
                .BorderColor(Colors.Blue.Darken2)
                .Padding(10)
                .Element(c => ComposeMainPage(c, firstPageRows));

            page.Footer()
                .AlignCenter()
                .Text(x =>
                {
                    x.Span("Trang ");
                    x.CurrentPageNumber();
                    x.Span(" / ");
                    x.TotalPages();
                });
        });

        if (appendixRows.Any())
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(16);
                page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Times New Roman"));

                page.Content().Element(c => ComposeAppendixPage(c, appendixRows));

                page.Footer()
                    .AlignCenter()
                    .Text(x =>
                    {
                        x.Span("Trang ");
                        x.CurrentPageNumber();
                        x.Span(" / ");
                        x.TotalPages();
                    });
            });
        }
    }

    private void ComposeMainPage(IContainer container, List<AuditReportDetailDto> details)
    {
        container.Column(col =>
        {
            col.Spacing(4);

            col.Item().Element(ComposeTopHeader);

            col.Item().PaddingTop(4).AlignCenter().Text("BIÊN BẢN KIỂM KÊ VẬT TƯ, CÔNG CỤ, SẢN PHẨM, HÀNG HÓA")
                .Bold().FontSize(14);

            col.Item().PaddingTop(6).Text(BuildInspectionTimeLine());
            col.Item().Text("Ban kiểm kê gồm:").Bold();
            col.Item().Element(ComposeCommitteeLines);

            col.Item().Text(" - Đã kiểm kê kho có những mặt hàng dưới đây:");

            col.Item().Element(c => ComposeFormTable(c, details));

            col.Item().PaddingTop(6).Element(ComposeSignatureSection);
        });
    }

    private void ComposeTopHeader(IContainer container)
    {
        container.Row(row =>
        {
            

            row.RelativeItem().AlignRight().Column(col =>
            {
                col.Item().AlignRight().Text("Mẫu số 05 - VT").Bold();
                col.Item().AlignRight().Text("(Ban hành theo Thông tư số 200/2014/TT-BTC)");
                col.Item().AlignRight().Text("Ngày 22/12/2014 của Bộ Tài chính");
            });
        });
    }

    private string BuildInspectionTimeLine()
    {
        var dt = _model.CheckDate ?? _model.CompletedAt ?? _model.CreatedAt;

        return $" - Thời điểm kiểm kê: {dt:HH} giờ {dt:mm} phút, ngày {dt:dd} tháng {dt:MM} năm {dt:yyyy}";
    }

    private void ComposeCommitteeLines(IContainer container)
    {
        var members = (_model.CommitteeMembers ?? new List<AuditReportCommitteeMemberDto>())
            .Where(x => !string.IsNullOrWhiteSpace(x.FullName))
            .GroupBy(x => new
            {
                UserId = x.UserId,
                FullName = (x.FullName ?? "").Trim(),
                RoleName = (x.RoleName ?? "").Trim()
            })
            .Select(g => new
            {
                g.Key.UserId,
                g.Key.FullName,
                g.Key.RoleName
            })
            .ToList();

        container.Column(col =>
        {
            col.Spacing(1);

            if (members.Count == 0)
            {
                col.Item().Text("1. Ông/Bà: ........................................    Chức vụ: ............................");
            }
            else
            {
                foreach (var member in members.Select((x, i) => new { x, i }))
                {
                    col.Item().Text(
                        $"{member.i + 1}. Ông/Bà: {member.x.FullName}    Chức vụ: {member.x.RoleName}");
                }
            }
        });
    }

    private void ComposeFormTable(IContainer container, List<AuditReportDetailDto> details)
    {
        var totalSystemQty = details.Sum(x => x.SystemQty);
        var totalCountQty = details.Sum(x => x.CountQty);
        var totalOverQty = details.Where(x => x.Variance > 0).Sum(x => x.Variance);
        var totalShortQty = details.Where(x => x.Variance < 0).Sum(x => Math.Abs(x.Variance));

        var totalSystemAmount = details.Sum(x => x.SystemAmount);
        var totalCountAmount = details.Sum(x => x.CountAmount);
        var totalOverAmount = details.Sum(x => x.OverAmount);
        var totalShortAmount = details.Sum(x => x.ShortAmount);

        container.Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.ConstantColumn(28);    // STT
                columns.RelativeColumn(2.8f);  // Ten hang
                columns.RelativeColumn(0.9f);  // Ma so
                columns.RelativeColumn(0.8f);  // DVT
                columns.RelativeColumn(0.9f);  // So sach SL
                columns.RelativeColumn(1.0f);  // So sach TT
                columns.RelativeColumn(0.9f);  // Kiem ke SL
                columns.RelativeColumn(1.0f);  // Kiem ke TT
                columns.RelativeColumn(0.9f);  // Thua SL
                columns.RelativeColumn(1.0f);  // Thua TT
                columns.RelativeColumn(0.9f);  // Thieu SL
                columns.RelativeColumn(1.0f);  // Thieu TT
                columns.RelativeColumn(1.0f);  // Con tot
                columns.RelativeColumn(1.0f);  // Kem PC
                columns.RelativeColumn(1.0f);  // Mat PC
            });

            // Header row 1
            HeaderCell(table.Cell(), "STT", center: true);
            HeaderCell(table.Cell(), "Tên, nhãn hiệu, quy cách vật tư, dụng cụ...", center: true);
            HeaderCell(table.Cell(), "Mã số", center: true);
            HeaderCell(table.Cell(), "Đơn vị tính", center: true);
            HeaderCell(table.Cell(), "Theo sổ kế toán", center: true);
            HeaderCell(table.Cell(), "", center: true);
            HeaderCell(table.Cell(), "Theo kiểm kê", center: true);
            HeaderCell(table.Cell(), "", center: true);
            HeaderCell(table.Cell(), "Chênh lệch\nThừa", center: true);
            HeaderCell(table.Cell(), "", center: true);
            HeaderCell(table.Cell(), "Chênh lệch\nThiếu", center: true);
            HeaderCell(table.Cell(), "", center: true);
            HeaderCell(table.Cell(), "Phẩm chất", center: true);
            HeaderCell(table.Cell(), "", center: true);
            HeaderCell(table.Cell(), "", center: true);

            // Header row 2
            HeaderCell(table.Cell(), "", center: true);
            HeaderCell(table.Cell(), "", center: true);
            HeaderCell(table.Cell(), "", center: true);
            HeaderCell(table.Cell(), "", center: true);
            HeaderCell(table.Cell(), "Số lượng", center: true);
            HeaderCell(table.Cell(), "Thành tiền", center: true);
            HeaderCell(table.Cell(), "Số lượng", center: true);
            HeaderCell(table.Cell(), "Thành tiền", center: true);
            HeaderCell(table.Cell(), "Số lượng", center: true);
            HeaderCell(table.Cell(), "Thành tiền", center: true);
            HeaderCell(table.Cell(), "Số lượng", center: true);
            HeaderCell(table.Cell(), "Thành tiền", center: true);
            HeaderCell(table.Cell(), "Còn tốt\n100%", center: true);
            HeaderCell(table.Cell(), "Kém phẩm\nchất", center: true);
            HeaderCell(table.Cell(), "Mất phẩm\nchất", center: true);

            // Data rows
            var index = 1;
            foreach (var item in details)
            {
                BodyCell(table.Cell(), index.ToString(), center: true);
                BodyCell(table.Cell(), BuildItemName(item));
                BodyCell(table.Cell(), item.MaterialCode, center: true);
                BodyCell(table.Cell(), item.Unit, center: true);

                BodyCell(table.Cell(), item.SystemQty.ToString("N2"), center: true);
                BodyCell(table.Cell(), item.SystemAmount.ToString("N0"), center: true);

                BodyCell(table.Cell(), item.CountQty.ToString("N2"), center: true);
                BodyCell(table.Cell(), item.CountAmount.ToString("N0"), center: true);

                BodyCell(table.Cell(), item.Variance > 0 ? item.Variance.ToString("N2") : "", center: true);
                BodyCell(table.Cell(), item.OverAmount > 0 ? item.OverAmount.ToString("N0") : "", center: true);

                BodyCell(table.Cell(), item.Variance < 0 ? Math.Abs(item.Variance).ToString("N2") : "", center: true);
                BodyCell(table.Cell(), item.ShortAmount > 0 ? item.ShortAmount.ToString("N0") : "", center: true);

                BodyCell(table.Cell(), "x", center: true);
                BodyCell(table.Cell(), "", center: true);
                BodyCell(table.Cell(), "", center: true);

                index++;
            }

            // fill blank rows for form look
            for (var i = details.Count; i < FirstPageRowLimit; i++)
            {
                for (var c = 0; c < 15; c++)
                    BodyCell(table.Cell(), "", center: c != 1);
            }

            // Total row
            BodyCell(table.Cell(), "", center: true, bold: true);
            BodyCell(table.Cell(), "Cộng", center: true, bold: true);
            BodyCell(table.Cell(), "", center: true, bold: true);
            BodyCell(table.Cell(), "", center: true, bold: true);

            BodyCell(table.Cell(), totalSystemQty.ToString("N2"), center: true, bold: true);
            BodyCell(table.Cell(), "", center: true, bold: true);

            BodyCell(table.Cell(), totalCountQty.ToString("N2"), center: true, bold: true);
            BodyCell(table.Cell(), "", center: true, bold: true);

            BodyCell(table.Cell(), totalOverQty == 0 ? "" : totalOverQty.ToString("N2"), center: true, bold: true);
            BodyCell(table.Cell(), "", center: true, bold: true);

            BodyCell(table.Cell(), totalShortQty == 0 ? "" : totalShortQty.ToString("N2"), center: true, bold: true);
            BodyCell(table.Cell(), "", center: true, bold: true);

            BodyCell(table.Cell(), "x", center: true, bold: true);
            BodyCell(table.Cell(), "", center: true, bold: true);
            BodyCell(table.Cell(), "", center: true, bold: true);
        });
    }

    private void ComposeSignatureSection(IContainer container)
    {
        // Role mapping:
        // Admin → Giám đốc (Director)
        // Accountant → Kế toán trưởng (Chief Accountant)
        // Manager → Thủ kho (Warehouse Manager)
        // Staff → Trưởng ban kiểm kê (Inventory Team Leader)
        var adminSig = FindSignerWithData("Admin");
        var accountantSig = FindSignerWithData("Accountant");
        var managerSig = FindSignerWithData("WarehouseManager");
        var staffSig = FindSignerWithData("WarehouseStaff");

        container.Column(col =>
        {
            col.Spacing(2);
            col.Item().AlignRight().Text($"Ngày {DateTime.Now:dd} tháng {DateTime.Now:MM} năm {DateTime.Now:yyyy}");

            col.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                });

                SignatureCell(
                    table.Cell(),
                    "Giám đốc",
                    "(Ý kiến giải quyết số chênh lệch)",
                    adminSig.name,
                    adminSig.signatureData);

                SignatureCell(
                    table.Cell(),
                    "Kế toán trưởng",
                    "",
                    accountantSig.name,
                    accountantSig.signatureData);

                SignatureCell(
                    table.Cell(),
                    "Thủ kho",
                    "",
                    managerSig.name,
                    managerSig.signatureData);

                SignatureCell(
                    table.Cell(),
                    "Trưởng ban kiểm kê",
                    "",
                    staffSig.name,
                    staffSig.signatureData);
            });
        });
    }

    private void ComposeAppendixPage(IContainer container, List<AuditReportDetailDto> details)
    {
        container.Column(col =>
        {
            col.Spacing(8);

            col.Item().AlignCenter().Text("PHỤ LỤC CHI TIẾT KIỂM KÊ")
                .Bold().FontSize(15);

            col.Item().AlignCenter().Text($"Biên bản kiểm kê số: {_model.StockTakeId}")
                .SemiBold();

            col.Item().Text($"Kho: {_model.WarehouseName}");
            col.Item().Text($"Tiêu đề audit: {_model.Title}");

            col.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(30);
                    columns.RelativeColumn(1.0f);
                    columns.RelativeColumn(2.4f);
                    columns.RelativeColumn(1.0f);
                    columns.RelativeColumn(1.0f);
                    columns.RelativeColumn(1.0f);
                    columns.RelativeColumn(1.0f);
                    columns.RelativeColumn(1.0f);
                    columns.RelativeColumn(1.2f);
                    columns.RelativeColumn(1.2f);
                });

                HeaderCell(table.Cell(), "STT", center: true);
                HeaderCell(table.Cell(), "Mã VT", center: true);
                HeaderCell(table.Cell(), "Tên vật tư", center: true);
                HeaderCell(table.Cell(), "Batch", center: true);
                HeaderCell(table.Cell(), "Bin", center: true);
                HeaderCell(table.Cell(), "ĐVT", center: true);
                HeaderCell(table.Cell(), "System", center: true);
                HeaderCell(table.Cell(), "Count", center: true);
                HeaderCell(table.Cell(), "Variance", center: true);
                HeaderCell(table.Cell(), "Ghi chú", center: true);

                var stt = FirstPageRowLimit + 1;
                foreach (var item in details)
                {
                    BodyCell(table.Cell(), stt.ToString(), center: true);
                    BodyCell(table.Cell(), item.MaterialCode, center: true);
                    BodyCell(table.Cell(), item.MaterialName);
                    BodyCell(table.Cell(), item.BatchCode, center: true);
                    BodyCell(table.Cell(), item.BinCode, center: true);
                    BodyCell(table.Cell(), item.Unit, center: true);
                    BodyCell(table.Cell(), item.SystemQty.ToString("N2"), center: true);
                    BodyCell(table.Cell(), item.CountQty.ToString("N2"), center: true);
                    BodyCell(table.Cell(), item.Variance.ToString("N2"), center: true);
                    BodyCell(table.Cell(), item.Reason);

                    stt++;
                }
            });
        });
    }

    private static string BuildItemName(AuditReportDetailDto item)
    {
        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(item.MaterialName))
            parts.Add(item.MaterialName!);

        if (!string.IsNullOrWhiteSpace(item.BatchCode))
            parts.Add($"Lô: {item.BatchCode}");

        if (!string.IsNullOrWhiteSpace(item.BinCode))
            parts.Add($"Bin: {item.BinCode}");

        return string.Join(" - ", parts);
    }

    private string? FindSigner(string roleKeyword)
    {
        return _model.Signatures
            .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x.Role)
                              && x.Role.Contains(roleKeyword, StringComparison.OrdinalIgnoreCase))
            ?.FullName;
    }

    private (string? name, string? signatureData) FindSignerWithData(string roleKeyword)
    {
        var sig = _model.Signatures
            .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x.Role)
                              && x.Role.Contains(roleKeyword, StringComparison.OrdinalIgnoreCase));
        return (sig?.FullName, sig?.SignatureData);
    }

    private static void HeaderCell(IContainer container, string? text, bool center = false)
    {
        var c = container
            .Border(1)
            .Background(Colors.Grey.Lighten2)
            .MinHeight(24)
            .Padding(3);

        if (center)
            c = c.AlignCenter().AlignMiddle();

        c.Text(text ?? "").SemiBold().FontSize(8);
    }

    private static void BodyCell(IContainer container, string? text, bool center = false, bool bold = false)
    {
        var c = container
            .Border(1)
            .MinHeight(22)
            .Padding(3);

        if (center)
            c = c.AlignCenter().AlignMiddle();

        var t = c.Text(text ?? "");
        t.FontSize(8);

        if (bold)
            t.SemiBold();
    }

    private static void SignatureCell(IContainer container, string title, string subTitle, string? signerName, string? signatureData = null)
    {
        container
            .Border(1)
            .Padding(6)
            .MinHeight(110)
            .Column(col =>
            {
                col.Item().AlignCenter().Text(title).Bold().FontSize(10);

                if (!string.IsNullOrWhiteSpace(subTitle))
                    col.Item().AlignCenter().Text(subTitle).Italic().FontSize(8);

                col.Item().AlignCenter().Text("(Ký, họ tên)").Italic().FontSize(8);

                // Render signature image if available (base64 data URI)
                if (!string.IsNullOrWhiteSpace(signatureData) && signatureData.StartsWith("data:image"))
                {
                    try
                    {
                        var base64Data = signatureData.Substring(signatureData.IndexOf(",") + 1);
                        var imageBytes = Convert.FromBase64String(base64Data);
                        col.Item().AlignCenter().Height(36).Image(imageBytes, ImageScaling.FitHeight);
                    }
                    catch
                    {
                        col.Item().Height(36); // fallback if image parsing fails
                    }
                }
                else
                {
                    col.Item().Height(36);
                }

                col.Item().AlignCenter().Text(string.IsNullOrWhiteSpace(signerName) ? "" : signerName)
                    .SemiBold().FontSize(9);
            });
    }
}