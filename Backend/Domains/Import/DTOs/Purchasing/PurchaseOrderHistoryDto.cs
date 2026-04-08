namespace Backend.Domains.Import.DTOs.Purchasing
{
    public class PurchaseOrderHistoryItemDto
    {
        public long PoId { get; set; }
        public int RevisionNumber { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public decimal? TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? RejectionReason { get; set; }
        public string? RevisionNote { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PurchaseOrderHistoryResponseDto
    {
        public long RequestId { get; set; }
        public string PrStatus { get; set; } = string.Empty;
        public List<PurchaseOrderHistoryItemDto> PoChain { get; set; } = new();
    }
}
