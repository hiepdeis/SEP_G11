namespace Backend.Domains.Import.DTOs.Staff
{
    public class PendingPurchaseOrderDto
    {
        public string Type { get; set; } = string.Empty;
        public long PurchaseOrderId { get; set; }
        public string PoCode { get; set; } = string.Empty;
        public string SupplierName { get; set; } = string.Empty;
        public DateTime ExpectedDeliveryDate { get; set; }
        public long? SupplementaryReceiptId { get; set; }
        public long? IncidentId { get; set; }
        public decimal? ReplacementQuantity { get; set; }
        public string? OriginalFailReason { get; set; }
        public string? SupplierNote { get; set; }
        public List<PendingPurchaseOrderItemDto> Items { get; set; } = new();
    }

    public class PendingPurchaseOrderItemDto
    {
        public int MaterialId { get; set; }
        public string MaterialName { get; set; } = string.Empty;
        public decimal OrderedQuantity { get; set; }
        public string Unit { get; set; } = string.Empty;
    }
}
