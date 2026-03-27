namespace Backend.Domains.Import.DTOs.Staff
{
    public class PendingPutawayReceiptDto
    {
        public long ReceiptId { get; set; }
        public string ReceiptCode { get; set; } = string.Empty;
        public string PurchaseOrderCode { get; set; } = string.Empty;
        public string SupplierName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public List<PendingPutawayItemDto> Items { get; set; } = new();
    }

    public class PendingPutawayItemDto
    {
        public int MaterialId { get; set; }
        public string MaterialCode { get; set; } = string.Empty;
        public string MaterialName { get; set; } = string.Empty;
        public decimal QuantityToPutaway { get; set; }
        public string? Note { get; set; }
    }
}
