namespace Backend.Domains.Import.DTOs.Staff
{
    // INPUT DTOs (POST)

    public class SubmitQCCheckDto
    {
        /// <summary>"Pass" | "Fail"</summary>
        public string OverallResult { get; set; } = string.Empty;

        public string? Notes { get; set; }

        public List<QCCheckDetailInputDto> Details { get; set; } = new();
    }

    public class QCCheckDetailInputDto
    {
        public long ReceiptDetailId { get; set; }

        /// <summary>"Pass" | "Fail"</summary>
        public string Result { get; set; } = string.Empty;

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
    }
}
