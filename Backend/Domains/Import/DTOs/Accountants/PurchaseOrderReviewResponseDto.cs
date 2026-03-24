using Backend.Domains.Import.DTOs.Purchasing;

namespace Backend.Domains.Import.DTOs.Accountants
{
    public class PurchaseOrderRevisionHistoryItemDto
    {
        public long PoId { get; set; }
        public int RevisionNumber { get; set; }
        public string Status { get; set; } = string.Empty;
        public string RejectedBy { get; set; } = string.Empty;
        public DateTime? RejectedAt { get; set; }
        public string? RejectionReason { get; set; }
        public decimal? TotalAmount { get; set; }
    }

    public class PurchaseOrderReviewResponseDto
    {
        public PurchaseOrderDto Order { get; set; } = new();
        public List<PriceReviewItemDto> Review { get; set; } = new();
        public List<PurchaseOrderRevisionHistoryItemDto> RevisionHistory { get; set; } = new();
        public string? RevisionNote { get; set; }
    }
}
