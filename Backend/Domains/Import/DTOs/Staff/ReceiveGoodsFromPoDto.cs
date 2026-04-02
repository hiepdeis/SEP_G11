namespace Backend.Domains.Import.DTOs.Staff
{
    public class ReceiveGoodsFromPoDto
    {
        public long PurchaseOrderId { get; set; }
        public long? SupplementaryReceiptId { get; set; }
        public string? Notes { get; set; }
        public List<ReceiveGoodsFromPoItemDto> Items { get; set; } = new();
    }

    public class ReceiveGoodsFromPoItemDto
    {
        public int MaterialId { get; set; }
        public decimal ActualQuantity { get; set; }
        public decimal PassQuantity { get; set; }
        public decimal FailQuantity { get; set; }
        public string Result { get; set; } = string.Empty;
        public string? FailReason { get; set; }
    }

    public class ReceiveGoodsFromPoResultDto
    {
        public long ReceiptId { get; set; }
        public long PurchaseOrderId { get; set; }
        public long? SupplementaryReceiptId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? PoStatus { get; set; }
        public List<QCFailedItemDto> FailedItems { get; set; } = new();
        public string NextStep { get; set; } = string.Empty;
    }
}
