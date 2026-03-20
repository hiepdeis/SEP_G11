namespace Backend.Domains.Import.DTOs.Staff
{
    public class ReceiveGoodsFromPoDto
    {
        public long PurchaseOrderId { get; set; }
        public List<ReceiveGoodsFromPoItemDto> Items { get; set; } = new();
    }

    public class ReceiveGoodsFromPoItemDto
    {
        public int MaterialId { get; set; }
        public decimal ActualQuantity { get; set; }
    }

    public class ReceiveGoodsFromPoResultDto
    {
        public long ReceiptId { get; set; }
        public long PurchaseOrderId { get; set; }
        public string PoStatus { get; set; } = string.Empty;
        public decimal ActualQuantity { get; set; }
        public decimal OrderedQuantity { get; set; }
    }
}
