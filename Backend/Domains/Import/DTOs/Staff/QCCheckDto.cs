namespace Backend.Domains.Import.DTOs.Staff
{
    // INPUT DTOs (POST)

    public class SubmitQCCheckDto
    {
        public string? Notes { get; set; }

        public List<QCCheckDetailInputDto> Details { get; set; } = new();
    }

    public class QCCheckDetailInputDto
    {
        public int MaterialId { get; set; }

        public decimal ActualQuantity { get; set; }

        public decimal PassQuantity { get; set; }

        public decimal FailQuantity { get; set; }

        /// <summary>"Pass" | "Fail"</summary>
        public string Result { get; set; } = string.Empty;

        public string? FailReason { get; set; }
    }

    public class QCSubmitResultDto
    {
        public string Status { get; set; } = string.Empty;
        public string? PoStatus { get; set; }
        public List<QCFailedItemDto> FailedItems { get; set; } = new();
        public string? NextStep { get; set; }
    }

    public class QCFailedItemDto
    {
        public int MaterialId { get; set; }
        public decimal FailQuantity { get; set; }
        public string? FailReason { get; set; }
    }

    // OUTPUT DTOs (GET)

    public class QCCheckDto
    {
        public long QCCheckId { get; set; }
        public string QCCheckCode { get; set; } = string.Empty;

        public long ReceiptId { get; set; }
        public string? ReceiptCode { get; set; }

        public int CheckedBy { get; set; }
        public string? CheckedByName { get; set; }

        public DateTime CheckedAt { get; set; }

        /// <summary>"Pass" | "Fail"</summary>
        public string OverallResult { get; set; } = string.Empty;

        public string? Notes { get; set; }

        public List<QCCheckDetailDto> Details { get; set; } = new();
    }

    public class QCCheckDetailDto
    {
        public long DetailId { get; set; }
        public long ReceiptDetailId { get; set; }

        public int? MaterialId { get; set; }
        public string? MaterialCode { get; set; }
        public string? MaterialName { get; set; }

        /// <summary>"Pass" | "Fail"</summary>
        public string Result { get; set; } = string.Empty;

        public string? FailReason { get; set; }

        public decimal PassQuantity { get; set; }

        public decimal FailQuantity { get; set; }
    }
}
