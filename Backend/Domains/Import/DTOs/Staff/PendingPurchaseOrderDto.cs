namespace Backend.Domains.Import.DTOs.Staff
{
    public class PendingPurchaseOrderDto
    {
        public long PurchaseOrderId { get; set; }
        public string PoCode { get; set; } = string.Empty;
        public string SupplierName { get; set; } = string.Empty;
        public DateTime ExpectedDeliveryDate { get; set; }
        public List<PendingPurchaseOrderItemDto> Items { get; set; } = new();
    }

    public class PendingPurchaseOrderItemDto
    {
        public string MaterialName { get; set; } = string.Empty;
        public decimal OrderedQuantity { get; set; }
        public string Unit { get; set; } = string.Empty;
    }
}
