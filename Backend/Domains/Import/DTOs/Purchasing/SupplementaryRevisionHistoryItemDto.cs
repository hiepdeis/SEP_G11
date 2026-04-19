namespace Backend.Domains.Import.DTOs.Purchasing
{
    public class SupplementaryRevisionHistoryItemDto
    {
        public long SupplementaryReceiptId { get; set; }
        public int RevisionNumber { get; set; }
        public string Status { get; set; } = null!;
        public string? RejectedBy { get; set; }
        public DateTime? RejectedAt { get; set; }
        public string? RejectionReason { get; set; }
        public decimal TotalSupplementaryQty { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}