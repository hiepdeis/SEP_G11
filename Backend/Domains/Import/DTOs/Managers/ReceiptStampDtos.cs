namespace Backend.Domains.Import.DTOs.Managers
{
    public class ManagerReceiptStampDto
    {
        public string? Notes { get; set; }
    }

    public class ManagerReceiptStampResultDto
    {
        public long ReceiptId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? StampedBy { get; set; }
        public DateTime? StampedAt { get; set; }
        public string? Notes { get; set; }
        public string NextStep { get; set; } = string.Empty;
    }

    public class ManagerReceiptSummaryDto
    {
        public long ReceiptId { get; set; }
        public string ReceiptCode { get; set; } = string.Empty;
        public string? PurchaseOrderCode { get; set; }
        public string? SupplierName { get; set; }
        public int TotalItems { get; set; }
        public decimal TotalQuantity { get; set; }
        public DateTime? PutawayCompletedAt { get; set; }
        public string? PutawayCompletedByName { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class ManagerReceiptDetailDto
    {
        public long ReceiptId { get; set; }
        public string ReceiptCode { get; set; } = string.Empty;
        public long? PurchaseOrderId { get; set; }
        public string? PurchaseOrderCode { get; set; }
        public string? SupplierName { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal TotalQuantity { get; set; }
        public DateTime? PutawayCompletedAt { get; set; }
        public string? PutawayCompletedByName { get; set; }
        public List<ManagerReceiptDetailItemDto> Items { get; set; } = new();
    }

    public class ManagerReceiptDetailItemDto
    {
        public int MaterialId { get; set; }
        public string MaterialName { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public decimal OrderedQuantity { get; set; }
        public decimal ActualQuantity { get; set; }
        public decimal PassQuantity { get; set; }
        public string? BatchCode { get; set; }
        public string? PutawayImage { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public List<ManagerReceiptBinAllocationDto> BinAllocations { get; set; } = new();
    }

    public class ManagerReceiptBinAllocationDto
    {
        public string BinCode { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
    }
}
