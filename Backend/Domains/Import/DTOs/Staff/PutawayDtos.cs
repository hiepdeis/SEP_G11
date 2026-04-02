namespace Backend.Domains.Import.DTOs.Staff
{
    public class ReceiptPutawayDto
    {
        public List<ReceiptPutawayItemDto> Items { get; set; } = new();
    }

    public class ReceiptPutawayItemDto
    {
        public int MaterialId { get; set; }
        public ReceiptPutawayBatchDto Batch { get; set; } = new();
        public List<ReceiptPutawayBinAllocationDto> BinAllocations { get; set; } = new();
    }

    public class ReceiptPutawayBatchDto
    {
        public int? BatchId { get; set; }
        public string BatchCode { get; set; } = string.Empty;
        public DateTime? MfgDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string? CertificateImage { get; set; }
    }

    public class ReceiptPutawayBinAllocationDto
    {
        public int BinId { get; set; }
        public decimal Quantity { get; set; }
    }

    public class ReceiptPutawayResultDto
    {
        public long ReceiptId { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<ReceiptPutawaySummaryDto> Summary { get; set; } = new();
        public string NextStep { get; set; } = string.Empty;
    }

    public class ReceiptPutawaySummaryDto
    {
        public string MaterialName { get; set; } = string.Empty;
        public string BatchCode { get; set; } = string.Empty;
        public DateTime? ExpiryDate { get; set; }
        public decimal TotalQuantity { get; set; }
        public List<ReceiptPutawayBinSummaryDto> BinAllocations { get; set; } = new();
    }

    public class ReceiptPutawayBinSummaryDto
    {
        public string BinCode { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
    }

    public class ReceiptBatchLookupDto
    {
        public int BatchId { get; set; }
        public string BatchCode { get; set; } = string.Empty;
        public DateTime? MfgDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string MaterialName { get; set; } = string.Empty;
    }
}
