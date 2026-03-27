using Backend.Entities;

namespace Backend.Domains.Import.DTOs.Staff
{
    // INPUT DTOs (POST)

    public class CreateIncidentReportDto
    {
        /// <summary>Mô tả tổng quát sự cố</summary>
        public string Description { get; set; } = string.Empty;

        public List<CreateIncidentReportDetailDto> Details { get; set; } = new();
    }

    public class CreateIncidentReportDetailDto
    {
        public int MaterialId { get; set; }

        /// <summary>"Quantity" | "Quality" | "Damage"</summary>
        public string IssueType { get; set; } = string.Empty;

        public string? EvidenceNote { get; set; }

        public List<string> EvidenceImages { get; set; } = new();
    }

    public class IncidentReportCreateResultDto
    {
        public long IncidentId { get; set; }
        public long ReceiptId { get; set; }
        public string Status { get; set; } = string.Empty;
        public IncidentReportCreateSummaryDto Summary { get; set; } = new();
        public string NextStep { get; set; } = string.Empty;
    }

    public class IncidentReportCreateSummaryDto
    {
        public int TotalFailItems { get; set; }
        public decimal TotalFailQuantity { get; set; }
        public string SupplierName { get; set; } = string.Empty;
    }

    // OUTPUT DTOs (GET)

    public class IncidentReportDto
    {
        public long IncidentId { get; set; }
        public string IncidentCode { get; set; } = string.Empty;

        public long ReceiptId { get; set; }
        public string? ReceiptCode { get; set; }

        public long? QCCheckId { get; set; }
        public string? QCCheckCode { get; set; }
        /// <summary>OverallResult của QCCheck liên quan: "Pass" | "Fail"</summary>
        public string? QCOverallResult { get; set; }

        public int CreatedBy { get; set; }
        public string? CreatedByName { get; set; }

        public DateTime CreatedAt { get; set; }

        public string Description { get; set; } = string.Empty;

        /// <summary>"Open" | "PendingManagerReview" | "PendingPurchasingAction" | "PendingManagerApproval" | "AwaitingSupplementaryGoods" | "Resolved"</summary>
        public string Status { get; set; } = string.Empty;

        public string? Resolution { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public int? ResolvedBy { get; set; }
        public string? ResolvedByName { get; set; }

        public List<IncidentReportDetailDto> Details { get; set; } = new();
    }

    public class IncidentReportDetailDto
    {
        public long DetailId { get; set; }
        public long ReceiptDetailId { get; set; }

        public int MaterialId { get; set; }
        public string? MaterialCode { get; set; }
        public string? MaterialName { get; set; }
        public string? MaterialUnit { get; set; }

        public decimal ExpectedQuantity { get; set; }
        public decimal ActualQuantity { get; set; }

        /// <summary>"Quantity" | "Quality" | "Damage"</summary>
        public string IssueType { get; set; } = string.Empty;

        public string? Notes { get; set; }

        public List<IncidentEvidenceImage> EvidenceImages { get; set; } = new();
    }

    public class IncidentReportSummaryDto
    {
        public long IncidentId { get; set; }
        public string IncidentCode { get; set; } = string.Empty;
        public long ReceiptId { get; set; }
        public string? ReceiptCode { get; set; }
        public string? WarehouseName { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedByName { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int TotalItems { get; set; }
    }
}
